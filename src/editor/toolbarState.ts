import { EditorState, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { isInTable } from "prosemirror-tables";
import { editorSchema } from "./schema.js";

// Define Command type locally
type Command = (
  state: EditorState,
  dispatch?: EditorView["dispatch"],
  view?: EditorView,
) => boolean;

export interface ActiveToolbarState {
  bold: boolean;
  bulletList: boolean;
  cellAlign: string | null;
  orderedList: boolean;
  codeBlock: boolean;
  headingLevel: number | null;
  italic: boolean;
  table: boolean;
  textAlign: string | null;
}

function matchesNodeAttributes(
  nodeAttrs: Record<string, unknown>,
  expectedAttrs?: Record<string, unknown>,
) {
  if (!expectedAttrs) {
    return true;
  }

  return Object.entries(expectedAttrs).every(
    ([key, value]) => nodeAttrs[key] === value,
  );
}

export function isMarkActive(
  state: EditorState,
  markName: "strong" | "em",
): boolean {
  const markType = editorSchema.marks[markName];
  const { from, to, empty, $from } = state.selection;

  if (empty) {
    return Boolean(markType.isInSet(state.storedMarks ?? $from.marks()));
  }

  return state.doc.rangeHasMark(from, to, markType);
}

export function isNodeActive(
  state: EditorState,
  nodeName: "bullet_list" | "ordered_list" | "code_block" | "heading" | "table",
  expectedAttrs?: Record<string, unknown>,
): boolean {
  const nodeType = editorSchema.nodes[nodeName];
  const { from, to, $from } = state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);

    if (node.type === nodeType && matchesNodeAttributes(node.attrs, expectedAttrs)) {
      return true;
    }
  }

  let active = false;

  state.doc.nodesBetween(from, to, (node) => {
    if (node.type === nodeType && matchesNodeAttributes(node.attrs, expectedAttrs)) {
      active = true;
      return false;
    }

    return !active;
  });

  return active;
}

function createTableCell(typeName: "table_header" | "table_cell") {
  const paragraph = editorSchema.nodes.paragraph.createAndFill();

  if (!paragraph) {
    throw new Error("Failed to create default table paragraph");
  }

  const cell = editorSchema.nodes[typeName].createAndFill(null, [paragraph]);

  if (!cell) {
    throw new Error("Failed to create default table cell");
  }

  return cell;
}

function createTableNode(rows: number, columns: number) {
  const rowNodes = Array.from({ length: rows }, (_, rowIndex) => {
    const cellTypeName = rowIndex === 0 ? "table_header" : "table_cell";
    const cells = Array.from({ length: columns }, () => createTableCell(cellTypeName));
    const row = editorSchema.nodes.table_row.createAndFill(null, cells);

    if (!row) {
      throw new Error("Failed to create default table row");
    }

    return row;
  });
  const table = editorSchema.nodes.table.createAndFill(null, rowNodes);

  if (!table) {
    throw new Error("Failed to create default table");
  }

  return table;
}

export const insertTable: Command = (state, dispatch) => {
  const table = createTableNode(3, 3);

  if (!table) {
    return false;
  }

  try {
    let transaction = state.tr.replaceSelectionWith(table, false);

    transaction = transaction.setSelection(
      TextSelection.near(
        transaction.doc.resolve(
          Math.min(state.selection.from + 5, transaction.doc.content.size),
        ),
      ),
    );

    if (dispatch) {
      dispatch(transaction.scrollIntoView());
    }

    return true;
  } catch {
    return false;
  }
};

export function getActiveToolbarState(state: EditorState): ActiveToolbarState {
  let headingLevel: number | null = null;

  for (let level = 1; level <= 4; level += 1) {
    if (isNodeActive(state, "heading", { level })) {
      headingLevel = level;
      break;
    }
  }

  // Detect text alignment from current block
  let textAlign: string | null = null;
  const { $from: $alignFrom } = state.selection;
  for (let depth = $alignFrom.depth; depth > 0; depth -= 1) {
    const node = $alignFrom.node(depth);
    if (node.type.name === "paragraph" || node.type.name === "heading") {
      textAlign = (node.attrs.align as string) || null;
      break;
    }
  }

  // Detect table cell alignment
  let cellAlign: string | null = null;
  if (isInTable(state)) {
    for (let depth = $alignFrom.depth; depth > 0; depth -= 1) {
      const node = $alignFrom.node(depth);
      if (node.type.name === "table_cell" || node.type.name === "table_header") {
        cellAlign = (node.attrs.align as string) || null;
        break;
      }
    }
  }

  return {
    bold: isMarkActive(state, "strong"),
    bulletList: isNodeActive(state, "bullet_list"),
    cellAlign,
    orderedList: isNodeActive(state, "ordered_list"),
    codeBlock: isNodeActive(state, "code_block"),
    headingLevel,
    italic: isMarkActive(state, "em"),
    table: isInTable(state),
    textAlign,
  };
}
