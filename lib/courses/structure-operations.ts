export type OrderedItem = { id: string; display_order: number };
export type MoveDirection = "up" | "down";

export function nextDisplayOrder(rows: Array<{ display_order: number }> | null): number {
  return rows?.length ? Math.max(...rows.map((row) => row.display_order)) + 1 : 0;
}

export function adjacentSwap(rows: OrderedItem[], id: string, direction: MoveDirection) {
  if (direction !== "up" && direction !== "down") throw new Error("Déplacement invalide.");
  const index = rows.findIndex((row) => row.id === id);
  const neighbor = rows[index + (direction === "up" ? -1 : 1)];
  if (index < 0 || !neighbor) throw new Error("Ce déplacement n’est pas possible.");
  const current = rows[index];
  if (current.display_order === neighbor.display_order) throw new Error("L’ordre actuel est incohérent. Actualisez la page.");
  return { current, neighbor };
}

export function emptyModuleBlocker(lessonCount: number | null, resourceCount: number | null): string | null {
  if (lessonCount == null || resourceCount == null) return "Les dépendances du module n’ont pas pu être vérifiées.";
  if (lessonCount > 0) return "Déplacez d’abord les leçons de ce module.";
  if (resourceCount > 0) return "Détachez d’abord les ressources de ce module.";
  return null;
}

export function inlineRenameKey(key: string): "save" | "cancel" | null {
  return key === "Enter" ? "save" : key === "Escape" ? "cancel" : null;
}
