import type { LessonDraft } from "@/lib/courses/lesson-draft";

export type LessonAnalysisSnapshot = { draft: LessonDraft; savedDraft: LessonDraft; saving: boolean };

export const lessonAnalysisMessages = {
  unsaved: "Modifications non sauvegardées. Sauvegardez la leçon avant de lancer Forge AI.",
  saving: "Sauvegarde en cours. Attendez sa confirmation avant de lancer Forge AI.",
  unavailable: "L’éditeur de la leçon n’est pas encore disponible.",
  ready: "Analyse disponible sur la version sauvegardée de la leçon.",
  stale: "Proposition obsolète. La leçon a changé depuis cette proposition. Sauvegardez si nécessaire, puis relancez l’analyse.",
};

export function lessonAnalysisState(snapshot: LessonAnalysisSnapshot) {
  const fingerprint = JSON.stringify(snapshot.draft);
  const dirty = fingerprint !== JSON.stringify(snapshot.savedDraft);
  return { fingerprint, dirty, saving: snapshot.saving,
    blockedReason: snapshot.saving ? lessonAnalysisMessages.saving : dirty ? lessonAnalysisMessages.unsaved : null };
}

export function lessonResultIsStale(baseline: string | null, current: { fingerprint: string } | null) {
  return baseline !== null && baseline !== current?.fingerprint;
}
