"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, BookOpen, Check, Eye, Layers3, Upload } from "lucide-react";
import type { CourseDetail } from "@/lib/courses/contracts";
import type { PublicationReadiness } from "@/lib/courses/publication";
import { publicationCorrectionPath } from "@/lib/courses/context-navigation";
import { publishCourseAction, unpublishCourseAction } from "@/app/app/create/actions";
import { Button } from "@/components/ui/Button";

export function PublicationPanel({ course, readiness }: { course: CourseDetail; readiness: PublicationReadiness }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const published = course.status === "published";
  const lessons = course.outline.flatMap((module) => module.lessons);
  const firstIncomplete = lessons.find((lesson) => !lesson.content?.trim());
  const structureHref = publicationCorrectionPath(course.slug, "blocking");
  const previewHref = lessons[0] ? `/app/courses/${course.slug}/lessons/${lessons[0].slug}?mode=preview` : null;
  const mutate = (action: () => Promise<void>, success: string) => startTransition(async () => {
    try { setMessage(""); setFailed(false); await action(); router.refresh(); setMessage(success); }
    catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "La publication a échoué."); }
  });

  return <article className="publication-journey">
    <header className="publication-journey__header"><div><p className="eyebrow">Publication</p><h2>{published ? "Parcours publié" : "Préparer la publication"}</h2><p>{published ? "Ce parcours est actuellement visible dans Explorer." : "Vérifiez les prérequis du parcours avant de le rendre visible dans Explorer."}</p></div>{previewHref && <Link className="button button--secondary" href={previewHref}><Eye size={16} aria-hidden="true" />Prévisualiser</Link>}</header>
    <section className="publication-journey__identity" aria-label="Parcours concerné"><div><h3>{course.title}</h3>{course.description && <p>{course.description}</p>}</div><div className="publication-journey__facts"><span><Layers3 size={16} aria-hidden="true" />{course.outline.length} module{course.outline.length > 1 ? "s" : ""}</span><span><BookOpen size={16} aria-hidden="true" />{lessons.length} leçon{lessons.length > 1 ? "s" : ""}</span></div></section>
    <section className="publication-journey__readiness" aria-labelledby="publication-readiness-title"><div className="publication-journey__section-heading"><div><p className="eyebrow">État du parcours</p><h3 id="publication-readiness-title">{published ? "Publication active" : readiness.ready ? "Prêt à publier" : "À finaliser"}</h3></div><span className="publication-journey__state">{published ? "Publié" : "Brouillon"}</span></div><p>{readiness.blocking.length ? `${readiness.blocking.length} prérequis bloquant${readiness.blocking.length > 1 ? "s" : ""} à corriger.` : "Les prérequis bloquants sont remplis."}{readiness.recommended.length ? ` ${readiness.recommended.length} amélioration${readiness.recommended.length > 1 ? "s" : ""} recommandée${readiness.recommended.length > 1 ? "s" : ""}.` : ""}</p>
      <div className="publication-journey__issues">{readiness.blocking.map((issue) => <div className="publication-journey__issue" key={issue}><AlertCircle size={18} aria-hidden="true" /><div><strong>{issue}</strong><small>Structure du parcours</small></div><Link href={structureHref}>Corriger <ArrowRight size={15} aria-hidden="true" /></Link></div>)}{readiness.recommended.map((issue) => <div className="publication-journey__issue" key={issue}><BookOpen size={18} aria-hidden="true" /><div><strong>{issue}</strong><small>{firstIncomplete ? firstIncomplete.title : "Leçons du parcours"}</small></div><Link href={publicationCorrectionPath(course.slug, "recommended", firstIncomplete?.slug)}>Compléter <ArrowRight size={15} aria-hidden="true" /></Link></div>)}{readiness.blocking.length === 0 && readiness.recommended.length === 0 && <p className="publication-journey__ready"><Check size={17} aria-hidden="true" />Aucun élément à finaliser.</p>}</div>
    </section>
    <section className="publication-journey__action" aria-label="Action de publication"><div><h3>{published ? "Gérer la visibilité" : "Publier le parcours"}</h3><p>{published ? "La dépublication conserve les relations et les progrès existants." : readiness.ready ? "La publication rend ce parcours visible dans Explorer." : "Corrigez les prérequis bloquants pour activer la publication."}</p></div>{published ? <Button type="button" variant="secondary" disabled={pending} onClick={() => mutate(() => unpublishCourseAction(course.id, course.slug), "Parcours dépublié. Les relations et progrès sont conservés.")}>{pending ? "Dépublication..." : "Dépublier"}</Button> : <Button type="button" onClick={() => mutate(() => publishCourseAction(course.id, course.slug), "Parcours publié. Il est maintenant visible dans Explorer.")} disabled={!readiness.ready || pending}><Upload size={17} aria-hidden="true" />{pending ? "Publication..." : "Publier"}</Button>}</section>
    {message && <p className={failed ? "form-error" : "completion-state"} role={failed ? "alert" : "status"}>{message}</p>}
    <Link className="publication-journey__back" href={`/app/courses/${course.slug}`}>Retour à la vue d’ensemble <ArrowRight size={15} aria-hidden="true" /></Link>
  </article>;
}
