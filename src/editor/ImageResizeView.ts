import type { Node as ProseMirrorNode } from "prosemirror-model";
import { NodeSelection } from "prosemirror-state";
import type { EditorView, NodeView } from "prosemirror-view";

/**
 * Custom ProseMirror NodeView for images that provides drag-to-resize handles.
 * Maintains aspect ratio during resize.
 */
export class ImageResizeView implements NodeView {
  dom: HTMLElement;
  img: HTMLImageElement;
  handle: HTMLElement;
  cropHandleX: HTMLElement;
  cropHandleY: HTMLElement;

  private aspectRatio = 1;
  private readonly view: EditorView;
  private readonly getPos: () => number | undefined;
  private readonly onSelectNode = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest(".image-resize-handle, .image-crop-handle")) {
      return;
    }

    const pos = this.getPos();
    if (pos == null) {
      return;
    }

    const { state } = this.view;
    const selection = state.selection;
    if (selection instanceof NodeSelection && selection.from === pos) {
      return;
    }

    this.view.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)));
  };
  private readonly onDragStart = (event: DragEvent) => {
    this.onSelectNode(event as unknown as MouseEvent);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "copyMove";
      event.dataTransfer.setData("text/plain", this.img.alt || this.img.src);
    }
  };

  constructor(node: ProseMirrorNode, view: EditorView, getPos: () => number | undefined) {
    this.view = view;
    this.getPos = getPos;

    // Wrapper
    this.dom = document.createElement("span");
    this.dom.classList.add("image-resize-wrapper");
    this.dom.contentEditable = "false";
    this.dom.draggable = true;
    this.dom.addEventListener("mousedown", this.onSelectNode);
    this.dom.addEventListener("dragstart", this.onDragStart);

    // Image
    this.img = document.createElement("img");
    this.img.src = (node.attrs.src as string) || "";
    this.img.alt = (node.attrs.alt as string) || "";
    if (node.attrs.title) this.img.title = node.attrs.title as string;

    const w = node.attrs.width as string | null;
    const h = node.attrs.height as string | null;
    if (w) this.img.style.width = typeof w === "number" ? `${w}px` : w;
    if (h) this.img.style.height = typeof h === "number" ? `${h}px` : h;

    this.img.onload = () => {
      if (this.img.naturalWidth && this.img.naturalHeight) {
        this.aspectRatio = this.img.naturalWidth / this.img.naturalHeight;
      }
    };

    // Resize handle (bottom-right corner)
    this.handle = document.createElement("span");
    this.handle.classList.add("image-resize-handle");
    this.handle.addEventListener("mousedown", this.onMouseDown);

    // Crop handle X (right edge) - crop from right
    this.cropHandleX = document.createElement("span");
    this.cropHandleX.classList.add("image-crop-handle", "image-crop-handle--x");
    this.cropHandleX.addEventListener("mousedown", this.onCropX);

    // Crop handle Y (bottom edge) - crop from bottom
    this.cropHandleY = document.createElement("span");
    this.cropHandleY.classList.add("image-crop-handle", "image-crop-handle--y");
    this.cropHandleY.addEventListener("mousedown", this.onCropY);

    this.dom.appendChild(this.img);
    this.dom.appendChild(this.handle);
    this.dom.appendChild(this.cropHandleX);
    this.dom.appendChild(this.cropHandleY);
  }

  private onMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = this.img.offsetWidth;

    // Capture aspect ratio from current dimensions if not from natural
    if (this.img.naturalWidth && this.img.naturalHeight) {
      this.aspectRatio = this.img.naturalWidth / this.img.naturalHeight;
    }

    const onMouseMove = (ev: MouseEvent) => {
      const diff = ev.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      const newHeight = Math.round(newWidth / this.aspectRatio);
      this.img.style.width = `${newWidth}px`;
      this.img.style.height = `${newHeight}px`;
    };

    const onMouseUp = (ev: MouseEvent) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      const diff = ev.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      const newHeight = Math.round(newWidth / this.aspectRatio);

      // Commit the new size to ProseMirror
      const pos = this.getPos();
      if (pos == null) return;
      const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
        ...this.view.state.doc.nodeAt(pos)?.attrs,
        width: `${newWidth}px`,
        height: `${newHeight}px`,
      });
      this.view.dispatch(tr);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  /** Crop from the right edge (X direction) */
  private onCropX = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = this.img.offsetWidth;
    const startHeight = this.img.offsetHeight;

    // Visual feedback: clip the image
    const onMouseMove = (ev: MouseEvent) => {
      const diff = ev.clientX - startX;
      const newCropWidth = Math.max(30, startWidth + diff);
      this.dom.style.width = `${newCropWidth}px`;
      this.dom.style.overflow = "hidden";
    };

    const onMouseUp = (ev: MouseEvent) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      this.dom.style.width = "";
      this.dom.style.overflow = "";

      const diff = ev.clientX - startX;
      const newCropWidth = Math.max(30, startWidth + diff);
      this.applyCrop(newCropWidth, startHeight);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  /** Crop from the bottom edge (Y direction) */
  private onCropY = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startY = e.clientY;
    const startWidth = this.img.offsetWidth;
    const startHeight = this.img.offsetHeight;

    const onMouseMove = (ev: MouseEvent) => {
      const diff = ev.clientY - startY;
      const newCropHeight = Math.max(30, startHeight + diff);
      this.dom.style.height = `${newCropHeight}px`;
      this.dom.style.overflow = "hidden";
    };

    const onMouseUp = (ev: MouseEvent) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      this.dom.style.height = "";
      this.dom.style.overflow = "";

      const diff = ev.clientY - startY;
      const newCropHeight = Math.max(30, startHeight + diff);
      this.applyCrop(startWidth, newCropHeight);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  /** Apply a crop by drawing the visible portion onto a canvas and replacing the src */
  private applyCrop(cropWidth: number, cropHeight: number) {
    const canvas = document.createElement("canvas");
    const img = this.img;
    const scaleX = img.naturalWidth / img.offsetWidth;
    const scaleY = img.naturalHeight / img.offsetHeight;

    canvas.width = Math.round(cropWidth * scaleX);
    canvas.height = Math.round(cropHeight * scaleY);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      img,
      0, 0,
      canvas.width, canvas.height,
      0, 0,
      canvas.width, canvas.height,
    );

    const croppedSrc = canvas.toDataURL("image/png");
    const pos = this.getPos();
    if (pos == null) return;

    const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
      ...this.view.state.doc.nodeAt(pos)?.attrs,
      src: croppedSrc,
      width: `${cropWidth}px`,
      height: `${cropHeight}px`,
    });
    this.view.dispatch(tr);
  }

  update(node: ProseMirrorNode): boolean {
    if (node.type.name !== "image") return false;
    this.img.src = (node.attrs.src as string) || "";
    this.img.alt = (node.attrs.alt as string) || "";
    if (node.attrs.title) this.img.title = node.attrs.title as string;

    const w = node.attrs.width as string | null;
    const h = node.attrs.height as string | null;
    this.img.style.width = w ? (typeof w === "number" ? `${w}px` : w) : "";
    this.img.style.height = h ? (typeof h === "number" ? `${h}px` : h) : "";
    return true;
  }

  selectNode() {
    this.dom.classList.add("ProseMirror-selectednode");
  }

  deselectNode() {
    this.dom.classList.remove("ProseMirror-selectednode");
  }

  stopEvent(event: Event) {
    const target = event.target as HTMLElement | null;
    return Boolean(target?.closest(".image-resize-handle, .image-crop-handle"));
  }

  ignoreMutation() {
    return true;
  }

  destroy() {
    this.dom.removeEventListener("mousedown", this.onSelectNode);
    this.dom.removeEventListener("dragstart", this.onDragStart);
    this.handle.removeEventListener("mousedown", this.onMouseDown);
    this.cropHandleX.removeEventListener("mousedown", this.onCropX);
    this.cropHandleY.removeEventListener("mousedown", this.onCropY);
  }
}
