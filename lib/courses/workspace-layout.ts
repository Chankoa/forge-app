export type ForgeRailState = "collapsed" | "default" | "expanded";
export type WorkspacePanel = "structure" | "forge";
export function toggleForgeRail(state: ForgeRailState): ForgeRailState { return state === "collapsed" ? "default" : "collapsed"; }
export function expandForgeRail(state: ForgeRailState): ForgeRailState { return state === "expanded" ? "default" : "expanded"; }
export function adjacentTab(index: number, key: string, count: number) {
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowRight") return (index + 1) % count;
  if (key === "ArrowLeft") return (index + count - 1) % count;
  return index;
}
