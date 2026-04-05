export const DEFAULT_DRAFT_KEY = "markdown-pro:draft";

export interface StorageLike {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export interface MarkdownDraft {
  content: string;
  fileName: string;
  updatedAt: number;
}

export interface MarkdownFileSnapshot {
  content: string;
  fileName: string;
  lastModified: number;
  size: number;
}

interface FileLike {
  lastModified: number;
  name: string;
  size: number;
  text(): Promise<string>;
}

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function normalizeMarkdownFilename(fileName = "untitled.md"): string {
  const trimmed = fileName.trim();

  if (!trimmed) {
    return "untitled.md";
  }

  if (/\.(md|markdown)$/i.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed}.md`;
}

export async function readMarkdownFile(
  file: FileLike,
): Promise<MarkdownFileSnapshot> {
  return {
    content: await file.text(),
    fileName: normalizeMarkdownFilename(file.name),
    lastModified: file.lastModified,
    size: file.size,
  };
}

export function saveDraft(
  storage: StorageLike,
  draft: MarkdownDraft,
  key = DEFAULT_DRAFT_KEY,
): MarkdownDraft {
  const normalizedDraft = {
    ...draft,
    fileName: normalizeMarkdownFilename(draft.fileName),
  };

  storage.setItem(key, JSON.stringify(normalizedDraft));

  return normalizedDraft;
}

export function loadDraft(
  storage: StorageLike,
  key = DEFAULT_DRAFT_KEY,
): MarkdownDraft | null {
  const serializedDraft = storage.getItem(key);

  if (!serializedDraft) {
    return null;
  }

  try {
    const parsedDraft = JSON.parse(serializedDraft) as Partial<MarkdownDraft>;

    if (typeof parsedDraft.content !== "string") {
      return null;
    }

    return {
      content: parsedDraft.content,
      fileName: normalizeMarkdownFilename(parsedDraft.fileName),
      updatedAt: Number(parsedDraft.updatedAt ?? 0),
    };
  } catch {
    return null;
  }
}

export function clearDraft(storage: StorageLike, key = DEFAULT_DRAFT_KEY) {
  storage.removeItem(key);
}

export function loadDraftFromLocalStorage(
  key = DEFAULT_DRAFT_KEY,
): MarkdownDraft | null {
  if (!canUseBrowserStorage()) {
    return null;
  }

  try {
    return loadDraft(window.localStorage, key);
  } catch {
    return null;
  }
}

export function saveDraftToLocalStorage(
  draft: MarkdownDraft,
  key = DEFAULT_DRAFT_KEY,
): MarkdownDraft | null {
  if (!canUseBrowserStorage()) {
    return null;
  }

  try {
    return saveDraft(window.localStorage, draft, key);
  } catch {
    return null;
  }
}

export function clearDraftFromLocalStorage(key = DEFAULT_DRAFT_KEY) {
  if (!canUseBrowserStorage()) {
    return;
  }

  try {
    clearDraft(window.localStorage, key);
  } catch {
    return;
  }
}

export async function openMarkdownFile(): Promise<MarkdownFileSnapshot | null> {
  if (typeof document === "undefined") {
    return null;
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,text/markdown";

    input.addEventListener(
      "change",
      async () => {
        const file = input.files?.[0];
        resolve(file ? await readMarkdownFile(file) : null);
      },
      { once: true },
    );

    input.click();
  });
}

export function downloadMarkdownFile(
  content: string,
  fileName = "untitled.md",
) {
  if (typeof document === "undefined") {
    return;
  }

  const url = URL.createObjectURL(
    new Blob([content], {
      type: "text/markdown;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = normalizeMarkdownFilename(fileName);
  anchor.click();
  URL.revokeObjectURL(url);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
