import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Columns3,
  Code2,
  FileDown,
  FilePlus2,
  FileText,
  FolderOpen,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  MoonStar,
  Printer,
  Redo2,
  Rows3,
  Save,
  SaveAll,
  SunMedium,
  Table2,
  Trash2,
  Undo2,
  X,
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
import { EditorState, Plugin } from "prosemirror-state";
import { TextSelection } from "prosemirror-state";
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  columnResizing,
  deleteColumn,
  deleteRow,
  goToNextCell,
  tableEditing,
} from "prosemirror-tables";
import { EditorView, Decoration, DecorationSet } from "prosemirror-view";
import "prosemirror-view/style/prosemirror.css";
import "prosemirror-tables/style/tables.css";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import cpp from "highlight.js/lib/languages/cpp";
import c from "highlight.js/lib/languages/c";
import verilog from "highlight.js/lib/languages/verilog";
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";
import java from "highlight.js/lib/languages/java";
import csharp from "highlight.js/lib/languages/csharp";
import {
  downloadMarkdownFile,
  exportToDocx,
  exportToPdf,
  formatFileSize,
  loadDraftFromLocalStorage,
  normalizeMarkdownFilename,
  openMarkdownFile,
  saveDraftToLocalStorage,
  saveDraftToLocalStorageWithKey,
  saveMarkdownFileWithHandle,
  saveMarkdownFileWithPicker,
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
import { ImageResizeView } from "./ImageResizeView.js";

// Register highlight.js languages
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("c", c);
hljs.registerLanguage("verilog", verilog);
hljs.registerLanguage("systemverilog", verilog);
hljs.registerLanguage("sv", verilog);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("java", java);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("cs", csharp);

type Command = (
  state: EditorState,
  dispatch?: EditorView["dispatch"],
  view?: EditorView,
) => boolean;

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
const modKey = isMac ? "\u2318" : "Ctrl";

/** Each open tab tracks its own content, dirty state, and editor state */
interface TabState {
  id: string;
  fileName: string;
  content: string;
  savedContent: string;
  updatedAt: number;
  editorStateJSON: unknown | null; // JSON snapshot of ProseMirror state for restoring undo history
  fileHandle: unknown | null; // FileSystemFileHandle for saving to disk
}

let tabIdCounter = 0;
function nextTabId() {
  return `tab-${++tabIdCounter}`;
}

// ─── ProseMirror plugins ───

function codeHighlightPlugin() {
  function getDecorations(doc: EditorState["doc"]) {
    const decorations: Decoration[] = [];
    doc.descendants((node, pos) => {
      if (node.type.name !== "code_block") return;
      const text = node.textContent;
      if (!text.trim()) return;
      let result;
      try {
        result = hljs.highlightAuto(text, [
          "python", "cpp", "c", "verilog", "systemverilog",
          "typescript", "javascript", "java", "csharp",
        ]);
      } catch { return; }
      if (!result.value) return;
      const htmlStr = result.value;
      let textOffset = 0;
      const spanRegex = /<span class="(hljs-[^"]+)">([^<]*)<\/span>|([^<]+)/g;
      let match;
      while ((match = spanRegex.exec(htmlStr)) !== null) {
        const className = match[1];
        const spanText = match[2] ?? match[3];
        if (!spanText) continue;
        const decoded = spanText.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
        if (className && decoded.length > 0) {
          const from = pos + 1 + textOffset;
          const to = from + decoded.length;
          decorations.push(Decoration.inline(from, to, { class: className }));
        }
        textOffset += decoded.length;
      }
    });
    return DecorationSet.create(doc, decorations);
  }

  return new Plugin({
    state: {
      init(_config, state) { return getDecorations(state.doc); },
      apply(tr, decorations, _oldState, newState) {
        if (tr.docChanged) return getDecorations(newState.doc);
        return decorations.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations(state) { return this.getState(state); },
    },
  });
}

/** Ensures the document always ends with an empty paragraph so cursor can go to the end */
function trailingParagraphPlugin() {
  return new Plugin({
    appendTransaction(_transactions, _oldState, newState) {
      const { doc, tr } = newState;
      const lastNode = doc.lastChild;
      if (!lastNode) return null;
      // If last node is not an empty paragraph, append one
      const isEmptyParagraph =
        lastNode.type.name === "paragraph" &&
        lastNode.content.size === 0;
      if (!isEmptyParagraph) {
        const p = editorSchema.nodes.paragraph.create();
        tr.insert(doc.content.size, p);
        return tr;
      }
      return null;
    },
  });
}

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
        "Mod-Alt-4": setBlockType(heading, { level: 4 }),
        "Shift-Ctrl-8": wrapInList(bullet_list),
        "Shift-Ctrl-9": wrapInList(ordered_list),
        "Shift-Ctrl-\\": setBlockType(code_block),
        Enter: splitListItem(list_item),
        Tab: chainCommands(goToNextCell(1), sinkListItem(list_item)),
        "Shift-Tab": chainCommands(goToNextCell(-1), liftListItem(list_item)),
      }),
      columnResizing(),
      tableEditing(),
      codeHighlightPlugin(),
      trailingParagraphPlugin(),
      keymap(baseKeymap),
    ],
  });
}

function formatAutosaveLabel(timestamp: number) {
  if (!timestamp) return "Autosave ready";
  return `Auto-saved ${new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(timestamp)}`;
}

// Text-align command
function setTextAlign(align: string | null): Command {
  return (state, dispatch) => {
    const { from, to } = state.selection;
    let tr = state.tr;
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.type.name === "paragraph" || node.type.name === "heading") {
        tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, align });
      }
    });
    if (tr.docChanged && dispatch) {
      dispatch(tr);
    }
    return true;
  };
}

interface EditorProps {
  theme: string;
  onThemeToggle: () => void;
}

export function Editor({ theme, onThemeToggle }: EditorProps) {
  // Initialize tabs
  const [tabs, setTabs] = useState<TabState[]>(() => {
    const draft = loadDraftFromLocalStorage();
    const content = draft?.content ?? DEFAULT_MARKDOWN;
    const fileName = draft?.fileName ?? "untitled.md";
    const id = nextTabId();
    return [{
      id, fileName, content,
      savedContent: content,
      updatedAt: draft?.updatedAt ?? 0,
      editorStateJSON: null,
      fileHandle: null,
    }];
  });
  const [activeTabId, setActiveTabId] = useState(() => tabs[0].id);
  const [autoSave, setAutoSave] = useState(() => {
    try {
      return localStorage.getItem("markdown-pro:autosave") !== "off";
    } catch { return true; }
  });

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    activeTab.updatedAt ? "Restored local draft" : "Editing draft",
  );
  const [activeToolbarState, setActiveToolbarState] = useState(() =>
    getActiveToolbarState(createEditorState(activeTab.content)),
  );
  const [outlineItems, setOutlineItems] = useState<OutlineItem[]>(() =>
    extractOutline(markdownToProseMirror(activeTab.content)),
  );
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(() =>
    findActiveOutlineId(outlineItems, 0),
  );
  const [showImageCrop, setShowImageCrop] = useState<{ src: string; pos: number } | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const resizerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [compactToolbar, setCompactToolbar] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const updateActiveTab = useCallback(
    (patch: Partial<TabState>) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, ...patch } : t)),
      );
    },
    [activeTabId],
  );

  const handleInsertImageFromPicker = useEffectEvent(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const view = viewRef.current;
        if (!view) return;
        insertImage(view, reader.result as string, file.name);
      };
      reader.readAsDataURL(file);
    }, { once: true });
    input.click();
  });

  const syncSnapshot = useEffectEvent(
    (nextState: EditorState, options?: { fileName?: string; statusMessage?: string }) => {
      const nextOutlineItems = extractOutline(nextState.doc);
      const md = proseMirrorToMarkdown(nextState.doc);
      setActiveToolbarState(getActiveToolbarState(nextState));
      setOutlineItems(nextOutlineItems);
      setActiveOutlineId(findActiveOutlineId(nextOutlineItems, nextState.selection.from));

      const tabPatch: Partial<TabState> = { content: md };
      if (options?.fileName) tabPatch.fileName = normalizeMarkdownFilename(options.fileName);
      // If auto-save is on, also update savedContent
      if (autoSave) tabPatch.savedContent = md;
      updateActiveTab(tabPatch);
      setStatusMessage(options?.statusMessage ?? (autoSave ? "Auto-saved" : "Unsaved changes"));
    },
  );

  const syncToolbarState = useEffectEvent((nextState: EditorState) => {
    setActiveToolbarState(getActiveToolbarState(nextState));
    setActiveOutlineId(findActiveOutlineId(outlineItems, nextState.selection.from));
  });

  // ─── Tab operations ───
  const handleNewTab = useEffectEvent(() => {
    const id = nextTabId();
    const content = DEFAULT_MARKDOWN;
    setTabs((prev) => [
      ...prev,
      { id, fileName: "untitled.md", content, savedContent: content, updatedAt: 0, editorStateJSON: null, fileHandle: null },
    ]);
    setActiveTabId(id);
  });

  const handleCloseTab = useEffectEvent((tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;
    if (tab.content !== tab.savedContent) {
      if (!window.confirm(`"${tab.fileName}" has unsaved changes.\n\nDiscard changes and close?`)) return;
    }
    const remaining = tabs.filter((t) => t.id !== tabId);
    if (remaining.length === 0) {
      handleNewTab();
      setTabs((prev) => prev.filter((t) => t.id !== tabId));
      return;
    }
    setTabs(remaining);
    if (activeTabId === tabId) {
      const closedIndex = tabs.findIndex((t) => t.id === tabId);
      const nextIndex = Math.min(closedIndex, remaining.length - 1);
      setActiveTabId(remaining[nextIndex].id);
    }
  });

  const switchToTab = useEffectEvent((tabId: string) => {
    if (tabId === activeTabId) return;
    // Save current ProseMirror state JSON for undo history preservation
    const view = viewRef.current;
    if (view) {
      const md = proseMirrorToMarkdown(view.state.doc);
      const stateJSON = view.state.toJSON();
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, content: md, editorStateJSON: stateJSON } : t)),
      );
    }
    setActiveTabId(tabId);
  });

  // When activeTabId changes, reload editor state (with undo history if available)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;

    let nextState: EditorState;
    if (tab.editorStateJSON) {
      // Restore full state with undo history
      try {
        nextState = EditorState.fromJSON(
          { schema: editorSchema, plugins: createEditorState("").plugins },
          tab.editorStateJSON as Record<string, unknown>,
        );
      } catch {
        nextState = createEditorState(tab.content);
      }
    } else {
      nextState = createEditorState(tab.content);
    }
    view.updateState(nextState);
    const nextOutlineItems = extractOutline(nextState.doc);
    setActiveToolbarState(getActiveToolbarState(nextState));
    setOutlineItems(nextOutlineItems);
    setActiveOutlineId(findActiveOutlineId(nextOutlineItems, 0));
    setStatusMessage(tab.updatedAt ? "Restored draft" : "Editing draft");
  }, [activeTabId]);

  const handleOpenFile = useEffectEvent(async () => {
    const nextFile = await openMarkdownFile();
    if (!nextFile) return;
    const existingTab = tabs.find((t) => t.fileName === nextFile.fileName);
    if (existingTab) { setActiveTabId(existingTab.id); return; }
    const id = nextTabId();
    setTabs((prev) => [
      ...prev,
      { id, fileName: nextFile.fileName, content: nextFile.content, savedContent: nextFile.content, updatedAt: Date.now(), editorStateJSON: null, fileHandle: null },
    ]);
    setActiveTabId(id);
  });

  const handleSaveFile = useEffectEvent(async () => {
    if (activeTab.fileHandle) {
      const ok = await saveMarkdownFileWithHandle(activeTab.content, activeTab.fileHandle);
      if (ok) {
        updateActiveTab({ savedContent: activeTab.content });
        setStatusMessage(`Saved ${normalizeMarkdownFilename(activeTab.fileName)}`);
      }
    } else {
      const result = await saveMarkdownFileWithPicker(activeTab.content, activeTab.fileName);
      if (result === "downloaded") {
        updateActiveTab({ savedContent: activeTab.content });
        setStatusMessage(`Downloaded ${normalizeMarkdownFilename(activeTab.fileName)}`);
      } else if (result) {
        updateActiveTab({ savedContent: activeTab.content, fileHandle: result.handle, fileName: result.fileName });
        setStatusMessage(`Saved ${normalizeMarkdownFilename(result.fileName)}`);
      }
    }
  });

  const handleSaveAsFile = useEffectEvent(async () => {
    const result = await saveMarkdownFileWithPicker(activeTab.content, activeTab.fileName);
    if (result === "downloaded") {
      updateActiveTab({ savedContent: activeTab.content });
      setStatusMessage(`Downloaded ${normalizeMarkdownFilename(activeTab.fileName)}`);
    } else if (result) {
      updateActiveTab({ savedContent: activeTab.content, fileHandle: result.handle, fileName: result.fileName });
      setStatusMessage(`Saved as ${normalizeMarkdownFilename(result.fileName)}`);
    }
  });

  const handleExportPdf = useEffectEvent(() => {
    const editorEl = mountRef.current?.querySelector(".ProseMirror") as HTMLElement | null;
    if (!editorEl) return;
    const watermark = window.prompt("PDF watermark (leave blank for none):", "") ?? "";
    exportToPdf(editorEl, activeTab.fileName, watermark || undefined);
    setStatusMessage("Exported as PDF");
  });

  const handlePrint = useEffectEvent(() => {
    window.print();
  });

  const handleExportDocx = useEffectEvent(() => {
    exportToDocx(activeTab.content, activeTab.fileName);
    setStatusMessage("Exported as Word");
  });

  const runEditorCommand = useEffectEvent((command: Command) => {
    const view = viewRef.current;
    if (!view) return;
    command(view.state, view.dispatch, view);
    view.focus();
  });

  const toggleBulletListCommand = useEffectEvent(() => {
    const { bullet_list, list_item } = editorSchema.nodes;
    const view = viewRef.current;
    if (!view) return;
    runEditorCommand(
      isNodeActive(view.state, "bullet_list") ? liftListItem(list_item) : wrapInList(bullet_list),
    );
  });

  const toggleOrderedListCommand = useEffectEvent(() => {
    const { ordered_list, list_item } = editorSchema.nodes;
    const view = viewRef.current;
    if (!view) return;
    runEditorCommand(
      isNodeActive(view.state, "ordered_list") ? liftListItem(list_item) : wrapInList(ordered_list),
    );
  });

  const handleUndo = useEffectEvent(() => runEditorCommand(undo));
  const handleRedo = useEffectEvent(() => runEditorCommand(redo));

  const handleOutlineSelect = useEffectEvent((item: OutlineItem) => {
    const view = viewRef.current;
    if (!view) return;
    const pos = Math.min(item.position + 1, view.state.doc.content.size);
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)).scrollIntoView());
    view.focus();
  });

  const handleResizerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const startX = e.clientX;
      const startWidth = sidebarWidth;
      const onMouseMove = (ev: MouseEvent) => {
        const ws = workspaceRef.current;
        const maxW = ws ? ws.offsetWidth * 0.5 : 500;
        setSidebarWidth(Math.max(140, Math.min(maxW, startWidth + ev.clientX - startX)));
      };
      const onMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [sidebarWidth],
  );

  // Toggle autoSave
  const toggleAutoSave = useEffectEvent(() => {
    const next = !autoSave;
    setAutoSave(next);
    try { localStorage.setItem("markdown-pro:autosave", next ? "on" : "off"); } catch { /* noop */ }
    if (next) {
      // Immediately mark current content as saved
      updateActiveTab({ savedContent: activeTab.content });
      setStatusMessage("Auto-save enabled");
    } else {
      setStatusMessage("Auto-save disabled");
    }
  });

  // Mount ProseMirror
  useEffect(() => {
    if (!mountRef.current) return;
    const initContent = tabs.find((t) => t.id === activeTabId)?.content ?? DEFAULT_MARKDOWN;
    const view = new EditorView(mountRef.current, {
      state: createEditorState(initContent),
      editable: () => true,
      attributes: { class: "ProseMirror editor__surface", role: "textbox", "aria-multiline": "true" },
      nodeViews: {
        image(node, view, getPos) { return new ImageResizeView(node, view, getPos); },
      },
      dispatchTransaction(transaction) {
        const nextState = view.state.apply(transaction);
        view.updateState(nextState);
        if (transaction.docChanged) { syncSnapshot(nextState); return; }
        syncToolbarState(nextState);
      },
      handleDOMEvents: {
        paste: (view, event) => handleImagePaste(view, event),
        drop: (view, event) => handleImageDrop(view, event),
      },
    });
    viewRef.current = view;
    return () => { viewRef.current?.destroy(); viewRef.current = null; };
  }, []);

  // Draft auto-save to localStorage
  useEffect(() => {
    const tid = window.setTimeout(() => {
      saveDraftToLocalStorageWithKey(
        { content: activeTab.content, fileName: activeTab.fileName, updatedAt: Date.now() },
        `markdown-pro:tab:${activeTab.id}`,
      );
      saveDraftToLocalStorage({ content: activeTab.content, fileName: activeTab.fileName, updatedAt: Date.now() });
      updateActiveTab({ updatedAt: Date.now() });
    }, 400);
    return () => window.clearTimeout(tid);
  }, [activeTab.content, activeTab.fileName]);

  // Warn on browser close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (tabs.some((t) => t.content !== t.savedContent)) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [tabs]);

  // Responsive toolbar: compact mode when toolbar is too narrow
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setCompactToolbar(entry.contentRect.width < 860);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Close open dropdown when clicking outside the toolbar
  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  const { strong, em } = editorSchema.marks;
  const { heading, code_block } = editorSchema.nodes;
  const documentSize = new Blob([activeTab.content]).size;
  const outlineTree = buildOutlineTree(outlineItems);

  type ToolButton = { active?: boolean; disabled?: boolean; icon: LucideIcon; id: string; label: string; variant?: "file"; onClick: () => void };

  const fileGroup: ToolButton[] = [
    { icon: FilePlus2, id: "new-tab", label: "New", onClick: handleNewTab },
    { icon: FolderOpen, id: "open-file", label: "Open", onClick: () => { void handleOpenFile(); } },
    { icon: Save, id: "save-file", label: "Save", variant: "file", onClick: () => { void handleSaveFile(); } },
    { icon: SaveAll, id: "save-as-file", label: "Save As", onClick: () => { void handleSaveAsFile(); } },
  ];

  const formatGroup: ToolButton[] = [
    { active: activeToolbarState.bold, icon: Bold, id: "bold", label: "Bold", onClick: () => runEditorCommand(toggleMark(strong)) },
    { active: activeToolbarState.italic, icon: Italic, id: "italic", label: "Italic", onClick: () => runEditorCommand(toggleMark(em)) },
    { active: activeToolbarState.headingLevel === 1, icon: Heading1, id: "h1", label: "H1", onClick: () => runEditorCommand(setBlockType(heading, { level: 1 })) },
    { active: activeToolbarState.headingLevel === 2, icon: Heading2, id: "h2", label: "H2", onClick: () => runEditorCommand(setBlockType(heading, { level: 2 })) },
    { active: activeToolbarState.headingLevel === 3, icon: Heading3, id: "h3", label: "H3", onClick: () => runEditorCommand(setBlockType(heading, { level: 3 })) },
    { active: activeToolbarState.headingLevel === 4, icon: Heading4, id: "h4", label: "H4", onClick: () => runEditorCommand(setBlockType(heading, { level: 4 })) },
  ];

  const alignGroup: ToolButton[] = [
    { active: !activeToolbarState.textAlign || activeToolbarState.textAlign === "left", icon: AlignLeft, id: "align-left", label: "Left", onClick: () => runEditorCommand(setTextAlign(null)) },
    { active: activeToolbarState.textAlign === "center", icon: AlignCenter, id: "align-center", label: "Center", onClick: () => runEditorCommand(setTextAlign("center")) },
    { active: activeToolbarState.textAlign === "right", icon: AlignRight, id: "align-right", label: "Right", onClick: () => runEditorCommand(setTextAlign("right")) },
  ];

  const insertGroup: ToolButton[] = [
    { active: activeToolbarState.bulletList, icon: List, id: "bullet-list", label: "Bullets", onClick: () => { void toggleBulletListCommand(); } },
    { active: activeToolbarState.orderedList, icon: ListOrdered, id: "ordered-list", label: "Numbers", onClick: () => { void toggleOrderedListCommand(); } },
    { active: activeToolbarState.codeBlock, icon: Code2, id: "code-block", label: "Code", onClick: () => runEditorCommand(setBlockType(code_block)) },
    { icon: ImageIcon, id: "insert-image", label: "Image", onClick: handleInsertImageFromPicker },
    { icon: Table2, id: "insert-table", label: "Table", onClick: () => runEditorCommand(insertTable) },
  ];

  const tableGroup: ToolButton[] = [
    { disabled: !activeToolbarState.table, icon: Rows3, id: "row-before", label: "+Row\u2191", onClick: () => runEditorCommand(addRowBefore) },
    { disabled: !activeToolbarState.table, icon: Rows3, id: "row-after", label: "+Row\u2193", onClick: () => runEditorCommand(addRowAfter) },
    { disabled: !activeToolbarState.table, icon: Columns3, id: "col-before", label: "+Col\u2190", onClick: () => runEditorCommand(addColumnBefore) },
    { disabled: !activeToolbarState.table, icon: Columns3, id: "col-after", label: "+Col\u2192", onClick: () => runEditorCommand(addColumnAfter) },
    { disabled: !activeToolbarState.table, icon: Trash2, id: "del-row", label: "Del Row", onClick: () => runEditorCommand(deleteRow) },
    { disabled: !activeToolbarState.table, icon: Trash2, id: "del-col", label: "Del Col", onClick: () => runEditorCommand(deleteColumn) },
  ];

  const exportGroup: ToolButton[] = [
    { icon: FileDown, id: "export-pdf", label: "PDF", onClick: handleExportPdf },
    { icon: FileText, id: "export-docx", label: "Word", onClick: handleExportDocx },
    { icon: Printer, id: "print", label: "Print", onClick: handlePrint },
  ];

  function renderRibbonGroup(label: string, buttons: ToolButton[]) {
    return (
      <div className="editor__ribbon-group">
        <div className="editor__ribbon-buttons">
          {buttons.map((btn) => {
            const Icon = btn.icon;
            const cls = ["editor__tool", btn.active ? "editor__tool--active" : "", btn.variant === "file" ? "editor__tool--file" : ""].filter(Boolean).join(" ");
            return (
              <button key={btn.id} type="button" className={cls} aria-label={btn.label} aria-pressed={btn.active} disabled={btn.disabled} onClick={btn.onClick}>
                <Icon size={15} strokeWidth={2} /><span>{btn.label}</span>
              </button>
            );
          })}
        </div>
        <span className="editor__ribbon-group-label">{label}</span>
      </div>
    );
  }

  function renderCompactDropdown(label: string, id: string, buttons: ToolButton[]) {
    const isOpen = openDropdown === id;
    return (
      <div className="editor__ribbon-group editor__ribbon-group--compact">
        <div className="editor__ribbon-buttons">
          <button
            type="button"
            className={`editor__tool editor__dropdown-trigger${isOpen ? " editor__tool--active" : ""}`}
            aria-label={label}
            aria-expanded={isOpen}
            onClick={() => setOpenDropdown(isOpen ? null : id)}
          >
            <ChevronDown size={13} strokeWidth={2} />
            <span>{label}</span>
          </button>
        </div>
        <span className="editor__ribbon-group-label">{label}</span>
        {isOpen && (
          <div className="editor__dropdown-menu">
            {buttons.map((btn) => {
              const Icon = btn.icon;
              const cls = ["editor__tool", btn.active ? "editor__tool--active" : "", btn.variant === "file" ? "editor__tool--file" : ""].filter(Boolean).join(" ");
              return (
                <button
                  key={btn.id} type="button" className={cls} aria-label={btn.label}
                  aria-pressed={btn.active} disabled={btn.disabled}
                  onClick={() => { btn.onClick(); setOpenDropdown(null); }}
                >
                  <Icon size={15} strokeWidth={2} /><span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const shortcutGroups = [
    { label: "File", items: [{ keys: [modKey, "S"], desc: "Save" }] },
    { label: "Edit", items: [{ keys: [modKey, "Z"], desc: "Undo" }, { keys: [modKey, "Y"], desc: "Redo" }] },
    { label: "Format", items: [{ keys: [modKey, "B"], desc: "Bold" }, { keys: [modKey, "I"], desc: "Italic" }] },
    { label: "Heading", items: [{ keys: [modKey, "Alt", "1-4"], desc: "H1-H4" }] },
    { label: "List", items: [{ keys: ["Tab"], desc: "Indent" }, { keys: ["Shift", "Tab"], desc: "Dedent" }] },
    { label: "Table", items: [{ keys: ["Tab"], desc: "Next cell" }] },
  ];

  const isDirtyTab = activeTab.content !== activeTab.savedContent;

  return (
    <section className="editor">
      {/* Menu bar */}
      <div className="editor__menubar">
        <div className="editor__menubar-left">
          <button type="button" className="editor__menu-btn" aria-label="Undo" onClick={handleUndo}>
            <Undo2 size={14} strokeWidth={2} /><span>Undo</span>
          </button>
          <button type="button" className="editor__menu-btn" aria-label="Redo" onClick={handleRedo}>
            <Redo2 size={14} strokeWidth={2} /><span>Redo</span>
          </button>
          <span className="editor__menubar-sep" />
          {renamingTabId === activeTabId ? (
            <input
              className="editor__menubar-filename-input"
              defaultValue={activeTab.fileName.replace(/\.(md|markdown)$/i, "")}
              autoFocus
              onBlur={(e) => {
                const newName = normalizeMarkdownFilename(e.currentTarget.value);
                updateActiveTab({ fileName: newName });
                setRenamingTabId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                } else if (e.key === "Escape") {
                  setRenamingTabId(null);
                }
              }}
            />
          ) : (
            <span
              className="editor__menubar-filename"
              onDoubleClick={() => setRenamingTabId(activeTabId)}
              title="Double-click to rename"
            >
              {isDirtyTab ? `${activeTab.fileName} *` : activeTab.fileName}
            </span>
          )}
          <span className="editor__menubar-hint">
            {statusMessage}
            {` \u2022 ${formatFileSize(documentSize)}`}
          </span>
        </div>
        <div className="editor__menubar-right">
          <label className="editor__autosave-toggle">
            <input type="checkbox" checked={autoSave} onChange={toggleAutoSave} />
            <SaveAll size={13} strokeWidth={2} />
            <span>Auto-save</span>
          </label>
          <span className="editor__menubar-sep" />
          <button type="button" className="editor__menu-btn" aria-label="Toggle theme" onClick={onThemeToggle}>
            {theme === "dark" ? <SunMedium size={14} strokeWidth={2} /> : <MoonStar size={14} strokeWidth={2} />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="editor__tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isDirty = tab.content !== tab.savedContent;
          return (
            <div key={tab.id} className={`editor__tab${isActive ? " editor__tab--active" : ""}`} onClick={() => switchToTab(tab.id)}>
              <span className="editor__tab-name">
                {isDirty && <span className="editor__tab-dot" title="Unsaved changes" />}
                {renamingTabId === tab.id ? (
                  <input
                    className="editor__tab-rename-input"
                    defaultValue={tab.fileName.replace(/\.(md|markdown)$/i, "")}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      const newName = normalizeMarkdownFilename(e.currentTarget.value);
                      setTabs((prev) => prev.map((t) => t.id === tab.id ? { ...t, fileName: newName } : t));
                      setRenamingTabId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      } else if (e.key === "Escape") {
                        setRenamingTabId(null);
                      }
                    }}
                  />
                ) : (
                  <span onDoubleClick={(e) => { e.stopPropagation(); setRenamingTabId(tab.id); }}>{tab.fileName}{isDirty && " *"}</span>
                )}
              </span>
              <button type="button" className="editor__tab-close" aria-label={`Close ${tab.fileName}`}
                onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }}>
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
        <button type="button" className="editor__tab-add" aria-label="New tab" onClick={handleNewTab}>
          <FilePlus2 size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Ribbon toolbar */}
      <div className="editor__toolbar" ref={toolbarRef} role="toolbar" aria-label="Editor toolbar">
        {renderCompactDropdown("File", "file", fileGroup)}
        {renderRibbonGroup("Format", formatGroup)}
        {renderRibbonGroup("Align", alignGroup)}
        {compactToolbar ? renderCompactDropdown("Insert", "insert", insertGroup) : renderRibbonGroup("Insert", insertGroup)}
        {compactToolbar ? renderCompactDropdown("Table", "table", tableGroup) : renderRibbonGroup("Table", tableGroup)}
        {compactToolbar ? renderCompactDropdown("Export", "export", exportGroup) : renderRibbonGroup("Export", exportGroup)}
      </div>

      {/* Workspace */}
      <div className="editor__workspace" ref={workspaceRef}>
        <div style={{ width: sidebarWidth, flexShrink: 0 }}>
          <OutlineSidebar activeId={activeOutlineId} items={outlineTree} onSelect={handleOutlineSelect} />
        </div>
        <div ref={resizerRef} className={`editor__resizer${isDragging ? " editor__resizer--dragging" : ""}`} onMouseDown={handleResizerMouseDown} />
        <div ref={mountRef} className="editor__mount" />
      </div>

      {/* Shortcut bar */}
      <div className="editor__shortcuts">
        {shortcutGroups.map((group) => (
          <div key={group.label} className="editor__shortcut-group">
            <span className="editor__shortcut-group-label">{group.label}</span>
            {group.items.map((item) => (
              <span key={item.desc} className="editor__shortcut-item">
                {item.keys.map((k, i) => (
                  <span key={i}>
                    <span className="editor__shortcut-kbd">{k}</span>
                    {i < item.keys.length - 1 && <span className="editor__shortcut-label">+</span>}
                  </span>
                ))}
                <span className="editor__shortcut-label">{item.desc}</span>
              </span>
            ))}
          </div>
        ))}
      </div>

    </section>
  );
}
