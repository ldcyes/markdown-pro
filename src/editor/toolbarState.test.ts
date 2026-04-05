import assert from "node:assert/strict";
import test from "node:test";
import { TextSelection } from "prosemirror-state";
import { EditorState } from "prosemirror-state";
import { editorSchema } from "./schema.js";
import { getActiveToolbarState } from "./toolbarState.js";

test("getActiveToolbarState detects active bold and italic marks", () => {
  const doc = editorSchema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Bold",
            marks: [{ type: "strong" }],
          },
          { type: "text", text: " and " },
          {
            type: "text",
            text: "italic",
            marks: [{ type: "em" }],
          },
        ],
      },
    ],
  });

  const boldState = EditorState.create({
    schema: editorSchema,
    doc,
    selection: TextSelection.create(doc, 2),
  });
  const italicState = EditorState.create({
    schema: editorSchema,
    doc,
    selection: TextSelection.create(doc, 11),
  });

  assert.equal(getActiveToolbarState(boldState).bold, true);
  assert.equal(getActiveToolbarState(boldState).italic, false);
  assert.equal(getActiveToolbarState(italicState).bold, false);
  assert.equal(getActiveToolbarState(italicState).italic, true);
});

test("getActiveToolbarState reports the current heading level", () => {
  const doc = editorSchema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Outline" }],
      },
    ],
  });

  const state = EditorState.create({
    schema: editorSchema,
    doc,
    selection: TextSelection.create(doc, 2),
  });

  assert.equal(getActiveToolbarState(state).headingLevel, 2);
});

test("getActiveToolbarState reports list and code block context", () => {
  const listDoc = editorSchema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "bullet_list",
        content: [
          {
            type: "list_item",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Ship it" }],
              },
            ],
          },
        ],
      },
    ],
  });
  const codeDoc = editorSchema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "code_block",
        content: [{ type: "text", text: "const ready = true;" }],
      },
    ],
  });

  const listState = EditorState.create({
    schema: editorSchema,
    doc: listDoc,
    selection: TextSelection.create(listDoc, 3),
  });
  const codeState = EditorState.create({
    schema: editorSchema,
    doc: codeDoc,
    selection: TextSelection.create(codeDoc, 2),
  });

  assert.equal(getActiveToolbarState(listState).bulletList, true);
  assert.equal(getActiveToolbarState(codeState).codeBlock, true);
});
