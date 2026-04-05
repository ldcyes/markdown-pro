import assert from "node:assert/strict";
import test from "node:test";
import {
  clearDraft,
  DEFAULT_DRAFT_KEY,
  loadDraft,
  normalizeMarkdownFilename,
  readMarkdownFile,
  saveDraft,
} from "./fileSystem.js";

function createMemoryStorage() {
  const storage = new Map<string, string>();

  return {
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
    removeItem(key: string) {
      storage.delete(key);
    },
  };
}

test("normalizeMarkdownFilename appends a markdown extension and falls back to untitled", () => {
  assert.equal(normalizeMarkdownFilename(), "untitled.md");
  assert.equal(normalizeMarkdownFilename("notes"), "notes.md");
  assert.equal(normalizeMarkdownFilename("already.md"), "already.md");
});

test("saveDraft and loadDraft persist the latest markdown snapshot", () => {
  const storage = createMemoryStorage();

  saveDraft(
    storage,
    {
      content: "# Draft",
      fileName: "session-notes",
      updatedAt: 42,
    },
    DEFAULT_DRAFT_KEY,
  );

  assert.deepEqual(loadDraft(storage, DEFAULT_DRAFT_KEY), {
    content: "# Draft",
    fileName: "session-notes.md",
    updatedAt: 42,
  });

  clearDraft(storage, DEFAULT_DRAFT_KEY);

  assert.equal(loadDraft(storage, DEFAULT_DRAFT_KEY), null);
});

test("readMarkdownFile returns text content and metadata from a file-like object", async () => {
  const file = {
    lastModified: 1710000000000,
    name: "roadmap.markdown",
    size: 128,
    async text() {
      return "## Phase 1";
    },
  };

  assert.deepEqual(await readMarkdownFile(file), {
    content: "## Phase 1",
    fileName: "roadmap.markdown",
    lastModified: 1710000000000,
    size: 128,
  });
});
