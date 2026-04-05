import MarkdownIt from "markdown-it";
import { Node as ProseMirrorNode, Schema } from "prosemirror-model";
import { editorSchema } from "./schema.js";

type MarkdownToken = ReturnType<MarkdownIt["parse"]>[number];

interface MarkdownMark {
  type: string;
}

interface MarkdownNodeJSON {
  type: string;
  attrs?: Record<string, number | string>;
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

const ROOT_NODE: MarkdownNodeJSON = {
  type: "doc",
  content: [],
};

function createContainerNode(
  type: string,
  attrs?: Record<string, number | string>,
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

function parseInlineTokens(tokens: MarkdownToken[]): MarkdownNodeJSON[] {
  const nodes: MarkdownNodeJSON[] = [];
  const marks: MarkdownMark[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "text": {
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
        const textNode = createTextNode(token.content, marks);
        if (textNode) {
          nodes.push(textNode);
        }
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
  const stack: MarkdownNodeJSON[] = [
    {
      ...ROOT_NODE,
      content: [],
    },
  ];

  for (const token of markdown.parse(source, {})) {
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
      case "list_item_open":
        stack.push(createContainerNode("list_item"));
        break;
      case "heading_close":
      case "paragraph_close":
      case "bullet_list_close":
      case "ordered_list_close":
      case "list_item_close": {
        const node = stack.pop();
        if (node) {
          appendNode(stack[stack.length - 1], node);
        }
        break;
      }
      case "inline":
        for (const child of parseInlineTokens(token.children ?? [])) {
          appendNode(current, child);
        }
        break;
      case "fence":
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
    }
  });

  return parts.join("");
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
