import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

interface Capability {
  windows?: string[];
  local?: boolean;
  permissions: string[];
}

test("the main window can subscribe to files opened by a second desktop instance", () => {
  const config = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
  const capabilities: Capability[] = config.app.security.capabilities ?? [];
  const permissions = capabilities
    .filter((capability) => capability.local !== false && capability.windows?.includes("main"))
    .flatMap((capability) => capability.permissions);

  assert.ok(permissions.includes("core:event:allow-listen"),
    "The main window needs event listening permission to receive a second file");
  assert.ok(permissions.includes("core:event:allow-unlisten"),
    "The main window needs event cleanup permission when the editor unmounts");
});
