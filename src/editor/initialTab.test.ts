import assert from "node:assert/strict";
import test from "node:test";
import { createBlankEditorTab } from "./initialTab.js";

test("createBlankEditorTab starts a normal app launch with an empty untitled file", () => {
  const tab = createBlankEditorTab(() => "tab-1");

  assert.deepEqual(tab, {
    id: "tab-1",
    fileName: "untitled.md",
    content: "",
    savedContent: "",
    updatedAt: 0,
    editorStateJSON: null,
    fileHandle: null,
    sourcePath: null,
  });
});
