import type { EditorView } from "prosemirror-view";
import { editorSchema } from "./schema.js";

export function insertImage(
  view: EditorView,
  src: string,
  alt?: string,
  width?: number,
  height?: number,
) {
  const { schema } = view.state;
  const imageNode = schema.nodes.image.create({
    src,
    alt: alt || null,
    title: null,
    width: width || null,
    height: height || null,
  });

  const transaction = view.state.tr.replaceSelectionWith(imageNode);
  view.dispatch(transaction);
  view.focus();
}

export function handleImagePaste(
  view: EditorView,
  event: ClipboardEvent,
): boolean {
  const items = event.clipboardData?.items;
  if (!items) {
    return false;
  }

  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          insertImage(view, dataUrl, file.name);
        };
        reader.readAsDataURL(file);
        return true;
      }
    }
  }

  return false;
}

export function handleImageDrop(
  view: EditorView,
  event: DragEvent,
): boolean {
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) {
    return false;
  }

  const file = files[0];
  if (!file.type.startsWith("image/")) {
    return false;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result as string;
    insertImage(view, dataUrl, file.name);
  };
  reader.readAsDataURL(file);

  return true;
}
