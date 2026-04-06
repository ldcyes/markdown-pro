import MarkdownIt from "markdown-it";
import { Node as ProseMirrorNode, Schema } from "prosemirror-model";
import { editorSchema } from "./schema.js";

type MarkdownToken = ReturnType<MarkdownIt["parse"]>[number];

interface MarkdownMark {
  type: string;
}

interface MarkdownNodeJSON {
  type: string;
  attrs?: Record<string, number | string | null | number[]>;
  content?: MarkdownNodeJSON[];
  marks?: MarkdownMark[];
  text?: string;
}

interface OutlineItem {
  id: string;
  level: number;
  text: string;
}

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

// Preprocess LaTeX math syntax
function preprocessMath(content: string): string {
  // Replace $$...$$ with fenced code block for easier parsing
  let result = content.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
    return `\`\`\`math\n${formula.trim()}\n\`\`\``;
  });

  // Replace $...$ with special markers (must be done after $$)
  result = result.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
    return `MATHINLINE${formula.trim()}MATHINLINE`;
  });

  return result;
}

const ROOT_NODE: MarkdownNodeJSON = {
  type: "doc",
  content: [],
};

type TableAlignment = "left" | "center" | "right";

function createContainerNode(
  type: string,
  attrs?: Record<string, number | string | null | number[]>,
): MarkdownNodeJSON {
  return {
    type,
    ...(attrs ? { attrs } : {}),
    content: [],
  };
}

function createTextNode(
  text: string,
  marks: MarkdownMark[] = [],
): MarkdownNodeJSON | null {
  if (!text) {
    return null;
  }

  return {
    type: "text",
    text,
    ...(marks.length > 0 ? { marks: [...marks] } : {}),
  };
}

function appendNode(target: MarkdownNodeJSON, child: MarkdownNodeJSON | null) {
  if (!child) {
    return;
  }

  target.content ??= [];
  target.content.push(child);
}

function pushMark(stack: MarkdownMark[], type: string) {
  stack.push({ type });
}

function popMark(stack: MarkdownMark[], type: string) {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index]?.type === type) {
      stack.splice(index, 1);
      return;
    }
  }
}

function parseTableAlignment(token: MarkdownToken): TableAlignment | null {
  const style = token.attrGet("style");

  if (!style) {
    return null;
  }

  if (style.includes("text-align:left")) {
    return "left";
  }

  if (style.includes("text-align:center")) {
    return "center";
  }

  if (style.includes("text-align:right")) {
    return "right";
  }

  return null;
}

function appendInlineContent(
  target: MarkdownNodeJSON,
  tokens: MarkdownToken[],
) {
  const inlineNodes = parseInlineTokens(tokens);

  if (target.type === "table_cell" || target.type === "table_header") {
    const paragraph = createContainerNode("paragraph");

    for (const node of inlineNodes) {
      appendNode(paragraph, node);
    }

    appendNode(target, paragraph);
    return;
  }

  for (const node of inlineNodes) {
    appendNode(target, node);
  }
}

function ensureTableCellHasParagraph(cell: MarkdownNodeJSON) {
  if ((cell.content?.length ?? 0) > 0) {
    return;
  }

  appendNode(cell, createContainerNode("paragraph"));
}

function parseInlineTokens(tokens: MarkdownToken[]): MarkdownNodeJSON[] {
  const nodes: MarkdownNodeJSON[] = [];
  const marks: MarkdownMark[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "text": {
        // Handle LaTeX inline math
        if (token.content.includes("MATHINLINE")) {
          const parts = token.content.split(/MATHINLINE(.*?)MATHINLINE/g);
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!part) continue;

            // Odd indices are between markers (math content)
            if (i % 2 === 1) {
              nodes.push({
                type: "math_inline",
                attrs: { content: part },
              });
            } else {
              const textNode = createTextNode(part, marks);
              if (textNode) {
                nodes.push(textNode);
              }
            }
          }
          break;
        }

        const textNode = createTextNode(token.content, marks);
        if (textNode) {
          nodes.push(textNode);
        }
        break;
      }
      case "strong_open":
        pushMark(marks, "strong");
        break;
      case "strong_close":
        popMark(marks, "strong");
        break;
      case "em_open":
        pushMark(marks, "em");
        break;
      case "em_close":
        popMark(marks, "em");
        break;
      case "code_inline": {
        const textNode = createTextNode(token.content, [
          ...marks,
          { type: "code" },
        ]);
        if (textNode) {
          nodes.push(textNode);
        }
        break;
      }
      case "hardbreak":
      case "softbreak":
        nodes.push({ type: "hard_break" });
        break;
      case "image": {
        const imageNode: MarkdownNodeJSON = {
          type: "image",
          attrs: {
            src: token.attrGet("src") || "",
            alt: token.content || "",
            title: token.attrGet("title") || null,
            width: null,
            height: null,
          },
        };
        nodes.push(imageNode);
        break;
      }
      default: {
        if (token.content) {
          const textNode = createTextNode(token.content, marks);
          if (textNode) {
            nodes.push(textNode);
          }
        }
      }
    }
  }

  return nodes;
}

function normalizeDocument(root: MarkdownNodeJSON): MarkdownNodeJSON {
  if ((root.content?.length ?? 0) > 0) {
    return root;
  }

  return {
    type: "doc",
    content: [{ type: "paragraph", content: [] }],
  };
}

function markdownToDocumentJSON(source: string): MarkdownNodeJSON {
  // Preprocess LaTeX math syntax
  const preprocessed = preprocessMath(source);

  const stack: MarkdownNodeJSON[] = [
    {
      ...ROOT_NODE,
      content: [],
    },
  ];

  for (const token of markdown.parse(preprocessed, {})) {
    const current = stack[stack.length - 1];

    switch (token.type) {
      case "heading_open":
        stack.push(
          createContainerNode("heading", {
            level: Number(token.tag.slice(1)),
          }),
        );
        break;
      case "paragraph_open":
        stack.push(createContainerNode("paragraph"));
        break;
      case "bullet_list_open":
        stack.push(createContainerNode("bullet_list"));
        break;
      case "ordered_list_open":
        stack.push(
          createContainerNode("ordered_list", {
            order: Number(token.attrGet("start") ?? "1"),
          }),
        );
        break;
      case "table_open":
        stack.push(createContainerNode("table"));
        break;
      case "tr_open":
        stack.push(createContainerNode("table_row"));
        break;
      case "th_open":
        stack.push(
          createContainerNode("table_header", {
            align: parseTableAlignment(token),
          }),
        );
        break;
      case "td_open":
        stack.push(
          createContainerNode("table_cell", {
            align: parseTableAlignment(token),
          }),
        );
        break;
      case "list_item_open":
        stack.push(createContainerNode("list_item"));
        break;
      case "heading_close":
      case "paragraph_close":
      case "bullet_list_close":
      case "ordered_list_close":
      case "table_close":
      case "tr_close":
      case "list_item_close": {
        const node = stack.pop();
        if (node) {
          appendNode(stack[stack.length - 1], node);
        }
        break;
      }
      case "th_close":
      case "td_close": {
        const node = stack.pop();
        if (node) {
          ensureTableCellHasParagraph(node);
          appendNode(stack[stack.length - 1], node);
        }
        break;
      }
      case "inline":
        appendInlineContent(current, token.children ?? []);
        break;
      case "fence": {
        // Check for mermaid diagram
        if (token.info === "mermaid") {
          appendNode(current, {
            type: "mermaid",
            attrs: { content: token.content || "" },
          });
          break;
        }

        // Check for math block
        if (token.info === "math") {
          appendNode(current, {
            type: "math_block",
            attrs: { content: token.content.trim() },
          });
          break;
        }

        appendNode(current, {
          type: "code_block",
          content: token.content
            ? [{ type: "text", text: token.content }]
            : [],
        });
        break;
      }
      case "code_block":
        appendNode(current, {
          type: "code_block",
          content: token.content
            ? [{ type: "text", text: token.content }]
            : [],
        });
        break;
      default:
        break;
    }
  }

  return normalizeDocument(stack[0] ?? ROOT_NODE);
}

function wrapMarks(text: string, marks: readonly MarkdownMark[] = []): string {
  return marks.reduce((current, mark) => {
    switch (mark.type) {
      case "code":
        return `\`${current}\``;
      case "strong":
        return `**${current}**`;
      case "em":
        return `*${current}*`;
      default:
        return current;
    }
  }, text);
}

function serializeInline(node: ProseMirrorNode): string {
  const parts: string[] = [];

  node.forEach((child) => {
    if (child.type.name === "text") {
      parts.push(
        wrapMarks(
          child.text ?? "",
          child.marks.map((mark) => ({ type: mark.type.name })),
        ),
      );
      return;
    }

    if (child.type.name === "hard_break") {
      parts.push("\\\n");
      return;
    }

    if (child.type.name === "image") {
      const { src, alt, title } = child.attrs;
      const titlePart = title ? ` "${title}"` : "";
      parts.push(`![${alt || ""}](${src}${titlePart})`);
      return;
    }

    if (child.type.name === "math_inline") {
      parts.push(`$${child.attrs.content as string}$`);
    }
  });

  return parts.join("");
}

function escapeTableCell(text: string): string {
  return text.trim().replace(/\|/g, "\\|");
}

function serializeTableCellBlock(node: ProseMirrorNode): string {
  switch (node.type.name) {
    case "paragraph":
    case "heading":
      return serializeInline(node);
    case "code_block":
      return `\`${node.textContent.trim()}\``;
    default:
      return node.textContent;
  }
}

function serializeTableCell(node: ProseMirrorNode): string {
  return escapeTableCell(
    node.content.content
      .map((child) => serializeTableCellBlock(child).replace(/\\\n/g, "<br>"))
      .join("<br>"),
  );
}

function serializeOptionalTableCell(node: ProseMirrorNode | null): string {
  return node ? serializeTableCell(node) : "";
}

function getTableColumnAlignment(
  rows: readonly ProseMirrorNode[],
  columnIndex: number,
): TableAlignment | null {
  for (const row of rows) {
    const cell = row.maybeChild(columnIndex);
    const align = cell?.attrs.align;

    if (align === "left" || align === "center" || align === "right") {
      return align;
    }
  }

  return null;
}

function serializeTable(node: ProseMirrorNode, depth: number): string {
  const indent = "  ".repeat(depth);
  const rows = node.content.content;

  if (rows.length === 0) {
    return "";
  }

  const columnCount = Math.max(
    ...rows.map((row) => row.childCount),
    0,
  );
  const headerRow = rows[0];
  const alignments = Array.from({ length: columnCount }, (_, index) =>
    getTableColumnAlignment(rows, index),
  );
  const separatorRow = alignments.map((align) => {
    switch (align) {
      case "left":
        return ":---";
      case "center":
        return ":---:";
      case "right":
        return "---:";
      default:
        return "---";
    }
  });
  const lines = [
    `| ${Array.from({ length: columnCount }, (_, index) => serializeOptionalTableCell(headerRow.maybeChild(index))).join(" | ")} |`,
    `| ${separatorRow.join(" | ")} |`,
    ...rows.slice(1).map((row) =>
      `| ${Array.from({ length: columnCount }, (_, index) => serializeOptionalTableCell(row.maybeChild(index))).join(" | ")} |`,
    ),
  ];

  return lines.map((line) => `${indent}${line}`).join("\n");
}

function serializeListItem(
  node: ProseMirrorNode,
  depth: number,
  marker: string,
): string {
  const indent = "  ".repeat(depth);
  const blocks = node.content.content;

  if (blocks.length === 0) {
    return `${indent}${marker}`;
  }

  const lines: string[] = [];

  blocks.forEach((child, index) => {
    if (index === 0 && child.type.name === "paragraph") {
      lines.push(`${indent}${marker}${serializeInline(child)}`);
      return;
    }

    lines.push(serializeBlock(child, depth + 1));
  });

  return lines.join("\n");
}

function serializeList(node: ProseMirrorNode, depth: number): string {
  const start = Number(node.attrs.order ?? 1);

  return node.content.content
    .map((child, index) => {
      const marker =
        node.type.name === "ordered_list" ? `${start + index}. ` : "- ";

      return serializeListItem(child, depth, marker);
    })
    .join("\n");
}

function serializeCodeBlock(node: ProseMirrorNode, depth: number): string {
  const indent = "  ".repeat(depth);
  const content = node.textContent;

  return `${indent}\`\`\`\n${content}\`\`\``;
}

function serializeBlock(node: ProseMirrorNode, depth = 0): string {
  const indent = "  ".repeat(depth);

  switch (node.type.name) {
    case "heading":
      return `${indent}${"#".repeat(Number(node.attrs.level))} ${serializeInline(node)}`;
    case "paragraph":
      return `${indent}${serializeInline(node)}`;
    case "bullet_list":
    case "ordered_list":
      return serializeList(node, depth);
    case "code_block":
      return serializeCodeBlock(node, depth);
    case "table":
      return serializeTable(node, depth);
    case "math_block":
      return `${indent}$$${node.attrs.content as string}$$`;
    case "mermaid":
      return `${indent}\`\`\`mermaid\n${node.attrs.content as string}\n\`\`\``;
    default:
      return `${indent}${node.textContent}`;
  }
}

function serializeDocument(doc: ProseMirrorNode): string {
  return doc.content.content
    .map((child) => serializeBlock(child))
    .join("\n\n")
    .trim();
}

export function markdownToProseMirror(
  source: string,
  schema: Schema = editorSchema,
): ProseMirrorNode {
  return schema.nodeFromJSON(markdownToDocumentJSON(source));
}

export function proseMirrorToMarkdown(doc: ProseMirrorNode): string {
  return serializeDocument(doc);
}

export function extractOutline(doc: ProseMirrorNode): OutlineItem[] {
  const outline: OutlineItem[] = [];
  let headingIndex = 0;

  doc.descendants((node) => {
    if (node.type.name === "heading") {
      outline.push({
        id: `heading-${headingIndex}`,
        level: Number(node.attrs.level),
        text: node.textContent,
      });
      headingIndex += 1;
    }

    return true;
  });

  return outline;
}
