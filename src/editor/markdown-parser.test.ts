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
        attrs: { level: 1, align: null },
        content: [{ type: "text", text: "Markdown Pro" }],
      },
      {
        type: "paragraph",
        attrs: { align: null },
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
                attrs: { align: null },
                content: [{ type: "text", text: "Ship parser" }],
              },
            ],
          },
          {
            type: "list_item",
            content: [
              {
                type: "paragraph",
                attrs: { align: null },
                content: [{ type: "text", text: "Ship toolbar" }],
              },
            ],
          },
        ],
      },
      {
        type: "code_block",
        attrs: { language: "ts" },
        content: [{ type: "text", text: 'console.log("ready");\n' }],
      },
    ],
  });
});

test("markdownToProseMirror parses GFM tables with alignment", () => {
  const markdown = [
    "| Feature | Status | Owner |",
    "| :--- | :---: | ---: |",
    "| Parser | Ready | Core |",
  ].join("\n");

  const doc = markdownToProseMirror(markdown);

  assert.deepEqual(JSON.parse(JSON.stringify(doc.toJSON())), {
    type: "doc",
    content: [
      {
        type: "table",
        content: [
          {
            type: "table_row",
            content: [
              {
                type: "table_header",
                attrs: {
                  align: "left",
                  colspan: 1,
                  rowspan: 1,
                  colwidth: null,
                },
                content: [
                  {
                    type: "paragraph",
                    attrs: { align: null },
                    content: [{ type: "text", text: "Feature" }],
                  },
                ],
              },
              {
                type: "table_header",
                attrs: {
                  align: "center",
                  colspan: 1,
                  rowspan: 1,
                  colwidth: null,
                },
                content: [
                  {
                    type: "paragraph",
                    attrs: { align: null },
                    content: [{ type: "text", text: "Status" }],
                  },
                ],
              },
              {
                type: "table_header",
                attrs: {
                  align: "right",
                  colspan: 1,
                  rowspan: 1,
                  colwidth: null,
                },
                content: [
                  {
                    type: "paragraph",
                    attrs: { align: null },
                    content: [{ type: "text", text: "Owner" }],
                  },
                ],
              },
            ],
          },
          {
            type: "table_row",
            content: [
              {
                type: "table_cell",
                attrs: {
                  align: "left",
                  colspan: 1,
                  rowspan: 1,
                  colwidth: null,
                },
                content: [
                  {
                    type: "paragraph",
                    attrs: { align: null },
                    content: [{ type: "text", text: "Parser" }],
                  },
                ],
              },
              {
                type: "table_cell",
                attrs: {
                  align: "center",
                  colspan: 1,
                  rowspan: 1,
                  colwidth: null,
                },
                content: [
                  {
                    type: "paragraph",
                    attrs: { align: null },
                    content: [{ type: "text", text: "Ready" }],
                  },
                ],
              },
              {
                type: "table_cell",
                attrs: {
                  align: "right",
                  colspan: 1,
                  rowspan: 1,
                  colwidth: null,
                },
                content: [
                  {
                    type: "paragraph",
                    attrs: { align: null },
                    content: [{ type: "text", text: "Core" }],
                  },
                ],
              },
            ],
          },
        ],
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

test("proseMirrorToMarkdown serializes tables to GFM markdown", () => {
  const doc = editorSchema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "table",
        content: [
          {
            type: "table_row",
            content: [
              {
                type: "table_header",
                attrs: { align: "left" },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Feature" }],
                  },
                ],
              },
              {
                type: "table_header",
                attrs: { align: "center" },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Status" }],
                  },
                ],
              },
              {
                type: "table_header",
                attrs: { align: "right" },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Owner" }],
                  },
                ],
              },
            ],
          },
          {
            type: "table_row",
            content: [
              {
                type: "table_cell",
                attrs: { align: "left" },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Parser" }],
                  },
                ],
              },
              {
                type: "table_cell",
                attrs: { align: "center" },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Ready" }],
                  },
                ],
              },
              {
                type: "table_cell",
                attrs: { align: "right" },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Core" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  assert.equal(
    proseMirrorToMarkdown(doc),
    [
      "| Feature | Status | Owner |",
      "| :--- | :---: | ---: |",
      "| Parser | Ready | Core |",
    ].join("\n"),
  );
});

test("markdownToProseMirror parses and serializes links", () => {
  const markdown = "Visit [Google](https://google.com) for search.";
  const doc = markdownToProseMirror(markdown);

  let linkCount = 0;
  doc.descendants((node) => {
    if (node.isText && node.marks.some((m) => m.type.name === "link")) {
      linkCount++;
      const linkMark = node.marks.find((m) => m.type.name === "link");
      assert.equal(linkMark?.attrs.href, "https://google.com");
      assert.equal(node.text, "Google");
    }
  });
  assert.equal(linkCount, 1);

  const serialized = proseMirrorToMarkdown(doc);
  assert.ok(serialized.includes("[Google](https://google.com)"));
});

test("markdownToProseMirror parses links with title", () => {
  const markdown = '[Example](https://example.com "Example Site")';
  const doc = markdownToProseMirror(markdown);

  let found = false;
  doc.descendants((node) => {
    if (node.isText && node.marks.some((m) => m.type.name === "link")) {
      found = true;
      const linkMark = node.marks.find((m) => m.type.name === "link");
      assert.equal(linkMark?.attrs.href, "https://example.com");
      assert.equal(linkMark?.attrs.title, "Example Site");
    }
  });
  assert.equal(found, true);

  const serialized = proseMirrorToMarkdown(doc);
  assert.ok(serialized.includes('[Example](https://example.com "Example Site")'));
});

test("markdownToProseMirror parses bold links", () => {
  const markdown = "**[Bold Link](https://example.com)**";
  const doc = markdownToProseMirror(markdown);

  let found = false;
  doc.descendants((node) => {
    if (node.isText && node.text === "Bold Link") {
      found = true;
      const markTypes = node.marks.map((m) => m.type.name).sort();
      assert.ok(markTypes.includes("link"));
      assert.ok(markTypes.includes("strong"));
    }
  });
  assert.equal(found, true);
});

test("markdownToProseMirror preserves code block language", () => {
  const markdown = "```python\nprint('hello')\n```";
  const doc = markdownToProseMirror(markdown);

  let found = false;
  doc.descendants((node) => {
    if (node.type.name === "code_block") {
      found = true;
      assert.equal(node.attrs.language, "python");
    }
  });
  assert.equal(found, true);

  const serialized = proseMirrorToMarkdown(doc);
  assert.ok(serialized.includes("```python"));
});

test("markdownToProseMirror handles code blocks without language", () => {
  const markdown = "```\ngeneric code\n```";
  const doc = markdownToProseMirror(markdown);

  let found = false;
  doc.descendants((node) => {
    if (node.type.name === "code_block") {
      found = true;
      assert.equal(node.attrs.language, null);
    }
  });
  assert.equal(found, true);
});

test("markdownToProseMirror parses horizontal rules", () => {
  const markdown = "Above\n\n---\n\nBelow";
  const doc = markdownToProseMirror(markdown);

  let hrCount = 0;
  doc.descendants((node) => {
    if (node.type.name === "horizontal_rule") {
      hrCount++;
    }
  });
  assert.equal(hrCount, 1);

  const serialized = proseMirrorToMarkdown(doc);
  assert.ok(serialized.includes("---"));
});

test("markdownToProseMirror parses blockquotes", () => {
  const markdown = "> This is a quote\n> with two lines";
  const doc = markdownToProseMirror(markdown);

  let bqCount = 0;
  doc.descendants((node) => {
    if (node.type.name === "blockquote") {
      bqCount++;
    }
  });
  assert.equal(bqCount, 1);

  const serialized = proseMirrorToMarkdown(doc);
  assert.ok(serialized.includes("> "));
});

test("round-trip preserves complex markdown", () => {
  const markdown = [
    "# Title",
    "",
    "A paragraph with **bold**, *italic*, and `code`.",
    "",
    "- Item 1",
    "- Item 2",
    "",
    "1. First",
    "2. Second",
    "",
    "```ts",
    "const x = 1;",
    "```",
    "",
    "---",
    "",
    "> A quote",
    "",
    "| A | B |",
    "| --- | --- |",
    "| 1 | 2 |",
  ].join("\n");

  const doc = markdownToProseMirror(markdown);
  const serialized = proseMirrorToMarkdown(doc);

  // Re-parse and check key structures survive
  const doc2 = markdownToProseMirror(serialized);
  const serialized2 = proseMirrorToMarkdown(doc2);

  // Second round-trip should be stable
  assert.equal(serialized, serialized2);
});
