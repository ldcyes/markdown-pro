import assert from "node:assert/strict";
import test from "node:test";
import { emit } from "@tauri-apps/api/event";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { applyOpenedMarkdownFiles, type OpenedFileTabState } from "../editor/openedFiles.js";
import { getStartupMarkdownFiles, listenForOpenedMarkdownFiles, type OpenedMarkdownFile } from "./desktopOpenFiles.js";

// Tauri's IPC boundary needs a window in the Node test runner.
test("opening another file delivers it to the existing editor and activates its tab", async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { crypto: globalThis.crypto },
  });
  const firstFile: OpenedMarkdownFile = {
    path: "C:/notes/first.md", fileName: "first.md", content: "# First file",
    lastModified: 1, size: 12,
  };
  const secondFile: OpenedMarkdownFile = {
    path: "C:/notes/second.md", fileName: "second.md", content: "# Second file",
    lastModified: 2, size: 13,
  };

  try {
    mockIPC((command) => {
      assert.equal(command, "get_startup_markdown_files");
      return [firstFile];
    }, { shouldMockEvents: true });
    let tabId = 0;
    const createTabId = () => String(++tabId);
    let state = applyOpenedMarkdownFiles<OpenedFileTabState>([], await getStartupMarkdownFiles(), createTabId);
    const unlisten = await listenForOpenedMarkdownFiles((files) => {
      state = applyOpenedMarkdownFiles(state.tabs, files, createTabId);
    });

    await emit("markdown-pro://open-files", [secondFile]);
    assert.equal(state.tabs.length, 2);
    assert.equal(state.tabs[0].content, firstFile.content);
    assert.equal(state.tabs.find((tab) => tab.id === state.activeTabId)?.content, secondFile.content);

    await emit("markdown-pro://open-files", [firstFile]);
    assert.equal(state.tabs.length, 2);
    assert.equal(state.tabs.find((tab) => tab.id === state.activeTabId)?.sourcePath, firstFile.path);

    await unlisten();
  } finally {
    clearMocks();
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});
