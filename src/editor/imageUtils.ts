import { TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

export function insertImage(
  view: EditorView,
  src: string,
  alt?: string,
  position?: number,
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

  let transaction = view.state.tr;
  if (typeof position === "number") {
    const insertPos = Math.max(0, Math.min(position, view.state.doc.content.size));
    transaction = transaction.setSelection(
      TextSelection.create(view.state.doc, insertPos),
    );
  }

  transaction = transaction.replaceSelectionWith(imageNode).scrollIntoView();
  view.dispatch(transaction);
  view.focus();
}

function getDropPosition(view: EditorView, event: DragEvent) {
  const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
  return coords?.pos;
}

function readImageFile(file: File, onLoad: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result;
    if (typeof result === "string") {
      onLoad(result);
    }
  };
  reader.readAsDataURL(file);
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
        readImageFile(file, (dataUrl) => {
          insertImage(view, dataUrl, file.name);
        });
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

  const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
  if (imageFiles.length === 0) {
    return false;
  }

  const dropPosition = getDropPosition(view, event);

  imageFiles.forEach((file, index) => {
    readImageFile(file, (dataUrl) => {
      const position = typeof dropPosition === "number" ? dropPosition + index : undefined;
      insertImage(view, dataUrl, file.name, position);
    });
  });

  return true;
}
