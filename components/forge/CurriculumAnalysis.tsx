"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { analyzeCurriculumAction } from "@/app/app/forge/intelligence-actions";
import type { CourseDetail } from "@/lib/courses/contracts";
import type { CurriculumResult } from "@/lib/forge/intelligence/contracts";

const types = { redundancy: "Redondance", gap: "Prérequis ou notion manquante", sequence_issue: "Ordre pédagogique", imbalance: "Équilibre", objective_gap: "Objectif peu couvert", scope_issue: "Périmètre", consolidation_opportunity: "Regroupement possible" };
const severity = { info: "À examiner", attention: "Attention", important: "Prioritaire" };

export function CurriculumAnalysis({ course }: { course: CourseDetail }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CurriculumResult | null>(null);
  const [error, setError] = useState("");
  const modules = new Map(course.outline.map((module) => [module.id, module]));
  const lessons = new Map(course.outline.flatMap((module) => module.lessons.map((lesson) => [lesson.id, { ...lesson, moduleId: module.id }] as const)));
  return <section className="intelligence-section" aria-labelledby="curriculum-heading"><div className="section-heading"><div><p className="eyebrow">Forge · Architecte du cursus</p><h3 id="curriculum-heading">Analyse de la structure</h3></div></div>
    <p>Forge examine titres, objectifs et résumés. Ses constats sont des suggestions ; aucune modification n’est appliquée.</p>
    <button type="button" className="button button--secondary" disabled={pending} onClick={() => startTransition(async () => { setError(""); const response = await analyzeCurriculumAction(course.id); if (response.ok) setResult(response.result); else setError(response.error === "invalid_result" ? "L’analyse n’a pas pu être générée complètement. Vous pouvez réessayer." : "L’analyse est indisponible pour le moment. Vous pouvez réessayer."); })}>{pending ? "Forge analyse la structure…" : result ? "Relancer l’analyse" : "Analyser la structure"}</button>
    {pending && <p role="status" aria-live="polite">Analyse en cours…</p>}{error && <p role="alert" className="form-error">{error}</p>}
    {result && <div className="intelligence-results">
      <p role="status">{result.summary}</p>
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
