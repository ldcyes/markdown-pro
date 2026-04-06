import { Schema, type Node as ProseMirrorNode } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { tableNodes } from "prosemirror-tables";

function normalizeTableAlignment(value: unknown) {
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
          width: dom.getAttribute("width"),
          height: dom.getAttribute("height"),
        }),
      },
    ],
    toDOM: (node: { attrs: Record<string, string | number | null> }) => {
      const { src, alt, title, width, height } = node.attrs;
      const style =
        width || height
          ? `width: ${width || "auto"}; height: ${height || "auto"};`
          : "";

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
  .update("image", imageNode.image)
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
