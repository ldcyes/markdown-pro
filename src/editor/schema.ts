import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { tableNodes } from "prosemirror-tables";

const nodes = addListNodes(
  basicSchema.spec.nodes,
  "paragraph block*",
  "block",
).append(
  tableNodes({
    tableGroup: "block",
    cellContent: "block+",
    cellAttributes: {},
  }),
);

export const editorSchema = new Schema({
  nodes,
  marks: basicSchema.spec.marks,
});
