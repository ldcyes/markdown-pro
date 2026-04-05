import { useEffect, useRef } from "react";
import { DOMParser as ProseMirrorDOMParser } from "prosemirror-model";
import {
  baseKeymap,
  setBlockType,
  toggleMark,
} from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import {
  liftListItem,
  sinkListItem,
  splitListItem,
  wrapInList,
} from "prosemirror-schema-list";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { editorSchema } from "./schema";

const INITIAL_CONTENT = `
  <h1>Markdown Pro</h1>
  <p>
    A Tauri-ready editor scaffold powered by React, TypeScript, and
    ProseMirror.
  </p>
  <ul>
    <li><p><strong>Mod+B</strong> toggles bold text.</p></li>
    <li><p><em>Mod+I</em> toggles italic text.</p></li>
    <li><p>Shift+Ctrl+8 creates a bullet list.</p></li>
  </ul>
  <pre><code>const stack = ["tauri", "react", "prosemirror"];</code></pre>
`;

function createInitialDocument() {
  const element = document.createElement("div");
  element.innerHTML = INITIAL_CONTENT.trim();

  return ProseMirrorDOMParser.fromSchema(editorSchema).parse(element);
}

export function Editor() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!mountRef.current) {
      return;
    }

    const { strong, em } = editorSchema.marks;
    const { heading, code_block, bullet_list, ordered_list, list_item } =
      editorSchema.nodes;

    const state = EditorState.create({
      schema: editorSchema,
      doc: createInitialDocument(),
      plugins: [
        history(),
        keymap({
          "Mod-z": undo,
          "Shift-Mod-z": redo,
          "Mod-y": redo,
          "Mod-b": toggleMark(strong),
          "Mod-i": toggleMark(em),
          "Mod-Alt-1": setBlockType(heading, { level: 1 }),
          "Mod-Alt-2": setBlockType(heading, { level: 2 }),
          "Mod-Alt-3": setBlockType(heading, { level: 3 }),
          "Shift-Ctrl-8": wrapInList(bullet_list),
          "Shift-Ctrl-9": wrapInList(ordered_list),
          "Shift-Ctrl-\\": setBlockType(code_block),
          Enter: splitListItem(list_item),
          Tab: sinkListItem(list_item),
          "Shift-Tab": liftListItem(list_item),
        }),
        keymap(baseKeymap),
      ],
    });

    viewRef.current = new EditorView(mountRef.current, {
      state,
      attributes: {
        class: "ProseMirror editor__surface",
      },
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []);

  return (
    <section className="editor">
      <div className="editor__meta">
        <span className="editor__label">Editor</span>
        <p className="editor__hint">
          Shortcuts: Mod+B, Mod+I, Shift+Ctrl+8, Shift+Ctrl+9, Shift+Ctrl+\ for
          code blocks
        </p>
      </div>
      <div ref={mountRef} className="editor__mount" />
    </section>
  );
}
