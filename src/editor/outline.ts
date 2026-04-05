import { Node as ProseMirrorNode } from "prosemirror-model";

export interface OutlineItem {
  id: string;
  level: number;
  position: number;
  text: string;
}

export interface OutlineTreeItem extends OutlineItem {
  children: OutlineTreeItem[];
}

function slugifyHeading(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractOutline(doc: ProseMirrorNode): OutlineItem[] {
  const outline: OutlineItem[] = [];
  const slugCounts = new Map<string, number>();

  doc.descendants((node, position) => {
    if (node.type.name !== "heading") {
      return true;
    }

    const baseSlug = slugifyHeading(node.textContent) || "section";
    const count = slugCounts.get(baseSlug) ?? 0;
    slugCounts.set(baseSlug, count + 1);

    outline.push({
      id: count === 0 ? baseSlug : `${baseSlug}-${count + 1}`,
      level: Number(node.attrs.level),
      position,
      text: node.textContent,
    });

    return true;
  });

  return outline;
}

export function buildOutlineTree(items: OutlineItem[]): OutlineTreeItem[] {
  const roots: OutlineTreeItem[] = [];
  const stack: OutlineTreeItem[] = [];

  for (const item of items) {
    const nextItem: OutlineTreeItem = {
      ...item,
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1]!.level >= nextItem.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(nextItem);
    } else {
      stack[stack.length - 1]!.children.push(nextItem);
    }

    stack.push(nextItem);
  }

  return roots;
}

export function findActiveOutlineId(
  items: OutlineItem[],
  position: number,
): string | null {
  let activeId: string | null = null;

  for (const item of items) {
    if (item.position > position) {
      break;
    }

    activeId = item.id;
  }

  return activeId;
}
