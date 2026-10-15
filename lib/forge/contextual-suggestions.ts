import type { ForgeIntent } from "./contracts";

export type ForgeSuggestionContext = {
  mode: "learn" | "edit";
  courseDescription?: string | null;
  lessonTitle?: string;
  lessonWordCount?: number;
  hasLessonContent?: boolean;
  hasLessonObjectives?: boolean;
  moduleTitle?: string;
  moduleDurationShare?: number | null;
};

export type ForgeSuggestion = {
  id: string;
  title: string;
  explanation: string;
  evidence: string;
  target: string;
  intendedChange: string;
  action: ForgeIntent;
  actionLabel: string;
  application: "local_draft" | "conversation";
};

export function deriveForgeSuggestions(context: ForgeSuggestionContext): ForgeSuggestion[] {
  const suggestions: ForgeSuggestion[] = [];
  const target = context.lessonTitle ? `Leçon « ${context.lessonTitle} »` : `Parcours${context.moduleTitle ? ` · module « ${context.moduleTitle} »` : ""}`;

  if (context.mode === "edit" && context.lessonTitle && !context.hasLessonContent) {
    suggestions.push({
      id: "complete-lesson",
      title: "Compléter cette leçon",
      explanation: "Cette leçon ne contient pas encore de contenu. Forge peut préparer un brouillon à relire.",
      evidence: "Aucun contenu enregistré dans le brouillon.",
      target,
      intendedChange: "Générer une proposition de contenu, à appliquer explicitement au brouillon puis à sauvegarder.",
      action: "generate_content",
      actionLabel: "Préparer un brouillon",
      application: "local_draft",
    });
  }

  if (context.mode === "edit" && context.lessonTitle && context.hasLessonContent && context.hasLessonObjectives === false) {
    suggestions.push({
      id: "clarify-objectives",
      title: "Clarifier les objectifs",
      explanation: "Aucun objectif pédagogique n’est renseigné pour cette leçon.",
      evidence: "La liste d’objectifs est vide.",
      target,
      intendedChange: "Proposer des objectifs qui resteront à examiner avant leur application au brouillon.",
      action: "objectives",
      actionLabel: "Proposer des objectifs",
      application: "local_draft",
    });
  }

  if (context.mode === "edit" && context.lessonTitle && context.hasLessonContent && (context.lessonWordCount ?? 0) > 0 && (context.lessonWordCount ?? 0) < 60) {
    const wordCount = context.lessonWordCount ?? 0;
    suggestions.push({
      id: "enrich-short-lesson",
      title: "Enrichir cette leçon",
      explanation: "Un exemple ou une mise en pratique peut aider à rendre le contenu plus concret.",
      evidence: `${wordCount} mots dans le contenu actuel.`,
      target,
      intendedChange: "Préparer une proposition enrichie ; le contenu ne change qu’après examen et application.",
      action: "ask",
      actionLabel: "Discuter avec Forge",
      application: "conversation",
    });
  }

  if (context.moduleTitle && context.moduleDurationShare != null && context.moduleDurationShare > 0.35) {
    const share = Math.round(context.moduleDurationShare * 100);
    suggestions.push({
      id: "review-module-balance",
      title: "Examiner la durée du module",
      explanation: "Ce module représente une part importante de la durée estimée du parcours.",
      evidence: `Module « ${context.moduleTitle} » : ${share} % de la durée estimée.`,
      target: `Structure du parcours · module « ${context.moduleTitle} »`,
      intendedChange: "Discuter des options de rééquilibrage avec Forge ; aucune durée ni structure ne sera modifiée par le chat.",
      action: "ask",
      actionLabel: "Discuter avec Forge",
      application: "conversation",
    });
  }

  if (context.mode === "edit" && !context.lessonTitle && context.courseDescription != null && !context.courseDescription.trim()) {
    suggestions.push({
      id: "complete-course-description",
      title: "Compléter la présentation",
      explanation: "Le parcours ne comporte pas encore de description.",
      evidence: "Description du parcours absente.",
      target: "Présentation du parcours",
      intendedChange: "Préparer une proposition de description, à examiner avant application.",
      action: "summarize",
      actionLabel: "Proposer une description",
      application: "local_draft",
    });
  }

  return suggestions;
}
