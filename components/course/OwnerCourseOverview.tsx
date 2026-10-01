import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronDown, PenLine, AlertCircle, Users } from "lucide-react";
import type { CourseDetail } from "@/lib/courses/contracts";
import type { PublicationReadiness } from "@/lib/courses/publication";
import { knownCourseDuration } from "@/lib/courses/presentation";
import { CourseMetrics } from "./CourseMetrics";
import { CourseLifecycleControls } from "./CourseLifecycleControls";

type CourseLifecycleAction = (courseId: string, courseSlug: string) => Promise<void>;

export function OwnerCourseOverview({ course, readiness, archiveAction, restoreAction }: { course: CourseDetail; readiness: PublicationReadiness; archiveAction?: CourseLifecycleAction; restoreAction?: CourseLifecycleAction }) {
  const lessons = course.outline.flatMap((module) => module.lessons);
  const duration = knownCourseDuration(course);
  const firstIncompleteLesson = lessons.find((lesson) => !lesson.content?.trim());
  const publicationHref = `/app/courses/${course.slug}?mode=publication`;
  const structureHref = `/app/courses/${course.slug}?mode=edit#cockpit-program-title`;
  const issueCount = readiness.blocking.length + readiness.recommended.length;

  return <div className="owner-overview">
    <CourseMetrics modules={course.outline.length} lessons={lessons.length} durationMinutes={duration} publication={course.status === "published" ? "Publié" : readiness.ready ? "Prêt à publier" : "À compléter"} />

    <section className="owner-overview__section" aria-labelledby="overview-lifecycle-title">
      <div className="owner-overview__section-heading"><div><p className="eyebrow">Cycle de vie</p><h2 id="overview-lifecycle-title">{course.status === "archived" ? "Parcours archivé" : "Disponibilité du parcours"}</h2></div><CourseLifecycleControls courseId={course.id} courseSlug={course.slug} status={course.status} archiveAction={archiveAction} restoreAction={restoreAction} /></div>
      <p>{course.status === "archived" ? "Le parcours reste modifiable pour vous. Restaurez-le avant toute nouvelle publication." : "L’archivage retire le parcours de l’Explorer et suspend l’accès des apprenants sans supprimer leurs données."}</p>
    </section>

    <section className="owner-overview__section" aria-labelledby="overview-collaborators-title">
      <div className="owner-overview__section-heading"><div><p className="eyebrow"><Users size={15} /> Équipe du parcours</p><h2 id="overview-collaborators-title">Collaborateurs</h2></div><Link className="owner-overview__section-link" href={`/app/courses/${course.slug}?mode=collaborators`}>Gérer les collaborateurs <ArrowRight size={16} /></Link></div>
      <p>Ajoutez des lecteurs ou des éditeurs, ajustez leur rôle et retirez leur accès sans modifier la propriété du parcours.</p>
    </section>

    <section className="owner-overview__section" aria-labelledby="overview-classroom-title">
      <div className="owner-overview__section-heading"><div><p className="eyebrow"><Users size={15} /> Classroom</p><h2 id="overview-classroom-title">Apprenants</h2></div><Link className="owner-overview__section-link" href={`/app/courses/${course.slug}?mode=classroom`}>Voir le Classroom <ArrowRight size={16} /></Link></div>
      <p>Consultez les inscriptions et la progression du parcours, sans modifier les données des apprenants.</p>
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
