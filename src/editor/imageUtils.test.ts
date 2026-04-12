import assert from "node:assert/strict";
import test from "node:test";
import { isLikelyImageFile } from "./imageUtils.js";

test("isLikelyImageFile matches image mime type", () => {
  assert.equal(isLikelyImageFile({ name: "paste.bin", type: "image/png" }), true);
});

test("isLikelyImageFile matches Windows drag file extension when mime is empty", () => {
  assert.equal(isLikelyImageFile({ name: "photo.JPG", type: "" }), true);
  assert.equal(isLikelyImageFile({ name: "diagram.webp", type: "" }), true);
});

test("isLikelyImageFile rejects non-image files", () => {
  assert.equal(isLikelyImageFile({ name: "notes.txt", type: "" }), false);
});
