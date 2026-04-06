import assert from "node:assert/strict";
import test from "node:test";
import { editorSchema } from "./schema.js";

test("editorSchema accepts valid table nodes", () => {
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
                attrs: {
                  align: "left",
                },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Feature" }],
                  },
                ],
              },
              {
                type: "table_header",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Status" }],
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
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Tables" }],
                  },
                ],
              },
              {
                type: "table_cell",
                attrs: {
                  align: "center",
                },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Ready" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

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
                    content: [{ type: "text", text: "Feature" }],
                  },
                ],
              },
              {
                type: "table_header",
                attrs: {
                  align: null,
                  colspan: 1,
                  rowspan: 1,
                  colwidth: null,
                },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Status" }],
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
                  align: null,
                  colspan: 1,
                  rowspan: 1,
                  colwidth: null,
                },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Tables" }],
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
                    content: [{ type: "text", text: "Ready" }],
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

test("editorSchema rejects invalid table structure", () => {
  let error: unknown;

  try {
    editorSchema
      .nodeFromJSON({
        type: "doc",
        content: [
          {
            type: "table",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Invalid" }],
              },
            ],
          },
        ],
      })
      .check();
  } catch (caughtError) {
    error = caughtError;
  }

  assert.ok(error instanceof Error);
});
