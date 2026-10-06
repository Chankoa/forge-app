import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Handshake, Sparkles } from "lucide-react";
import { CourseCover, PublicationStatus, RelationPills } from "@/components/course/CoursePresentation";
import { DomainMetadata } from "@/components/course/DomainMetadata";
import { courseRelations } from "@/lib/courses/presentation";
import { selectWorkspaceCourses, workspaceCourseAction, workspaceLesson, type WorkspaceCourse } from "@/lib/courses/workspace-view";
import type { WorkspaceCollaborationAwareness } from "@/lib/courses/collaboration-awareness-repository";

function WorkspaceProgress({ item }: { item: WorkspaceCourse }) {
  if (!item.state.enrollment) return null;
  const total = item.course.outline.reduce((count, module) => count + module.lessons.length, 0);
  return <div className="workspace-dashboard__progress"><progress value={item.state.percentage} max={100} aria-label={`Progression de ${item.course.title}`} /><span>{item.state.percentage} % · {item.state.completedLessonIds.size} / {total} leçons</span></div>;
}

function WorkspacePath({ item }: { item: WorkspaceCourse }) {
  const action = workspaceCourseAction(item);
  return <article className="workspace-dashboard__path"><CourseCover domain={item.course.domain} compact /><div className="workspace-dashboard__path-identity"><DomainMetadata domain={item.course.domain} /><h3>{item.course.title}</h3>{item.course.description && <p>{item.course.description}</p>}</div><div className="workspace-dashboard__path-meta"><RelationPills relations={courseRelations(Boolean(item.state.enrollment), item.isOwner)} />{item.isOwner && <PublicationStatus status={item.course.status} />}{item.state.enrollment && <WorkspaceProgress item={item} />}</div><Link href={action.href}>{action.label}<ArrowRight size={15} aria-hidden="true" /></Link></article>;
}

export function WorkspaceSections({ courses }: { courses: WorkspaceCourse[] }) {
  const { continuing, paths, learning } = selectWorkspaceCourses(courses);
  const currentLesson = continuing && workspaceLesson(continuing);
  const currentModule = continuing?.course.outline.find((module) => module.lessons.some((lesson) => lesson.id === currentLesson?.id));
  const continueAction = continuing && workspaceCourseAction(continuing);
  return <div className="workspace-dashboard__sections">
    <section className="workspace-journey__section" aria-labelledby="workspace-continue-title"><div className="workspace-journey__section-heading"><div><p className="eyebrow">Votre activité</p><h2 id="workspace-continue-title">Continuer</h2></div></div>
      {continuing && continueAction ? <article className="workspace-dashboard__continue"><CourseCover domain={continuing.course.domain} compact /><div className="workspace-dashboard__continue-body"><DomainMetadata domain={continuing.course.domain} /><h3>{continuing.course.title}</h3>{currentLesson && <p>{currentModule?.moduleTitle ? `${currentModule.moduleTitle} · ` : ""}{currentLesson.title}{currentLesson.durationMinutes != null ? ` · ${currentLesson.durationMinutes} min` : ""}</p>}<WorkspaceProgress item={continuing} /></div><Link className="button button--primary" href={continueAction.href}>{continueAction.label}<ArrowRight size={16} aria-hidden="true" /></Link></article>
        : <div className="workspace-journey__empty"><p>Aucun parcours à reprendre pour le moment.</p><Link href="/app/create">Créer un parcours <ArrowRight size={16} aria-hidden="true" /></Link></div>}
    </section>
    <section className="workspace-journey__section" aria-labelledby="workspace-paths-title"><div className="workspace-journey__section-heading"><div><p className="eyebrow">Vos parcours</p><h2 id="workspace-paths-title">Mes parcours</h2></div><Link href="/app/courses">Tous mes parcours <ArrowRight size={16} aria-hidden="true" /></Link></div>
      {paths.length ? <div className="workspace-dashboard__paths">{paths.map((item) => <WorkspacePath key={item.course.id} item={item} />)}</div> : <p className="workspace-dashboard__muted">Vos autres parcours apparaîtront ici.</p>}
    </section>
    <section className="workspace-journey__section" aria-labelledby="workspace-learn-title"><div className="workspace-journey__section-heading"><div><p className="eyebrow">Apprentissage</p><h2 id="workspace-learn-title">Apprendre</h2></div></div>
      {learning ? <WorkspacePath item={learning} /> : <p className="workspace-dashboard__muted">Vous ne suivez pas encore de parcours. <Link href="/app/explore">Explorer les parcours <ArrowRight size={15} aria-hidden="true" /></Link></p>}
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
    <section className="workspace-dashboard__rail-section" aria-labelledby="workspace-recommendations-title"><div className="workspace-dashboard__rail-title"><BookOpen size={18} aria-hidden="true" /><h2 id="workspace-recommendations-title">Parcours à explorer</h2></div><p>Parcourez le catalogue public Forge pour trouver votre prochain sujet.</p><Link href="/app/explore">Explorer les parcours <ArrowRight size={15} aria-hidden="true" /></Link></section>
    <section className="workspace-dashboard__rail-section" aria-labelledby="workspace-explore-title"><div className="workspace-dashboard__rail-title"><Compass size={18} aria-hidden="true" /><h2 id="workspace-explore-title">Explorer</h2></div><nav aria-label="Destinations à explorer"><Link href="/app/explore">Parcours publiés <ArrowRight size={15} aria-hidden="true" /></Link><Link href="/app/courses">Mes parcours <ArrowRight size={15} aria-hidden="true" /></Link></nav></section>
  </aside>;
}
