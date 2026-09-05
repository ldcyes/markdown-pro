import assert from "node:assert/strict";
import test from "node:test";
import { emit } from "@tauri-apps/api/event";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { applyOpenedMarkdownFiles, type OpenedFileTabState } from "../editor/openedFiles.js";
import { getStartupMarkdownFiles, listenForOpenedMarkdownFiles, type OpenedMarkdownFile } from "./desktopOpenFiles.js";

// These fixtures verify the shared IPC/editor path, not native OS integration.
for (const { platform, directory, usesStartupArguments } of [
  { platform: "Windows", directory: "C:/notes", usesStartupArguments: true },
  { platform: "Linux", directory: "/home/user/notes", usesStartupArguments: true },
  { platform: "macOS", directory: "/Users/user/notes", usesStartupArguments: false },
  { platform: "iOS", directory: "/var/mobile/Documents", usesStartupArguments: false },
]) {
  test(`file-open events switch the existing editor on ${platform}`, async () => {
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { crypto: globalThis.crypto },
    });
    const firstFile: OpenedMarkdownFile = {
      path: `${directory}/first.md`, fileName: "first.md", content: "# First file",
      lastModified: 1, size: 12,
    };
    const secondFile: OpenedMarkdownFile = {
      path: `${directory}/second.md`, fileName: "second.md", content: "# Second file",
      lastModified: 2, size: 13,
    };

    try {
      mockIPC((command) => {
        assert.equal(command, "get_startup_markdown_files");
        return usesStartupArguments ? [firstFile] : [];
      }, { shouldMockEvents: true });
      let tabId = 0;
      const createTabId = () => String(++tabId);
      let state = applyOpenedMarkdownFiles<OpenedFileTabState>([], await getStartupMarkdownFiles(), createTabId);
      const unlisten = await listenForOpenedMarkdownFiles((files) => {
        state = applyOpenedMarkdownFiles(state.tabs, files, createTabId);
      });

      if (!usesStartupArguments) {
        await emit("markdown-pro://open-files", [firstFile]);
      }
      assert.equal(state.tabs.find((tab) => tab.id === state.activeTabId)?.content, firstFile.content);

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
}
