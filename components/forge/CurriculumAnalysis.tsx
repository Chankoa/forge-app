"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { analyzeCurriculumAction } from "@/app/app/forge/intelligence-actions";
import type { CourseDetail } from "@/lib/courses/contracts";
import { curriculumStateAfterResponse, type CurriculumViewState } from "@/lib/forge/intelligence/view-state";

const types = { redundancy: "Redondance", gap: "Prérequis ou notion manquante", sequence_issue: "Ordre pédagogique", imbalance: "Équilibre", objective_gap: "Objectif peu couvert", scope_issue: "Périmètre", consolidation_opportunity: "Regroupement possible" };
const severity = { info: "À examiner", attention: "Attention", important: "Prioritaire" };

export function CurriculumAnalysis({ course }: { course: CourseDetail }) {
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const [state, setState] = useState<CurriculumViewState>({ result: null, status: "idle" });
  const { result } = state;
  const modules = new Map(course.outline.map((module) => [module.id, module]));
  const lessons = new Map(course.outline.flatMap((module) => module.lessons.map((lesson) => [lesson.id, { ...lesson, moduleId: module.id }] as const)));
  function analyze() {
    if (inFlight.current) return;
    inFlight.current = true;
    setState((previous) => ({ ...previous, status: previous.result ? "ready" : "idle" }));
    startTransition(async () => {
      try {
        const response = await analyzeCurriculumAction(course.id);
        setState((previous) => curriculumStateAfterResponse(previous, response));
      } catch {
        setState((previous) => curriculumStateAfterResponse(previous, { ok: false, error: "provider_error" }));
      } finally {
        inFlight.current = false;
      }
    });
  }
  return <section className="intelligence-section" aria-labelledby="curriculum-heading" aria-busy={pending}><div className="section-heading"><div><p className="eyebrow">Forge · Architecte du cursus</p><h3 id="curriculum-heading">Analyse de la structure</h3></div></div>
    <p>Forge examine titres, objectifs et résumés. Ses constats sont des suggestions ; aucune modification n’est appliquée.</p>
    <button type="button" className="button button--secondary" disabled={pending} onClick={analyze}>{pending ? "Analyse en cours…" : state.status === "incomplete" || state.status === "unavailable" ? "Réessayer l’analyse" : result ? "Relancer l’analyse" : "Analyser la structure"}</button>
    {pending && <p role="status" aria-live="polite">Analyse en cours…</p>}
    {state.status === "incomplete" && <p role="alert" className="form-error">L’analyse n’a pas pu être générée complètement. Vous pouvez réessayer.</p>}
    {state.status === "unavailable" && <p role="alert" className="form-error">L’analyse est indisponible pour le moment. Vous pouvez réessayer.</p>}
    {result && <div className="intelligence-results">
      <p role="status">{!pending && state.status === "ready" ? "Analyse prête. " : "Dernière analyse valide. "}{result.summary}</p>
      {result.review.omittedFindings > 0 && <p className="caption">Certains constats n’ont pas satisfait les vérifications et ont été écartés.</p>}
      {result.findings.length === 0 && <p>Aucun point particulier à signaler dans cette analyse.</p>}
      {result.findings.map((finding, index) => <article key={index} className="intelligence-finding">
        <p className="eyebrow">{types[finding.type]} · {severity[finding.severity]}</p>
        <p>{finding.reason}</p><p><strong>Suggestion :</strong> {finding.suggestion}</p>
        <div className="intelligence-references">
          {[...new Set(finding.moduleIds)].map((id) => <a key={id} href={`#module-${id}`}>Voir le module « {modules.get(id)?.moduleTitle} »</a>)}
          {[...new Set(finding.lessonIds)].map((id) => { const lesson = lessons.get(id); return lesson ? <Link key={id} href={`/app/courses/${course.slug}/lessons/${lesson.slug}?mode=edit`}>Voir la leçon « {lesson.title} »</Link> : null; })}
        </div>
      </article>)}
    </div>}
  </section>;
}
