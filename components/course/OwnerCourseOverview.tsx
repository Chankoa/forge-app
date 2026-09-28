import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronDown, Clock3, Layers3, PenLine, AlertCircle } from "lucide-react";
import type { CourseDetail } from "@/lib/courses/contracts";
import type { PublicationReadiness } from "@/lib/courses/publication";

export function OwnerCourseOverview({ course, readiness }: { course: CourseDetail; readiness: PublicationReadiness }) {
  const lessons = course.outline.flatMap((module) => module.lessons);
  const knownMinutes = lessons.reduce((sum, lesson) => sum + (lesson.durationMinutes ?? 0), 0);
  const duration = course.durationMinutes ?? (lessons.length > 0 && lessons.every((lesson) => lesson.durationMinutes != null) ? knownMinutes : null);
  const firstIncompleteLesson = lessons.find((lesson) => !lesson.content?.trim());
  const publicationHref = `/app/courses/${course.slug}?mode=publication`;
  const structureHref = `/app/courses/${course.slug}?mode=edit#cockpit-program-title`;
  const issueCount = readiness.blocking.length + readiness.recommended.length;

  return <div className="owner-overview">
    <section className="owner-overview__summary" aria-label="Résumé du parcours">
      <div><Layers3 size={18} aria-hidden="true" /><span><strong>{course.outline.length}</strong><small>module{course.outline.length > 1 ? "s" : ""}</small></span></div>
      <div><BookOpen size={18} aria-hidden="true" /><span><strong>{lessons.length}</strong><small>leçon{lessons.length > 1 ? "s" : ""}</small></span></div>
      {duration !== null && <div><Clock3 size={18} aria-hidden="true" /><span><strong>{duration} min</strong><small>durée estimée</small></span></div>}
      <div>{course.status === "published" || readiness.ready ? <Check size={18} aria-hidden="true" /> : <AlertCircle size={18} aria-hidden="true" />}<span><strong>{course.status === "published" ? "Publié" : readiness.ready ? "Prêt à publier" : "À compléter"}</strong><small>publication</small></span></div>
    </section>

    <section className="owner-overview__section" aria-labelledby="overview-modules-title">
      <div className="owner-overview__section-heading"><div><p className="eyebrow">Structure du parcours</p><h2 id="overview-modules-title">Modules</h2></div><Link className="owner-overview__section-link" href={structureHref}>Gérer la structure <ArrowRight size={16} /></Link></div>
      <div className="owner-overview__modules">{course.outline.map((module, index) => {
        const minutes = module.lessons.reduce((sum, lesson) => sum + (lesson.durationMinutes ?? 0), 0);
        const hasDuration = module.lessons.length > 0 && module.lessons.every((lesson) => lesson.durationMinutes != null);
        return <div className="owner-overview__module" key={module.id}>
          <details><summary><span className="owner-overview__module-index">{String(index + 1).padStart(2, "0")}</span><span className="owner-overview__module-name"><strong>{module.moduleTitle}</strong><small>{module.lessons.length} leçon{module.lessons.length > 1 ? "s" : ""}{hasDuration ? ` · ${minutes} min` : ""}</small></span><ChevronDown size={17} aria-hidden="true" /></summary>
            <ol>{module.lessons.map((lesson) => <li key={lesson.id}><Link href={`/app/courses/${course.slug}/lessons/${lesson.slug}?mode=edit`}>{lesson.title}</Link><span>{lesson.publishingStatus === "published" ? "Publié" : "Brouillon"}{lesson.durationMinutes != null ? ` · ${lesson.durationMinutes} min` : ""}</span></li>)}</ol>
          </details><Link className="owner-overview__module-action" href={`/app/courses/${course.slug}?mode=edit#module-${module.id}`} aria-label={`Modifier le module ${module.moduleTitle}`}><PenLine size={16} /></Link>
        </div>;
      })}</div>
      {course.outline.length === 0 && <p className="owner-overview__empty">Aucun module pour le moment. <Link href={structureHref}>Ajouter un module</Link></p>}
    </section>

    <section className="owner-overview__section owner-overview__readiness" aria-labelledby="overview-readiness-title">
      <div className="owner-overview__section-heading"><div><p className="eyebrow">Publication</p><h2 id="overview-readiness-title">{course.status === "published" ? "Parcours publié" : issueCount ? "À finaliser avant publication" : "Prêt pour la publication"}</h2></div><Link className="owner-overview__section-link" href={publicationHref}>Voir la publication <ArrowRight size={16} /></Link></div>
      <p className="owner-overview__readiness-copy">{readiness.blocking.length ? `${readiness.blocking.length} prérequis bloquant${readiness.blocking.length > 1 ? "s" : ""} à compléter.` : readiness.recommended.length ? `${readiness.recommended.length} amélioration${readiness.recommended.length > 1 ? "s" : ""} recommandée${readiness.recommended.length > 1 ? "s" : ""} ; la publication reste possible.` : course.status === "published" ? "Ce parcours est actuellement publié." : "Les prérequis bloquants sont remplis."}</p>
      {readiness.blocking.map((issue) => <div className="owner-overview__issue" key={issue}><AlertCircle size={18} aria-hidden="true" /><span>{issue}</span><Link href={structureHref}>Corriger <ArrowRight size={15} /></Link></div>)}
      {readiness.recommended.map((issue) => <div className="owner-overview__issue" key={issue}><BookOpen size={18} aria-hidden="true" /><span>{issue}</span><Link href={firstIncompleteLesson ? `/app/courses/${course.slug}/lessons/${firstIncompleteLesson.slug}?mode=edit` : publicationHref}>Compléter <ArrowRight size={15} /></Link></div>)}
      {issueCount === 0 && <p className="owner-overview__ready"><Check size={17} /> Aucun élément à finaliser.</p>}
    </section>
  </div>;
}
