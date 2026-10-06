import type { ForgeIntent, ForgeRailContext } from "./contracts";

export const lessonTransformActions: Array<{ intent: Extract<ForgeIntent, "structure" | "rephrase" | "simplify" | "summarize" | "objectives">; label: string }> = [
  { intent: "structure", label: "Structurer" },
  { intent: "rephrase", label: "Reformuler" },
  { intent: "simplify", label: "Simplifier" },
  { intent: "summarize", label: "Résumer" },
  { intent: "objectives", label: "Proposer des objectifs" },
];

export const forgeProposalStates = {
  generated: "Proposition générée",
  review: "À examiner",
  adjusted: "Ajustée",
  applied: "Appliquée au brouillon local",
  saved: "Sauvegardée",
  confirmed: "Création confirmée",
} as const;

export const forgeErrorMessages = {
  invalid_request: "Cette demande ne peut pas être traitée. Vérifiez le contexte puis réessayez.",
  unauthenticated: "Votre session a expiré. Reconnectez-vous puis réessayez.",
  forbidden: "Cette action n’est pas disponible pour ce parcours.",
  context_unavailable: "Le contexte du parcours est indisponible. Réessayez dans un instant.",
  source_unavailable: "Une ressource sélectionnée n’est plus disponible. Vérifiez votre sélection.",
  not_configured: "Forge est momentanément indisponible. Réessayez plus tard.",
  provider_auth: "Forge est momentanément indisponible. Réessayez plus tard.",
  provider_not_found: "Forge est momentanément indisponible. Réessayez plus tard.",
  provider_network: "Forge est momentanément inaccessible. Réessayez dans un instant.",
  provider_error: "Forge n’a pas pu terminer cette demande. Réessayez.",
  timeout: "Forge a mis trop de temps à répondre. Réessayez.",
  rate_limited: "La limite de générations est atteinte. Réessayez plus tard.",
  invalid_result: "La proposition est incomplète. Vous pouvez la régénérer.",
} as const;

export function forgeContextLabels(context: ForgeRailContext, selectedSourceCount: number, usableSourceCount: number): string[] {
  if (!context.lessonSlug) return ["Parcours", ...(selectedSourceCount ? [`${selectedSourceCount} source${selectedSourceCount > 1 ? "s" : ""} associée${selectedSourceCount > 1 ? "s" : ""}`] : [])];
  const sources = selectedSourceCount || usableSourceCount;
  return ["Parcours", "Module", ...(sources ? [`${Math.min(sources, 4)} source${Math.min(sources, 4) > 1 ? "s" : ""} associée${Math.min(sources, 4) > 1 ? "s" : ""}`] : [])];
}