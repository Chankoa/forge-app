"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { discoverSubjectAction } from "@/app/app/forge/intelligence-actions";
import type { PublicPreviewRequest } from "@/lib/forge/public-contracts";

type Discovery = Awaited<ReturnType<typeof discoverSubjectAction>>;
const relations = { duplicate_or_very_close: "Très proche", related: "Lié", prerequisite: "Prérequis", continuation: "Suite possible", complementary: "Complémentaire" };
const confidence = { low: "faible", medium: "moyenne", high: "élevée" };

export function SubjectDiscovery({ request }: { request: PublicPreviewRequest }) {
  const [pending, startTransition] = useTransition();
  const [response, setResponse] = useState<Discovery | null>(null);
  const [checkedIntent, setCheckedIntent] = useState("");
  const currentKey = JSON.stringify(request);
  const stale = checkedIntent !== currentKey;
  return <section className="intelligence-section" aria-labelledby="subject-discovery-heading">
    <div className="section-heading"><div><p className="eyebrow">Forge · Découverte du sujet</p><h3 id="subject-discovery-heading">Des parcours existent-ils déjà ?</h3></div></div>
    <p>Comparez votre intention aux parcours publics avant de générer. Vous pouvez toujours créer votre propre parcours.</p>
    <button type="button" className="button button--secondary" disabled={pending || request.intent.trim().length < 12} onClick={() => startTransition(async () => { const result = await discoverSubjectAction(request); setResponse(result); setCheckedIntent(currentKey); })}>{pending ? "Forge compare les parcours…" : "Rechercher des parcours proches"}</button>
    {pending && <p role="status" aria-live="polite">Analyse en cours…</p>}
    {!stale && response && (response.ok ? <div className="intelligence-results" role="status"><p>{response.result.summary}</p>{response.result.matches.map((match) => <article key={match.courseId} className="intelligence-match"><p className="eyebrow">{match.course.domain ?? "Parcours"} · {relations[match.relation]}</p><h4>{match.course.title}</h4>{match.course.description && <p>{match.course.description}</p>}<p>{match.reason}</p><p className="caption">Confiance qualitative : {confidence[match.confidenceLevel]}</p><Link href={`/app/courses/${match.course.slug}`} target="_blank" rel="noopener noreferrer" className="button button--secondary">Voir le parcours dans un nouvel onglet</Link></article>)}<p>Vous pouvez continuer la création malgré ces rapprochements.</p></div> : <p className="form-error" role="alert">La comparaison n’a pas pu être terminée. Vous pouvez réessayer ou créer le parcours.</p>)}
  </section>;
}
