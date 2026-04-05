import assert from "node:assert/strict";
import test from "node:test";
import { editorSchema } from "./schema.js";
import {
  markdownToProseMirror,
  proseMirrorToMarkdown,
} from "./markdown-parser.js";

test("markdownToProseMirror parses headings, marks, lists, and code blocks", () => {
  const markdown = [
    "# Markdown Pro",
    "",
    "Paragraph with **bold** and *italic* text.",
    "",
    "- Ship parser",
    "- Ship toolbar",
    "",
    "```ts",
    'console.log("ready");',
    "```",
  ].join("\n");

  const doc = markdownToProseMirror(markdown);

  assert.deepEqual(JSON.parse(JSON.stringify(doc.toJSON())), {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Markdown Pro" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Paragraph with " },
          {
            type: "text",
            text: "bold",
            marks: [{ type: "strong" }],
          },
          { type: "text", text: " and " },
          {
            type: "text",
            text: "italic",
            marks: [{ type: "em" }],
          },
          { type: "text", text: " text." },
        ],
      },
      {
        type: "bullet_list",
        content: [
          {
            type: "list_item",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Ship parser" }],
              },
            ],
          },
          {
            type: "list_item",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Ship toolbar" }],
              },
            ],
          },
        ],
      },
      {
        type: "code_block",
        content: [{ type: "text", text: 'console.log("ready");\n' }],
      },
    ],
  });
});

test("proseMirrorToMarkdown serializes the supported schema back to markdown", () => {
  const doc = editorSchema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Checklist" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Keep " },
          {
            type: "text",
            text: "writing",
            marks: [{ type: "strong" }],
          },
          { type: "text", text: " and " },
          {
            type: "text",
            text: "shipping",
            marks: [{ type: "em" }],
          },
          { type: "text", text: "." },
        ],
      },
      {
        type: "ordered_list",
        attrs: { order: 3 },
        content: [
          {
            type: "list_item",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Parser" }],
              },
            ],
          },
          {
            type: "list_item",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Toolbar" }],
              },
            ],
          },
        ],
      },
    ],
  });

  assert.equal(
    proseMirrorToMarkdown(doc),
    ["## Checklist", "", "Keep **writing** and *shipping*.", "", "3. Parser", "4. Toolbar"].join("\n"),
  );
});
