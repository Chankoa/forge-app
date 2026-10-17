"use client";

import type { CourseDetail } from "@/lib/courses/contracts";
import type { CourseTarget } from "@/lib/forge/orchestrator/contracts";
import { useCoursePlan } from "./CoursePlanContext";
import { CoursePlanReview } from "./CoursePlanReview";

export function courseTargetLabel(course: CourseDetail, target: CourseTarget) {
  if (target.kind === "course") return `Parcours · ${course.title}`;
  const courseModule = course.outline.find((item) => item.id === (target.kind === "module" ? target.id : target.moduleId));
  return target.kind === "module" ? `Module · ${courseModule?.moduleTitle ?? "Indisponible"}` : `Leçon · ${courseModule?.lessons.find((lesson) => lesson.id === target.id)?.title ?? "Indisponible"}`;
}
const evidenceLabels = { title: "Titre", description: "Description", objectives: "Objectifs", lessonCount: "Nombre de leçons", contentLength: "Caractères de contenu", durationMinutes: "Durée en minutes", sourceCount: "Nombre de sources" };
export function CurriculumAnalysis({ course }: { course: CourseDetail }) {
  const workflow = useCoursePlan();
  return <section className="intelligence-section course-plan" aria-label="Analyse du parcours" aria-busy={workflow.pending}>
    <h3>Analyse du parcours</h3>
    <p>Forge examine les titres, objectifs, durées et la présence de contenu. Le texte des leçons n’est pas transmis. Les propositions restent à examiner.</p>
    <button type="button" className="button button--secondary" disabled={workflow.pending} onClick={() => workflow.generate()}>{workflow.pending ? "Préparation du plan…" : workflow.data ? "Relancer l’analyse du parcours" : "Analyser le parcours"}</button>
    {workflow.message && <p role="status">{workflow.message}</p>}
    {workflow.data && <>
      <section aria-label="Constats et éléments observés">{workflow.data.analysis.observations.length === 0 && <p>Forge n’a pas identifié de modification structurelle prioritaire.</p>}{workflow.data.analysis.observations.map((observation) => <article className="intelligence-finding" key={observation.id}>
        <p className="eyebrow">{observation.severity === "important" ? "Prioritaire" : observation.severity === "attention" ? "Attention" : "À examiner"}</p>
        <h4>{observation.title}</h4><p className="caption">{courseTargetLabel(course, observation.target)}</p>
        <strong>Pourquoi c’est important</strong><p>{observation.explanation}</p>
        <strong>Éléments observés</strong><ul>{observation.evidence.map((evidence, index) => <li key={index}>{courseTargetLabel(course, evidence.target)} — {evidenceLabels[evidence.field]} : {evidence.value || "Non renseigné"}</li>)}</ul>
        <strong>Actions possibles</strong><ul>{observation.possibleActions.map((action, index) => <li key={index}>{action}</li>)}</ul>
      </article>)}</section>
      <CoursePlanReview data={workflow.data} pending={workflow.pending} consumed={workflow.consumed} report={workflow.report?.data ?? null} targetLabel={(target) => courseTargetLabel(course, target)} onUpdate={workflow.update} onSelectAll={workflow.selectAll} onApply={workflow.apply} onRevise={workflow.generate} />
    </>}
  </section>;
}
