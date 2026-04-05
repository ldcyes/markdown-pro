import { EditorState } from "prosemirror-state";
import { editorSchema } from "./schema.js";

export interface ActiveToolbarState {
  bold: boolean;
  bulletList: boolean;
  codeBlock: boolean;
  headingLevel: number | null;
  italic: boolean;
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
  nodeName: "bullet_list" | "code_block" | "heading",
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

export function getActiveToolbarState(state: EditorState): ActiveToolbarState {
  let headingLevel: number | null = null;

  for (let level = 1; level <= 3; level += 1) {
    if (isNodeActive(state, "heading", { level })) {
      headingLevel = level;
      break;
    }
  }

  return {
    bold: isMarkActive(state, "strong"),
    bulletList: isNodeActive(state, "bullet_list"),
    codeBlock: isNodeActive(state, "code_block"),
    headingLevel,
    italic: isMarkActive(state, "em"),
  };
}
