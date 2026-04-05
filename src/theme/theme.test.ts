import assert from "node:assert/strict";
import test from "node:test";
import {
  persistTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
} from "./theme.js";

function createMemoryStorage() {
  const storage = new Map<string, string>();

  return {
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
  };
}

test("resolveTheme prefers an explicit stored theme", () => {
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("light", true), "light");
});

test("resolveTheme falls back to system preference when storage is empty or invalid", () => {
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme("invalid", false), "light");
});

test("persistTheme stores the current mode under the theme key", () => {
  const storage = createMemoryStorage();

  persistTheme(storage, "dark");

  assert.equal(storage.getItem(THEME_STORAGE_KEY), "dark");
});
