import assert from "node:assert/strict";
import test from "node:test";
import { markdownToProseMirror, proseMirrorToMarkdown } from "./markdown-parser.js";
import { editorSchema } from "./schema.js";

test("parses inline math with single dollar sign", () => {
  const markdown = "Here is an equation: $E = mc^2$";
  const doc = markdownToProseMirror(markdown);

  let mathCount = 0;
  doc.descendants((node) => {
    if (node.type.name === "math_inline") {
      mathCount++;
      assert.equal(node.attrs.content, "E = mc^2");
    }
  });

  assert.equal(mathCount, 1);
});

test("parses block math with double dollar signs", () => {
  const markdown = "Here is a block equation:\n\n$$E = mc^2$$\n\nEnd.";
  const doc = markdownToProseMirror(markdown);

  let mathCount = 0;
  doc.descendants((node) => {
    if (node.type.name === "math_block") {
      mathCount++;
      assert.equal(node.attrs.content.trim(), "E = mc^2");
    }
  });

  assert.equal(mathCount, 1);
});

test("parses mermaid diagrams", () => {
  const markdown = "```mermaid\ngraph TD\nA-->B\n```";
  const doc = markdownToProseMirror(markdown);

  let mermaidCount = 0;
  doc.descendants((node) => {
    if (node.type.name === "mermaid") {
      mermaidCount++;
      assert.equal(node.attrs.content.trim(), "graph TD\nA-->B");
    }
  });

  assert.equal(mermaidCount, 1);
});

test("serializes inline math back to markdown", () => {
  const markdown = "The formula $E = mc^2$ is famous.";
  const doc = markdownToProseMirror(markdown);
  const serialized = proseMirrorToMarkdown(doc);

  assert.ok(serialized.includes("$E = mc^2$"));
});

test("serializes block math back to markdown", () => {
  const markdown = "$$E = mc^2$$";
  const doc = markdownToProseMirror(markdown);
  const serialized = proseMirrorToMarkdown(doc);

  assert.ok(serialized.includes("$$"));
  assert.ok(serialized.includes("E = mc^2"));
});

test("serializes mermaid diagrams back to markdown", () => {
  const markdown = "```mermaid\ngraph TD\nA-->B\n```";
  const doc = markdownToProseMirror(markdown);
  const serialized = proseMirrorToMarkdown(doc);

  assert.ok(serialized.includes("```mermaid"));
  assert.ok(serialized.includes("graph TD"));
  assert.ok(serialized.includes("A-->B"));
});

test("supports multiple inline math expressions", () => {
  const markdown = "First: $a^2$ Second: $b^2$ Third: $c^2$";
  const doc = markdownToProseMirror(markdown);

  const formulas: string[] = [];
  doc.descendants((node) => {
    if (node.type.name === "math_inline") {
      formulas.push(node.attrs.content);
    }
  });

  assert.deepEqual(formulas, ["a^2", "b^2", "c^2"]);
});

test("handles complex LaTeX in block math", () => {
  const markdown = "$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$";
  const doc = markdownToProseMirror(markdown);

  let found = false;
  doc.descendants((node) => {
    if (node.type.name === "math_block") {
      found = true;
      assert.ok(node.attrs.content.includes("\\int"));
      assert.ok(node.attrs.content.includes("\\pi"));
    }
  });

  assert.equal(found, true);
});
