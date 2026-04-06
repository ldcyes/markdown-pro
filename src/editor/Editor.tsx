import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import {
  Bold,
  Columns3,
  Code2,
  FolderOpen,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  List,
  Rows3,
  Save,
  Table2,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  baseKeymap,
  chainCommands,
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
import { TextSelection } from "prosemirror-state";
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  deleteColumn,
  deleteRow,
  goToNextCell,
  tableEditing,
} from "prosemirror-tables";
import { EditorView } from "prosemirror-view";
import {
  downloadMarkdownFile,
  formatFileSize,
  loadDraftFromLocalStorage,
  normalizeMarkdownFilename,
  openMarkdownFile,
  saveDraftToLocalStorage,
} from "../utils/fileSystem.js";
import { DEFAULT_MARKDOWN } from "./defaultMarkdown";
import {
  markdownToProseMirror,
  proseMirrorToMarkdown,
} from "./markdown-parser.js";
import { OutlineSidebar } from "./OutlineSidebar";
import {
  buildOutlineTree,
  extractOutline,
  findActiveOutlineId,
  type OutlineItem,
} from "./outline.js";
import { editorSchema } from "./schema";
import {
  getActiveToolbarState,
  insertTable,
  isNodeActive,
} from "./toolbarState.js";
import { handleImageDrop, handleImagePaste, insertImage } from "./imageUtils.js";
import { ImageUpload } from "./ImageUpload.js";

type Command = (
  state: EditorState,
  dispatch?: EditorView["dispatch"],
  view?: EditorView,
) => boolean;

function createEditorState(markdownSource: string) {
  const { strong, em } = editorSchema.marks;
  const { heading, code_block, bullet_list, ordered_list, list_item } =
    editorSchema.nodes;

  return EditorState.create({
    schema: editorSchema,
    doc: markdownToProseMirror(markdownSource),
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
        Tab: chainCommands(goToNextCell(1), sinkListItem(list_item)),
        "Shift-Tab": chainCommands(goToNextCell(-1), liftListItem(list_item)),
      }),
      tableEditing(),
      keymap(baseKeymap),
    ],
  });
}

function formatAutosaveLabel(timestamp: number) {
  if (!timestamp) {
    return "Autosave ready";
  }

  return `Auto-saved ${new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp)}`;
}

export function Editor() {
  const [initialDraft] = useState(() => {
    return (
      loadDraftFromLocalStorage() ?? {
        content: DEFAULT_MARKDOWN,
        fileName: "untitled.md",
        updatedAt: 0,
      }
    );
  });
  const mountRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [markdownSource, setMarkdownSource] = useState(initialDraft.content);
  const [documentName, setDocumentName] = useState(initialDraft.fileName);
  const [lastSavedAt, setLastSavedAt] = useState(initialDraft.updatedAt);
  const [statusMessage, setStatusMessage] = useState(
    initialDraft.updatedAt ? "Restored local draft" : "Editing draft",
  );
  const [activeToolbarState, setActiveToolbarState] = useState(() =>
    getActiveToolbarState(createEditorState(initialDraft.content)),
  );
  const [initialOutlineState] = useState(() => {
    const items = extractOutline(markdownToProseMirror(initialDraft.content));

    return {
      activeId: findActiveOutlineId(items, 0),
      items,
    };
  });
  const [outlineItems, setOutlineItems] = useState<OutlineItem[]>(
    initialOutlineState.items,
  );
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(
    initialOutlineState.activeId,
  );
  const [showImageUpload, setShowImageUpload] = useState(false);

  const handleImageInsert = useEffectEvent(
    (src: string, alt?: string, width?: number, height?: number) => {
      const view = viewRef.current;
      if (!view) {
        return;
      }

      insertImage(view, src, alt, width, height);
      setShowImageUpload(false);
    },
  );

  const syncSnapshot = useEffectEvent(
    (
      nextState: EditorState,
      options?: {
        fileName?: string;
        statusMessage?: string;
      },
    ) => {
      const nextOutlineItems = extractOutline(nextState.doc);

      setMarkdownSource(proseMirrorToMarkdown(nextState.doc));
      setActiveToolbarState(getActiveToolbarState(nextState));
      setOutlineItems(nextOutlineItems);
      setActiveOutlineId(
        findActiveOutlineId(nextOutlineItems, nextState.selection.from),
      );

      if (options?.fileName) {
        setDocumentName(normalizeMarkdownFilename(options.fileName));
      }

      setStatusMessage(options?.statusMessage ?? "Unsaved changes");
    },
  );

  const syncToolbarState = useEffectEvent((nextState: EditorState) => {
    setActiveToolbarState(getActiveToolbarState(nextState));
    setActiveOutlineId(
      findActiveOutlineId(outlineItems, nextState.selection.from),
    );
  });

  const handleOpenFile = useEffectEvent(async () => {
    const nextFile = await openMarkdownFile();
    const view = viewRef.current;

    if (!nextFile || !view) {
      return;
    }

    const nextState = createEditorState(nextFile.content);
    view.updateState(nextState);
    view.focus();
    syncSnapshot(nextState, {
      fileName: nextFile.fileName,
      statusMessage: `Opened ${nextFile.fileName}`,
    });
  });

  const handleSaveFile = useEffectEvent(() => {
    downloadMarkdownFile(markdownSource, documentName);
    setStatusMessage(`Downloaded ${normalizeMarkdownFilename(documentName)}`);
  });

  const runEditorCommand = useEffectEvent((command: Command) => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    command(view.state, view.dispatch, view);
    view.focus();
  });

  const toggleBulletListCommand = useEffectEvent(() => {
    const { bullet_list, list_item } = editorSchema.nodes;
    const view = viewRef.current;

    if (!view) {
      return;
    }

    const command = isNodeActive(view.state, "bullet_list")
      ? liftListItem(list_item)
      : wrapInList(bullet_list);

    runEditorCommand(command);
  });

  const handleOutlineSelect = useEffectEvent((item: OutlineItem) => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    const nextPosition = Math.min(item.position + 1, view.state.doc.content.size);
    const transaction = view.state.tr
      .setSelection(TextSelection.create(view.state.doc, nextPosition))
      .scrollIntoView();

    view.dispatch(transaction);
    view.focus();
  });

  useEffect(() => {
    if (!mountRef.current) {
      return;
    }

    const view = new EditorView(mountRef.current, {
      state: createEditorState(initialDraft.content),
      attributes: {
        class: "ProseMirror editor__surface",
      },
      dispatchTransaction(transaction) {
        const nextState = view.state.apply(transaction);
        view.updateState(nextState);

        if (transaction.docChanged) {
          syncSnapshot(nextState);
          return;
        }

        syncToolbarState(nextState);
      },
      handleDOMEvents: {
        paste: (view, event) => {
          return handleImagePaste(view, event);
        },
        drop: (view, event) => {
          return handleImageDrop(view, event);
        },
      },
    });
    viewRef.current = view;

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [initialDraft.content, syncSnapshot, syncToolbarState]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedDraft = saveDraftToLocalStorage({
        content: markdownSource,
        fileName: documentName,
        updatedAt: Date.now(),
      });

      if (!savedDraft) {
        return;
      }

      setDocumentName(savedDraft.fileName);
      setLastSavedAt(savedDraft.updatedAt);
      setStatusMessage("Local draft synced");
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [documentName, markdownSource]);

  const { strong, em } = editorSchema.marks;
  const { heading, code_block } = editorSchema.nodes;
  const documentSize = new Blob([markdownSource]).size;
  const outlineTree = buildOutlineTree(outlineItems);
  const formattingButtons: Array<{
    active: boolean;
    icon: LucideIcon;
    id: string;
    label: string;
    onClick: () => void;
  }> = [
    {
      active: activeToolbarState.bold,
      icon: Bold,
      id: "bold",
      label: "Bold",
      onClick: () => runEditorCommand(toggleMark(strong)),
    },
    {
      active: activeToolbarState.italic,
      icon: Italic,
      id: "italic",
      label: "Italic",
      onClick: () => runEditorCommand(toggleMark(em)),
    },
    {
      active: activeToolbarState.headingLevel === 1,
      icon: Heading1,
      id: "heading-1",
      label: "Heading 1",
      onClick: () => runEditorCommand(setBlockType(heading, { level: 1 })),
    },
    {
      active: activeToolbarState.headingLevel === 2,
      icon: Heading2,
      id: "heading-2",
      label: "Heading 2",
      onClick: () => runEditorCommand(setBlockType(heading, { level: 2 })),
    },
    {
      active: activeToolbarState.headingLevel === 3,
      icon: Heading3,
      id: "heading-3",
      label: "Heading 3",
      onClick: () => runEditorCommand(setBlockType(heading, { level: 3 })),
    },
    {
      active: activeToolbarState.bulletList,
      icon: List,
      id: "bullet-list",
      label: "List",
      onClick: () => {
        void toggleBulletListCommand();
      },
    },
    {
      active: activeToolbarState.codeBlock,
      icon: Code2,
      id: "code-block",
      label: "Code",
      onClick: () => runEditorCommand(setBlockType(code_block)),
    },
    {
      active: false,
      icon: ImageIcon,
      id: "insert-image",
      label: "Image",
      onClick: () => setShowImageUpload(true),
    },
  ];

  const fileButtons: Array<{
    icon: LucideIcon;
    id: string;
    label: string;
    onClick: () => void;
  }> = [
    {
      icon: FolderOpen,
      id: "open-file",
      label: "Open",
      onClick: () => {
        void handleOpenFile();
      },
    },
    {
      icon: Save,
      id: "save-file",
      label: "Save",
      onClick: handleSaveFile,
    },
  ];
  const tableButtons: Array<{
    disabled?: boolean;
    icon: LucideIcon;
    id: string;
    label: string;
    onClick: () => void;
  }> = [
    {
      icon: Table2,
      id: "insert-table",
      label: "Table",
      onClick: () => runEditorCommand(insertTable),
    },
    {
      disabled: !activeToolbarState.table,
      icon: Rows3,
      id: "add-row-before",
      label: "Row Before",
      onClick: () => runEditorCommand(addRowBefore),
    },
    {
      disabled: !activeToolbarState.table,
      icon: Rows3,
      id: "add-row-after",
      label: "Row After",
      onClick: () => runEditorCommand(addRowAfter),
    },
    {
      disabled: !activeToolbarState.table,
      icon: Columns3,
      id: "add-column-before",
      label: "Col Before",
      onClick: () => runEditorCommand(addColumnBefore),
    },
    {
      disabled: !activeToolbarState.table,
      icon: Columns3,
      id: "add-column-after",
      label: "Col After",
      onClick: () => runEditorCommand(addColumnAfter),
    },
    {
      disabled: !activeToolbarState.table,
      icon: Trash2,
      id: "delete-row",
      label: "Delete Row",
      onClick: () => runEditorCommand(deleteRow),
    },
    {
      disabled: !activeToolbarState.table,
      icon: Trash2,
      id: "delete-column",
      label: "Delete Col",
      onClick: () => runEditorCommand(deleteColumn),
    },
  ];

  return (
    <section className="editor">
      <div className="editor__meta">
        <div className="editor__details">
          <span className="editor__label">{documentName}</span>
          <p className="editor__hint">
            {statusMessage}
            {` • ${formatFileSize(documentSize)}`}
            {lastSavedAt ? ` • ${formatAutosaveLabel(lastSavedAt)}` : ""}
          </p>
        </div>
      </div>
      <div className="editor__toolbar" role="toolbar" aria-label="Editor toolbar">
        <div className="editor__toolbar-group">
          {formattingButtons.map((button) => {
            const Icon = button.icon;

            return (
              <button
                key={button.id}
                type="button"
                className={`editor__tool${button.active ? " editor__tool--active" : ""}`}
                aria-label={button.label}
                aria-pressed={button.active}
                onClick={button.onClick}
              >
                <Icon size={16} strokeWidth={2.1} />
                <span>{button.label}</span>
              </button>
            );
          })}
        </div>
        <div className="editor__toolbar-group">
          {tableButtons.map((button) => {
            const Icon = button.icon;

            return (
              <button
                key={button.id}
                type="button"
                className="editor__tool"
                aria-label={button.label}
                aria-disabled={button.disabled}
                disabled={button.disabled}
                onClick={button.onClick}
              >
                <Icon size={16} strokeWidth={2.1} />
                <span>{button.label}</span>
              </button>
            );
          })}
        </div>
        <div className="editor__toolbar-group editor__toolbar-group--file">
          {fileButtons.map((button) => {
            const Icon = button.icon;

            return (
              <button
                key={button.id}
                type="button"
                className="editor__tool editor__tool--file"
                aria-label={button.label}
                onClick={button.onClick}
              >
                <Icon size={16} strokeWidth={2.1} />
                <span>{button.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="editor__workspace">
        <OutlineSidebar
          activeId={activeOutlineId}
          items={outlineTree}
          onSelect={handleOutlineSelect}
        />
        <div ref={mountRef} className="editor__mount" />
      </div>
      {showImageUpload && (
        <ImageUpload
          onInsert={handleImageInsert}
          onClose={() => setShowImageUpload(false)}
        />
      )}
    </section>
  );
}
