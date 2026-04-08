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

export function saveDraftToLocalStorageWithKey(
  draft: MarkdownDraft,
  key: string,
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

export function loadAllDraftsFromLocalStorage(): MarkdownDraft[] {
  if (!canUseBrowserStorage()) {
    return [];
  }

  const drafts: MarkdownDraft[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith("markdown-pro:tab:")) {
      const draft = loadDraft(window.localStorage, key);
      if (draft) {
        drafts.push(draft);
      }
    }
  }
  return drafts;
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

export async function exportToPdf(
  editorElement: HTMLElement,
  fileName = "untitled.md",
  watermark?: string,
) {
  if (typeof document === "undefined") return;

  const html2pdf = (await import("html2pdf.js")).default;
  const baseName = fileName.replace(/\.(md|markdown)$/i, "");

  // If watermark, add a watermark overlay to a cloned element
  let element = editorElement;
  if (watermark) {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    const clone = editorElement.cloneNode(true) as HTMLElement;
    wrapper.appendChild(clone);

    // Watermark overlay
    const wm = document.createElement("div");
    wm.textContent = watermark;
    wm.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      font-size: 60px; font-weight: bold; color: rgba(180,180,180,0.25);
      transform: rotate(-30deg); pointer-events: none;
      white-space: nowrap; z-index: 9999;
    `;
    wrapper.appendChild(wm);
    document.body.appendChild(wrapper);
    element = wrapper;

    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `${baseName}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
    };

    await html2pdf().set(opt).from(element).save();
    document.body.removeChild(wrapper);
    return;
  }

  const opt = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    filename: `${baseName}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
  };

  html2pdf().set(opt).from(element).save();
}

export async function exportToDocx(
  markdownContent: string,
  fileName = "untitled.md",
) {
  if (typeof document === "undefined") return;

  const docx = await import("docx");
  const { saveAs } = await import("file-saver");
  const baseName = fileName.replace(/\.(md|markdown)$/i, "");

  const { Document, Paragraph, TextRun, HeadingLevel, Packer } = docx;
  const lines = markdownContent.split("\n");
  const children: InstanceType<typeof Paragraph>[] = [];

  for (const line of lines) {
    if (line.startsWith("### ")) {
      children.push(
        new Paragraph({
          text: line.slice(4),
          heading: HeadingLevel.HEADING_3,
        }),
      );
    } else if (line.startsWith("## ")) {
      children.push(
        new Paragraph({
          text: line.slice(3),
          heading: HeadingLevel.HEADING_2,
        }),
      );
    } else if (line.startsWith("# ")) {
      children.push(
        new Paragraph({
          text: line.slice(2),
          heading: HeadingLevel.HEADING_1,
        }),
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      children.push(
        new Paragraph({
          text: line.slice(2),
          bullet: { level: 0 },
        }),
      );
    } else if (line.trim() === "") {
      children.push(new Paragraph({ text: "" }));
    } else {
      // Parse inline formatting
      const runs: InstanceType<typeof TextRun>[] = [];
      let remaining = line;

      while (remaining.length > 0) {
        const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
        const italicMatch = remaining.match(/^\*(.+?)\*/);
        const codeMatch = remaining.match(/^`(.+?)`/);

        if (boldMatch) {
          runs.push(new TextRun({ text: boldMatch[1], bold: true }));
          remaining = remaining.slice(boldMatch[0].length);
        } else if (italicMatch) {
          runs.push(new TextRun({ text: italicMatch[1], italics: true }));
          remaining = remaining.slice(italicMatch[0].length);
        } else if (codeMatch) {
          runs.push(
            new TextRun({
              text: codeMatch[1],
              font: "Courier New",
            }),
          );
          remaining = remaining.slice(codeMatch[0].length);
        } else {
          const nextSpecial = remaining.search(/[*`]/);
          if (nextSpecial === -1) {
            runs.push(new TextRun({ text: remaining }));
            remaining = "";
          } else {
            runs.push(
              new TextRun({ text: remaining.slice(0, nextSpecial) }),
            );
            remaining = remaining.slice(nextSpecial);
          }
        }
      }

      children.push(new Paragraph({ children: runs }));
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, `${baseName}.docx`);
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
