import { Schema, type Node as ProseMirrorNode } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { tableNodes } from "prosemirror-tables";

function normalizeTableAlignment(value: unknown) {
  return value === "left" || value === "center" || value === "right"
    ? value
    : null;
}

function normalizeTextAlignment(value: unknown) {
  return value === "left" || value === "center" || value === "right"
    ? value
    : null;
}

const imageNode = {
  image: {
    inline: true,
    attrs: {
      src: { default: "" },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      height: { default: null },
    },
    group: "inline",
    draggable: true,
    parseDOM: [
      {
        tag: "img[src]",
        getAttrs: (dom: HTMLElement) => ({
          src: dom.getAttribute("src"),
          title: dom.getAttribute("title"),
          alt: dom.getAttribute("alt"),
          width: dom.getAttribute("width") || dom.style.width || null,
          height: dom.getAttribute("height") || dom.style.height || null,
        }),
      },
    ],
    toDOM: (node: { attrs: Record<string, string | number | null> }) => {
      const { src, alt, title, width, height } = node.attrs;
      const style = [
        "max-width: 100%",
        width ? `width: ${typeof width === "number" ? `${width}px` : width}` : "",
        height ? `height: ${typeof height === "number" ? `${height}px` : height}` : "",
      ].filter(Boolean).join("; ");

      return ["img", { src: (src as string) || "", alt: (alt as string) || "", title: (title as string) || "", style }] as const;
    },
  },
};

const mathInlineNode = {
  math_inline: {
    inline: true,
    group: "inline",
    attrs: {
      content: { default: "" },
    },
    parseDOM: [
      {
        tag: "span[data-math-inline]",
        getAttrs: (dom: HTMLElement) => ({
          content: dom.getAttribute("data-content") || "",
        }),
      },
    ],
    toDOM: (node: ProseMirrorNode) => {
      return ["span", { "data-math-inline": "true", "data-content": node.attrs.content as string }] as const;
    },
  },
};

const mathBlockNode = {
  math_block: {
    inline: false,
    group: "block",
    attrs: {
      content: { default: "" },
    },
    parseDOM: [
      {
        tag: "div[data-math-block]",
        getAttrs: (dom: HTMLElement) => ({
          content: dom.getAttribute("data-content") || "",
        }),
      },
    ],
    toDOM: (node: ProseMirrorNode) => {
      return ["div", { "data-math-block": "true", "data-content": node.attrs.content as string }] as const;
    },
  },
};

const mermaidNode = {
  mermaid: {
    inline: false,
    group: "block",
    attrs: {
      content: { default: "" },
    },
    parseDOM: [
      {
        tag: "div[data-mermaid]",
        getAttrs: (dom: HTMLElement) => ({
          content: dom.getAttribute("data-content") || "",
        }),
      },
    ],
    toDOM: (node: ProseMirrorNode) => {
      return ["div", { "data-mermaid": "true", "data-content": node.attrs.content as string }] as const;
    },
  },
};

const nodes = addListNodes(
  basicSchema.spec.nodes,
  "paragraph block*",
  "block",
)
  // Override paragraph to support text-align
  .update("paragraph", {
    content: "inline*",
    group: "block",
    attrs: { align: { default: null } },
    parseDOM: [{
      tag: "p",
      getAttrs: (dom: HTMLElement) => ({
        align: normalizeTextAlignment(dom.style.textAlign || dom.getAttribute("align")),
      }),
    }],
    toDOM: (node: ProseMirrorNode) => {
      const align = normalizeTextAlignment(node.attrs.align);
      return align
        ? ["p", { style: `text-align:${align}` }, 0]
        : ["p", 0];
    },
  })
  // Override heading to support text-align
  .update("heading", {
    content: "inline*",
    group: "block",
    defining: true,
    attrs: {
      level: { default: 1, validate: "number" },
      align: { default: null },
    },
    parseDOM: [
      { tag: "h1", getAttrs: (dom: HTMLElement) => ({ level: 1, align: normalizeTextAlignment(dom.style.textAlign) }) },
      { tag: "h2", getAttrs: (dom: HTMLElement) => ({ level: 2, align: normalizeTextAlignment(dom.style.textAlign) }) },
      { tag: "h3", getAttrs: (dom: HTMLElement) => ({ level: 3, align: normalizeTextAlignment(dom.style.textAlign) }) },
      { tag: "h4", getAttrs: (dom: HTMLElement) => ({ level: 4, align: normalizeTextAlignment(dom.style.textAlign) }) },
      { tag: "h5", getAttrs: (dom: HTMLElement) => ({ level: 5, align: normalizeTextAlignment(dom.style.textAlign) }) },
      { tag: "h6", getAttrs: (dom: HTMLElement) => ({ level: 6, align: normalizeTextAlignment(dom.style.textAlign) }) },
    ],
    toDOM: (node: ProseMirrorNode) => {
      const tag = `h${node.attrs.level as number}`;
      const align = normalizeTextAlignment(node.attrs.align);
      return align
        ? [tag, { style: `text-align:${align}` }, 0]
        : [tag, 0];
    },
  })
  .update("image", imageNode.image)
  // Override code_block to support language attribute
  .update("code_block", {
    content: "text*",
    marks: "",
    group: "block",
    code: true,
    defining: true,
    attrs: { language: { default: null } },
    parseDOM: [{
      tag: "pre",
      preserveWhitespace: "full" as const,
      getAttrs: (dom: HTMLElement) => ({
        language: dom.getAttribute("data-language") || null,
      }),
    }],
    toDOM: (node: ProseMirrorNode) => {
      const lang = node.attrs.language as string | null;
      return lang
        ? ["pre", { "data-language": lang }, ["code", 0]]
        : ["pre", ["code", 0]];
    },
  })
  .addToEnd("math_inline", mathInlineNode.math_inline)
  .addToEnd("math_block", mathBlockNode.math_block)
  .addToEnd("mermaid", mermaidNode.mermaid)
  .append(
    tableNodes({
      tableGroup: "block",
      cellContent: "block+",
      cellAttributes: {
        align: {
          default: null,
          getFromDOM: (dom) =>
            normalizeTableAlignment(
              dom.style.textAlign || dom.getAttribute("align"),
            ),
          setDOMAttr: (value, attrs) => {
            const align = normalizeTableAlignment(value);

            if (align) {
              attrs.style = `text-align:${align}`;
            }
          },
          validate: (value) => {
            if (normalizeTableAlignment(value) !== value) {
              throw new RangeError(`Invalid table alignment: ${String(value)}`);
            }
          },
        },
      },
    }),
  );

export const editorSchema = new Schema({
  nodes,
  marks: basicSchema.spec.marks,
});
