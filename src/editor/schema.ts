import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";

const nodes = addListNodes(basicSchema.spec.nodes, "paragraph block*", "block");

export const editorSchema = new Schema({
  nodes,
  marks: basicSchema.spec.marks,
});
