"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Handshake, Sparkles } from "lucide-react";
import { CourseCover, PublicationStatus, RelationPills } from "@/components/course/CoursePresentation";
import { DomainMetadata } from "@/components/course/DomainMetadata";
import { courseRelations } from "@/lib/courses/presentation";
import { selectWorkspaceCourses, workspaceCourseAction, workspaceLesson, type WorkspaceCourse } from "@/lib/courses/workspace-view";
import type { WorkspaceCollaborationAwareness } from "@/lib/courses/collaboration-awareness-repository";
import { AuthorAttribution } from "@/components/course/AuthorAttribution";
import { useContextualTopbarSearch } from "@/components/shell/ContextualTopbarSearch";

function matchesWorkspaceCourse(item: WorkspaceCourse, query: string) {
  const term = query.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  if (!term) return true;
  return [item.course.title, item.course.description ?? "", item.course.domain ?? ""]
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .includes(term);
}

function WorkspaceProgress({ item }: { item: WorkspaceCourse }) {
  if (!item.state.enrollment) return null;
  const total = item.course.outline.reduce((count, module) => count + module.lessons.length, 0);
  return <div className="workspace-dashboard__progress"><progress value={item.state.percentage} max={100} aria-label={`Progression de ${item.course.title}`} /><span>{item.state.percentage} % · {item.state.completedLessonIds.size} / {total} leçons</span></div>;
}

function WorkspacePath({ item }: { item: WorkspaceCourse }) {
  const action = workspaceCourseAction(item);
  const author = item.course.author ?? (!item.isOwner ? item.course.owner : undefined);
  return <article className="course-presentation course-presentation--row workspace-dashboard__path"><CourseCover image={item.course.cover} domain={item.course.domain} compact /><div className="workspace-dashboard__path-identity course-presentation__identity"><DomainMetadata domain={item.course.domain} /><h3 className="course-presentation__title">{item.course.title}</h3>{item.course.description && <p className="course-presentation__description">{item.course.description}</p>}{author && <AuthorAttribution author={author} />}</div><div className="workspace-dashboard__path-relation course-presentation__relation"><RelationPills relations={courseRelations(Boolean(item.state.enrollment), item.isOwner, item.collaborationRole ?? null, item.collaborationRole ? "active" : null)} /></div><div className="workspace-dashboard__path-status course-presentation__status"><PublicationStatus status={item.course.status} /></div><div className="workspace-dashboard__path-progress course-presentation__progress">{item.state.enrollment && <WorkspaceProgress item={item} />}</div><div className="workspace-dashboard__path-actions course-presentation__actions"><Link className="course-presentation__action course-presentation__action--secondary" href={action.href}>{action.label}<ArrowRight size={15} aria-hidden="true" /></Link></div></article>;
}

export function WorkspaceSections({ courses }: { courses: WorkspaceCourse[] }) {
  const [query, setQuery] = useState("");
  const topbarSearch = useMemo(() => ({ id: "workspace-courses", placeholder: "Rechercher dans mes parcours…", value: query, onChange: setQuery }), [query]);
  useContextualTopbarSearch(topbarSearch);
  const displayedCourses = useMemo(() => courses.filter((item) => matchesWorkspaceCourse(item, query)), [courses, query]);
  const { continuing, paths } = selectWorkspaceCourses(displayedCourses);
  const currentLesson = continuing && workspaceLesson(continuing);
  const currentModule = continuing?.course.outline.find((module) => module.lessons.some((lesson) => lesson.id === currentLesson?.id));
  const continueAction = continuing && workspaceCourseAction(continuing);
  const continuingAuthor = continuing?.course.author ?? (!continuing?.isOwner ? continuing?.course.owner : undefined);
  return <div className="workspace-dashboard__sections">
    <section className="workspace-journey__section" aria-labelledby="workspace-continue-title"><div className="workspace-journey__section-heading"><div><p className="eyebrow">Votre activité</p><h2 id="workspace-continue-title">Continuer</h2></div></div>
      {continuing && continueAction ? <article className="course-presentation course-presentation--row workspace-dashboard__continue"><CourseCover image={continuing.course.cover} domain={continuing.course.domain} compact /><div className="workspace-dashboard__continue-body course-presentation__identity"><DomainMetadata domain={continuing.course.domain} /><h3 className="course-presentation__title">{continuing.course.title}</h3>{currentLesson && <p className="course-presentation__description">{currentModule?.moduleTitle ? `${currentModule.moduleTitle} · ` : ""}{currentLesson.title}{currentLesson.durationMinutes != null ? ` · ${currentLesson.durationMinutes} min` : ""}</p>}{continuingAuthor && <AuthorAttribution author={continuingAuthor} />}</div><div className="workspace-dashboard__continue-relation course-presentation__relation"><RelationPills relations={courseRelations(Boolean(continuing.state.enrollment), continuing.isOwner, continuing.collaborationRole ?? null, continuing.collaborationRole ? "active" : null)} /></div><div className="workspace-dashboard__continue-status course-presentation__status"><PublicationStatus status={continuing.course.status} /></div><div className="workspace-dashboard__continue-progress course-presentation__progress"><WorkspaceProgress item={continuing} /></div><div className="workspace-dashboard__continue-actions course-presentation__actions"><Link className="button button--primary course-presentation__action course-presentation__action--primary" href={continueAction.href}>{continueAction.label}<ArrowRight size={16} aria-hidden="true" /></Link></div></article>
        : <div className="workspace-journey__empty"><p>Aucun parcours à reprendre pour le moment.</p><Link href="/app/create">Créer un parcours <ArrowRight size={16} aria-hidden="true" /></Link></div>}
    </section>
    <section className="workspace-journey__section" aria-labelledby="workspace-paths-title"><div className="workspace-journey__section-heading"><div><p className="eyebrow">Vos parcours</p><h2 id="workspace-paths-title">Mes parcours</h2></div><Link href="/app/courses">Tous mes parcours <ArrowRight size={16} aria-hidden="true" /></Link></div>
      {paths.length ? <div className="workspace-dashboard__paths">{paths.map((item) => <WorkspacePath key={item.course.id} item={item} />)}</div> : <p className="workspace-dashboard__muted">Vos autres parcours apparaîtront ici.</p>}
    </section>
  </div>;
}

function WorkspaceCollaborationAwarenessBlock({ courses, collaboration }: { courses: WorkspaceCourse[]; collaboration: WorkspaceCollaborationAwareness }) {
  const coursesById = new Map(courses.map((item) => [item.course.id, item.course]));
  const ownerRequests = collaboration.ownerRequests.flatMap((request) => { const course = coursesById.get(request.courseId); return course ? [{ ...request, slug: course.slug }] : []; });
  const acceptedRequests = collaboration.acceptedRequests.flatMap((request) => { const course = coursesById.get(request.courseId); return course ? [{ ...request, slug: course.slug }] : []; });
  if (!ownerRequests.length && !acceptedRequests.length) return null;
  return <section className="workspace-dashboard__rail-section workspace-dashboard__collaboration" aria-labelledby="workspace-collaboration-title"><div className="workspace-dashboard__rail-title"><Handshake size={18} aria-hidden="true" /><h2 id="workspace-collaboration-title">Collaboration</h2></div><div className="workspace-dashboard__collaboration-list">{ownerRequests.map((request) => <article key={request.requestId}><p><strong>{request.requesterName} souhaite collaborer sur</strong><span>{request.courseTitle}</span></p><Link href={`/app/courses/${request.slug}?mode=collaborators#collaboration-requests`}>Voir la demande <ArrowRight size={15} aria-hidden="true" /></Link></article>)}{acceptedRequests.map((request) => <article key={`${request.courseId}-${request.resolvedAt}`}><p><strong>Votre demande de collaboration a été acceptée</strong><span>Vous êtes désormais {request.role === "editor" ? "Éditeur" : "Lecteur"} sur {request.courseTitle}{request.ownerName ? ` · Par ${request.ownerName}` : ""}</span></p><Link href={`/app/courses/${request.slug}`}>Ouvrir le parcours <ArrowRight size={15} aria-hidden="true" /></Link></article>)}</div></section>;
}

export function WorkspaceContextRail({ courses, collaboration = { ownerRequests: [], acceptedRequests: [] } }: { courses: WorkspaceCourse[]; collaboration?: WorkspaceCollaborationAwareness }) {
  const { editableLesson, learning } = selectWorkspaceCourses(courses);
  const learnerLesson = learning && workspaceLesson(learning);
  return <aside className="workspace-dashboard__rail" aria-label="Raccourcis contextuels">
    <section className="workspace-dashboard__rail-section workspace-dashboard__forge" aria-labelledby="workspace-forge-title"><div className="workspace-dashboard__rail-title"><Sparkles size={18} aria-hidden="true" /><h2 id="workspace-forge-title">Forge</h2></div><p>Retrouvez Forge dans le contexte de votre parcours.</p><nav aria-label="Actions Forge disponibles"><Link href="/app/create">M’aider à créer un parcours <ArrowRight size={15} aria-hidden="true" /></Link>{editableLesson?.lesson && <Link href={`/app/courses/${editableLesson.item.course.slug}/lessons/${editableLesson.lesson.slug}?mode=edit`}>Améliorer une leçon <ArrowRight size={15} aria-hidden="true" /></Link>}{learning && learnerLesson && <Link href={`/app/courses/${learning.course.slug}/lessons/${learnerLesson.slug}`}>Poser une question sur une leçon <ArrowRight size={15} aria-hidden="true" /></Link>}</nav></section>
    <WorkspaceCollaborationAwarenessBlock courses={courses} collaboration={collaboration} />
    <section className="workspace-dashboard__rail-section" aria-labelledby="workspace-recommendations-title"><div className="workspace-dashboard__rail-title"><BookOpen size={18} aria-hidden="true" /><h2 id="workspace-recommendations-title">Parcours à explorer</h2></div><p>Parcourez le catalogue public Forge pour trouver votre prochain sujet.</p><Link href="/app/explore">Explorer tous les parcours <ArrowRight size={15} aria-hidden="true" /></Link></section>
  </aside>;
}
