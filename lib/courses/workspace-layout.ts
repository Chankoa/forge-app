export type ForgeRailState = "collapsed" | "docked" | "focus";
export type WorkspacePanel = "structure" | "forge";
export function toggleForgeRail(state: ForgeRailState): ForgeRailState { return state === "collapsed" ? "docked" : "collapsed"; }
export function focusForgeRail(state: ForgeRailState): ForgeRailState { return state === "focus" ? "docked" : "focus"; }
export function adjacentTab(index: number, key: string, count: number) {
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowRight") return (index + 1) % count;
  if (key === "ArrowLeft") return (index + count - 1) % count;
  return index;
}
