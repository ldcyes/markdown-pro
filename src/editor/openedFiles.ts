import { normalizeMarkdownFilename } from "../utils/fileSystem.js";
import { type OpenedMarkdownFile } from "../utils/desktopOpenFiles.js";

export interface OpenedFileTabState {
  id: string;
  fileName: string;
  content: string;
  savedContent: string;
  updatedAt: number;
  editorStateJSON: unknown | null;
  fileHandle: unknown | null;
  sourcePath: string | null;
}

interface ApplyOpenedMarkdownFilesOptions {
  replaceInitialTab?: boolean;
}

interface ApplyOpenedMarkdownFilesResult<T extends OpenedFileTabState> {
  tabs: T[];
  activeTabId: string | null;
  openedFileName: string | null;
}

function isDisposableInitialTab(tab: OpenedFileTabState) {
  return tab.sourcePath == null && tab.fileHandle == null && tab.content === tab.savedContent;
}

export function applyOpenedMarkdownFiles<T extends OpenedFileTabState>(
  tabs: readonly T[],
  files: readonly OpenedMarkdownFile[],
  createTabId: () => string,
  options: ApplyOpenedMarkdownFilesOptions = {},
): ApplyOpenedMarkdownFilesResult<T> {
  const uniqueFiles = files.filter((file, index, collection) => {
    const pathKey = file.path.toLowerCase();
    return collection.findIndex((candidate) => candidate.path.toLowerCase() === pathKey) === index;
  });

  if (uniqueFiles.length === 0) {
    return { tabs: [...tabs], activeTabId: null, openedFileName: null };
  }

  const nextTabs = [...tabs];
  const shouldReplaceInitialTab =
    options.replaceInitialTab === true &&
    nextTabs.length === 1 &&
    isDisposableInitialTab(nextTabs[0]);

  let activeTabId: string | null = null;
  let openedFileName: string | null = null;

  uniqueFiles.forEach((file, index) => {
    const existingTabIndex = nextTabs.findIndex((tab) => tab.sourcePath?.toLowerCase() === file.path.toLowerCase());
    const existingTab = existingTabIndex >= 0 ? nextTabs[existingTabIndex] : null;
    if (existingTab) {
      const refreshedTab = {
        ...existingTab,
        fileName: normalizeMarkdownFilename(file.fileName),
        content: file.content,
        savedContent: file.content,
        updatedAt: file.lastModified,
        editorStateJSON: null,
        sourcePath: file.path,
      };
      nextTabs[existingTabIndex] = refreshedTab;

      if (activeTabId == null) {
        activeTabId = refreshedTab.id;
        openedFileName = refreshedTab.fileName;
      }
      return;
    }

    const nextTab = {
      id: createTabId(),
      fileName: normalizeMarkdownFilename(file.fileName),
      content: file.content,
      savedContent: file.content,
      updatedAt: file.lastModified,
      editorStateJSON: null,
      fileHandle: null,
      sourcePath: file.path,
    } as T;

    if (shouldReplaceInitialTab && index === 0) {
      nextTabs[0] = nextTab;
    } else {
      nextTabs.push(nextTab);
    }

    if (activeTabId == null) {
      activeTabId = nextTab.id;
      openedFileName = nextTab.fileName;
    }
  });

  return { tabs: nextTabs, activeTabId, openedFileName };
}
