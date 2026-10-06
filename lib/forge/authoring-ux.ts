import type { ForgeIntent, ForgeRailContext } from "./contracts";

export const lessonTransformActions: Array<{ intent: Extract<ForgeIntent, "structure" | "rephrase" | "simplify" | "summarize" | "objectives">; label: string }> = [
  { intent: "structure", label: "Structurer" },
  { intent: "rephrase", label: "Reformuler" },
  { intent: "simplify", label: "Simplifier" },
  { intent: "summarize", label: "Résumer" },
  { intent: "objectives", label: "Proposer des objectifs" },
];

export const forgeProposalStates = {
  generated: "Proposition à examiner",
  applied: "Proposition appliquée au brouillon local. Sauvegardez pour enregistrer.",
  saved: "Modifications sauvegardées.",
} as const;

export function forgeContextLabels(context: ForgeRailContext, selectedSourceCount: number, usableSourceCount: number): string[] {
  if (!context.lessonSlug) return ["Parcours", ...(selectedSourceCount ? [`${selectedSourceCount} source${selectedSourceCount > 1 ? "s" : ""} associée${selectedSourceCount > 1 ? "s" : ""}`] : [])];
  const sources = selectedSourceCount || usableSourceCount;
  return ["Parcours", "Module", ...(sources ? [`${Math.min(sources, 4)} source${Math.min(sources, 4) > 1 ? "s" : ""} associée${Math.min(sources, 4) > 1 ? "s" : ""}`] : [])];
}