import assert from "node:assert/strict";
import test from "node:test";
import { applyOpenedMarkdownFiles, type OpenedFileTabState } from "./openedFiles.js";
import { type OpenedMarkdownFile } from "../utils/desktopOpenFiles.js";

function createTab(overrides: Partial<OpenedFileTabState> = {}): OpenedFileTabState {
  return {
    id: "tab-1",
    fileName: "untitled.md",
    content: "# Draft",
    savedContent: "# Draft",
    updatedAt: 0,
    editorStateJSON: null,
    fileHandle: null,
    sourcePath: null,
    ...overrides,
  };
}

function createOpenedFile(overrides: Partial<OpenedMarkdownFile> = {}): OpenedMarkdownFile {
  return {
    path: "C:/notes/today.md",
    fileName: "today.md",
    content: "# Today",
    lastModified: 123,
    size: 8,
    ...overrides,
  };
}

test("applyOpenedMarkdownFiles replaces the initial disposable tab for startup opens", () => {
  const result = applyOpenedMarkdownFiles(
    [createTab()],
    [createOpenedFile()],
    (() => {
      let counter = 1;
      return () => `tab-${++counter}`;
    })(),
    { replaceInitialTab: true },
  );

  assert.equal(result.tabs.length, 1);
  assert.equal(result.tabs[0].id, "tab-2");
  assert.equal(result.tabs[0].fileName, "today.md");
  assert.equal(result.tabs[0].sourcePath, "C:/notes/today.md");
  assert.equal(result.activeTabId, "tab-2");
  assert.equal(result.openedFileName, "today.md");
});

test("applyOpenedMarkdownFiles keeps the current tabs and appends new files when requested later", () => {
  const result = applyOpenedMarkdownFiles(
    [createTab({ id: "tab-7", content: "# Working", savedContent: "# Saved" })],
    [createOpenedFile()],
    () => "tab-8",
  );

  assert.equal(result.tabs.length, 2);
  assert.equal(result.tabs[0].id, "tab-7");
  assert.equal(result.tabs[1].id, "tab-8");
  assert.equal(result.activeTabId, "tab-8");
});

test("applyOpenedMarkdownFiles activates an existing path match instead of duplicating the tab", () => {
  const result = applyOpenedMarkdownFiles(
    [createTab({ id: "tab-3", fileName: "today.md", sourcePath: "c:/notes/today.md" })],
    [createOpenedFile({ path: "C:/NOTES/TODAY.MD" })],
    () => "tab-4",
  );

  assert.equal(result.tabs.length, 1);
  assert.equal(result.activeTabId, "tab-3");
  assert.equal(result.openedFileName, "today.md");
});

test("applyOpenedMarkdownFiles refreshes an existing path match from the opened file snapshot", () => {
  const result = applyOpenedMarkdownFiles(
    [
      createTab({
        id: "tab-3",
        fileName: "today.md",
        content: "# Previous edit",
        savedContent: "# Previous edit",
        updatedAt: 100,
        sourcePath: "c:/notes/today.md",
      }),
    ],
    [createOpenedFile({ path: "C:/NOTES/TODAY.MD", content: "# Current file", lastModified: 200 })],
    () => "tab-4",
  );

  assert.equal(result.tabs.length, 1);
  assert.equal(result.activeTabId, "tab-3");
  assert.equal(result.tabs[0].content, "# Current file");
  assert.equal(result.tabs[0].savedContent, "# Current file");
  assert.equal(result.tabs[0].updatedAt, 200);
  assert.equal(result.tabs[0].editorStateJSON, null);
});
