import assert from "node:assert/strict";
import test from "node:test";
import { markdownToProseMirror, proseMirrorToMarkdown } from "./markdown-parser.js";
import { editorSchema } from "./schema.js";

test("parses inline images with alt text", () => {
  const markdown = "Here is an image: ![Alt text](https://example.com/image.png)";
  const doc = markdownToProseMirror(markdown);

  let imageCount = 0;
  doc.descendants((node) => {
    if (node.type.name === "image") {
      imageCount++;
      assert.equal(node.attrs.src, "https://example.com/image.png");
      assert.equal(node.attrs.alt, "Alt text");
    }
  });

  assert.equal(imageCount, 1);
});

test("parses images with title", () => {
  const markdown = '![Image](https://example.com/img.png "Image title")';
  const doc = markdownToProseMirror(markdown);

  let found = false;
  doc.descendants((node) => {
    if (node.type.name === "image") {
      found = true;
      assert.equal(node.attrs.src, "https://example.com/img.png");
      assert.equal(node.attrs.alt, "Image");
      assert.equal(node.attrs.title, "Image title");
    }
  });

  assert.equal(found, true);
});

test("serializes images back to markdown", () => {
  const markdown = "![Alt](https://example.com/img.png)";
  const doc = markdownToProseMirror(markdown);
  const serialized = proseMirrorToMarkdown(doc);

  assert.equal(serialized, "![Alt](https://example.com/img.png)");
});

test("serializes images with title", () => {
  const markdown = '![Alt](https://example.com/img.png "Title")';
  const doc = markdownToProseMirror(markdown);
  const serialized = proseMirrorToMarkdown(doc);

  assert.equal(serialized, '![Alt](https://example.com/img.png "Title")');
});

test("supports multiple images in a paragraph", () => {
  const markdown = "First: ![One](img1.png) Second: ![Two](img2.png)";
  const doc = markdownToProseMirror(markdown);

  const images: string[] = [];
  doc.descendants((node) => {
    if (node.type.name === "image") {
      images.push(node.attrs.src);
    }
  });

  assert.deepEqual(images, ["img1.png", "img2.png"]);
});
