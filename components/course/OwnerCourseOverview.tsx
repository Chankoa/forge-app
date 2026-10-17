import Link from "next/link";
import { ArrowRight, ChevronDown, LayoutDashboard, PenLine } from "lucide-react";
import type { CourseDetail } from "@/lib/courses/contracts";
import type { PublicationReadiness } from "@/lib/courses/publication";
import { knownCourseDuration } from "@/lib/courses/presentation";
import { CourseMetrics } from "./CourseMetrics";
import { CourseCoverManager } from "./CourseCoverManager";

export function OwnerCourseOverview({ course, readiness, canManageCover = false }: { course: CourseDetail; readiness: PublicationReadiness; canManageCover?: boolean }) {
  const lessons = course.outline.flatMap((module) => module.lessons);
  const duration = knownCourseDuration(course);
  const publicationHref = `/app/courses/${course.slug}?mode=publication`;
  const structureHref = `/app/courses/${course.slug}?mode=edit#cockpit-program-title`;
  const issueCount = readiness.blocking.length + readiness.recommended.length;

  return <div className="owner-overview" id="course-overview-cockpit">
    <CourseMetrics modules={course.outline.length} lessons={lessons.length} durationMinutes={duration} publication={course.status === "published" ? "Publié" : readiness.ready ? "Prêt à publier" : "À compléter"} />
    <nav className="owner-overview__management" aria-label="Destinations de gestion du parcours">
      <span className="eyebrow">Gestion du parcours</span>
      <Link href={`/app/courses/${course.slug}`} aria-current="page"><LayoutDashboard size={15} aria-hidden="true" />Vue d’ensemble</Link>
      <Link href={structureHref}>Structure</Link>
      <Link href={publicationHref}>Publication</Link>
      <Link href={`/app/courses/${course.slug}?mode=collaborators`}>Collaboration</Link>
      <Link href={`/app/courses/${course.slug}/classroom`}>Classroom</Link>
      <Link className="owner-overview__management-secondary" href={`/app/courses/${course.slug}?mode=availability`}>Disponibilité</Link>
      {(course.status === "draft" || course.status === "published") && <Link className="owner-overview__management-secondary" href={`/app/courses/${course.slug}?mode=remix`}>Remix / provenance</Link>}
    </nav>
    {canManageCover && <CourseCoverManager courseId={course.id} cover={course.cover} domain={course.domain} />}
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
    </section>
  </div>;
}
