import type { CSSProperties, ReactElement } from "react";
import type { OutlineTreeItem } from "./outline.js";

interface OutlineSidebarProps {
  activeId: string | null;
  items: OutlineTreeItem[];
  onSelect: (item: OutlineTreeItem) => void;
}

function renderOutlineItems(
  items: OutlineTreeItem[],
  activeId: string | null,
  onSelect: (item: OutlineTreeItem) => void,
  depth = 0,
): ReactElement[] {
  return items.map((item) => {
    const style = {
      "--outline-depth": depth,
    } as CSSProperties;

    return (
      <li key={item.id} className="editor__outline-item">
        <button
          type="button"
          className={`editor__outline-button${item.id === activeId ? " editor__outline-button--active" : ""}`}
          style={style}
          onClick={() => onSelect(item)}
        >
          <span>{item.text}</span>
        </button>
        {item.children.length > 0 ? (
          <ul className="editor__outline-list">
            {renderOutlineItems(item.children, activeId, onSelect, depth + 1)}
          </ul>
        ) : null}
      </li>
    );
  });
}

export function OutlineSidebar({
  activeId,
  items,
  onSelect,
}: OutlineSidebarProps) {
  return (
    <aside className="editor__sidebar" aria-label="Document outline" style={{ height: "100%" }}>
      <div className="editor__sidebar-header">
        <span className="editor__sidebar-label">Outline</span>
        <p className="editor__sidebar-copy">Navigate headings</p>
      </div>
      {items.length > 0 ? (
        <ul className="editor__outline-list">
          {renderOutlineItems(items, activeId, onSelect)}
        </ul>
      ) : (
        <p className="editor__outline-empty">Add headings to build the outline.</p>
      )}
    </aside>
  );
}
