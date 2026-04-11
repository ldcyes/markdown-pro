import assert from "node:assert/strict";
import test from "node:test";
import {
  addColumnAfter,
  addRowAfter,
  deleteColumn,
  deleteRow,
} from "prosemirror-tables";
import { TextSelection } from "prosemirror-state";
import { EditorState } from "prosemirror-state";
import { editorSchema } from "./schema.js";
import { getActiveToolbarState, insertTable } from "./toolbarState.js";

function applyCommand(
  state: EditorState,
  command: (
    state: EditorState,
    dispatch?: (transaction: EditorState["tr"]) => void,
  ) => boolean,
) {
  let nextState = state;

  const handled = command(state, (transaction) => {
    nextState = state.apply(transaction);
  });

  assert.equal(handled, true);
  return nextState;
}

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
  assert.equal(getActiveToolbarState(state).paragraph, false);
});

test("getActiveToolbarState reports paragraph context for body text", () => {
  const doc = editorSchema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { align: "center" },
        content: [{ type: "text", text: "Body copy" }],
      },
    ],
  });

  const state = EditorState.create({
    schema: editorSchema,
    doc,
    selection: TextSelection.create(doc, 2),
  });

  const toolbarState = getActiveToolbarState(state);
  assert.equal(toolbarState.paragraph, true);
  assert.equal(toolbarState.headingLevel, null);
  assert.equal(toolbarState.textAlign, "center");
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

test("insertTable creates a 3x3 table and table commands update it", () => {
  const doc = editorSchema.nodeFromJSON({
    type: "doc",
    content: [{ type: "paragraph", content: [] }],
  });

  let state = EditorState.create({
    schema: editorSchema,
    doc,
    selection: TextSelection.create(doc, 1),
  });

  state = applyCommand(state, insertTable);

  assert.equal(getActiveToolbarState(state).table, true);
  assert.equal(state.doc.firstChild?.type.name, "table");
  assert.equal(state.doc.firstChild?.childCount, 3);
  assert.equal(state.doc.firstChild?.firstChild?.childCount, 3);

  state = applyCommand(state, addRowAfter);
  state = applyCommand(state, addColumnAfter);

  assert.equal(state.doc.firstChild?.childCount, 4);
  assert.equal(state.doc.firstChild?.firstChild?.childCount, 4);

  state = applyCommand(state, deleteRow);
  state = applyCommand(state, deleteColumn);

  assert.equal(state.doc.firstChild?.childCount, 3);
  assert.equal(state.doc.firstChild?.firstChild?.childCount, 3);
});
