import assert from "node:assert/strict";
import test from "node:test";
import { editorSchema } from "./schema.js";
import {
  buildOutlineTree,
  extractOutline,
  findActiveOutlineId,
} from "./outline.js";

test("extractOutline returns heading text, level, id, and document position", () => {
  const doc = editorSchema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Intro" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Body copy" }],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Details" }],
      },
    ],
  });

  assert.deepEqual(extractOutline(doc), [
    {
      id: "intro",
      level: 1,
      position: 0,
      text: "Intro",
    },
    {
      id: "details",
      level: 2,
      position: 18,
      text: "Details",
    },
  ]);
});

test("buildOutlineTree nests headings beneath the nearest shallower parent", () => {
  const tree = buildOutlineTree([
    { id: "intro", level: 1, position: 0, text: "Intro" },
    { id: "setup", level: 2, position: 10, text: "Setup" },
    { id: "advanced", level: 3, position: 20, text: "Advanced" },
    { id: "api", level: 2, position: 30, text: "API" },
    { id: "appendix", level: 1, position: 40, text: "Appendix" },
  ]);

  assert.deepEqual(tree, [
    {
      id: "intro",
      level: 1,
      position: 0,
      text: "Intro",
      children: [
        {
          id: "setup",
          level: 2,
          position: 10,
          text: "Setup",
          children: [
            {
              id: "advanced",
              level: 3,
              position: 20,
              text: "Advanced",
              children: [],
            },
          ],
        },
        {
          id: "api",
          level: 2,
          position: 30,
          text: "API",
          children: [],
        },
      ],
    },
    {
      id: "appendix",
      level: 1,
      position: 40,
      text: "Appendix",
      children: [],
    },
  ]);
});

test("findActiveOutlineId returns the closest heading at or before the cursor", () => {
  const items = [
    { id: "intro", level: 1, position: 0, text: "Intro" },
    { id: "setup", level: 2, position: 10, text: "Setup" },
    { id: "api", level: 2, position: 30, text: "API" },
  ];

  assert.equal(findActiveOutlineId(items, 0), "intro");
  assert.equal(findActiveOutlineId(items, 18), "setup");
  assert.equal(findActiveOutlineId(items, 999), "api");
});
