import { type MarkdownFileSnapshot } from "./fileSystem.js";

export interface OpenedMarkdownFile extends MarkdownFileSnapshot {
  path: string;
}

const OPEN_MARKDOWN_FILES_EVENT = "markdown-pro://open-files";
const GET_STARTUP_MARKDOWN_FILES_COMMAND = "get_startup_markdown_files";

export async function getStartupMarkdownFiles(): Promise<OpenedMarkdownFile[]> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<OpenedMarkdownFile[]>(GET_STARTUP_MARKDOWN_FILES_COMMAND);
  } catch {
    return [];
  }
}

export async function listenForOpenedMarkdownFiles(
  onOpen: (files: OpenedMarkdownFile[]) => void,
): Promise<() => void> {
  try {
    const { listen } = await import("@tauri-apps/api/event");
    return await listen<OpenedMarkdownFile[]>(OPEN_MARKDOWN_FILES_EVENT, (event) => {
      onOpen(event.payload);
    });
  } catch {
    return () => {};
  }
}
