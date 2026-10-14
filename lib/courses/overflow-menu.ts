export type MenuAnchor = { top: number; right: number; bottom: number; left: number };

export function positionCourseOverflowMenu(anchor: MenuAnchor, viewport: { width: number; height: number }, menu = { width: 230, height: 104, gap: 8 }) {
  const left = Math.min(Math.max(menu.gap, anchor.right - menu.width), viewport.width - menu.width - menu.gap);
  const opensBelow = anchor.bottom + menu.gap + menu.height <= viewport.height;
  return {
    left,
    top: opensBelow ? anchor.bottom + menu.gap : Math.max(menu.gap, anchor.top - menu.height - menu.gap),
  };
}
