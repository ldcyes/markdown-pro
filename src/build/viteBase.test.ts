import assert from "node:assert/strict";
import test from "node:test";
import { resolveViteBase } from "./viteBase.js";

test("resolveViteBase defaults to relative paths for packaged Tauri builds", () => {
  assert.equal(resolveViteBase({ GITHUB_ACTIONS: "true" }), "./");
  assert.equal(resolveViteBase({}), "./");
});

test("resolveViteBase allows an explicit hosted base for web artifacts", () => {
  assert.equal(resolveViteBase({ VITE_BASE_PATH: "/markdown-pro/" }), "/markdown-pro/");
});
