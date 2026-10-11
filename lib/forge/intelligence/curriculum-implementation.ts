import type { CurriculumResult } from "./contracts";

type Finding = CurriculumResult["findings"][number];

export const pedagogicalConsequences: Record<Finding["type"], string> = {
  redundancy: "La répétition peut ralentir la progression sans apporter de nouvel apprentissage.",
  gap: "Une notion ou un prérequis absent peut freiner la compréhension des leçons suivantes.",
  sequence_issue: "L’ordre actuel peut demander une connaissance que l’apprenant n’a pas encore acquise.",
  imbalance: "Une charge inégale peut rendre la progression plus difficile à suivre.",
  objective_gap: "Un objectif peu couvert rend le résultat attendu plus difficile à atteindre et à vérifier.",
  scope_issue: "Un périmètre trop large peut diluer le résultat d’apprentissage visé.",
  consolidation_opportunity: "Des intitulés proches peuvent brouiller la différence entre les étapes.",
};

export function curriculumImplementationAction(finding: Finding, lessons: Map<string, { slug: string }>, courseSlug: string) {
  if (finding.type !== "objective_gap") return null;
  const target = finding.lessonIds.map((id) => lessons.get(id)).find(Boolean);
  return target ? { label: "Modifier l’objectif", href: `/app/courses/${courseSlug}/lessons/${target.slug}?mode=edit&focus=objectives` } : null;
}
