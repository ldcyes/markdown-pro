export interface EditorTabState {
  id: string;
  fileName: string;
  content: string;
  savedContent: string;
  updatedAt: number;
  editorStateJSON: unknown | null;
  fileHandle: unknown | null;
  sourcePath: string | null;
}

export function createBlankEditorTab(createTabId: () => string): EditorTabState {
  return {
    id: createTabId(),
    fileName: "untitled.md",
    content: "",
    savedContent: "",
    updatedAt: 0,
    editorStateJSON: null,
    fileHandle: null,
    sourcePath: null,
  };
}
