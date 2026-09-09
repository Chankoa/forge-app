import Link from "next/link";
import { CourseWorkspace } from "@/components/course/CourseWorkspace";
import { CourseEditor } from "@/components/authoring/CourseEditor";
import { PublicationPanel } from "@/components/authoring/PublicationPanel";
import { EnrollButton, StartCourseLink } from "@/components/learning/LearningActions";
import { resolveCourseCapabilities } from "@/lib/capabilities/course-capabilities";
import { getAuthoringRelationship } from "@/lib/courses/authoring-repository";
import { getCourseDetail, getLearningState } from "@/lib/courses/learning-repository";
import { getPublicationReadiness } from "@/lib/courses/publication";

function CourseModeLinks({ slug, canLearn, canEdit, canPublish }: { slug: string; canLearn: boolean; canEdit: boolean; canPublish: boolean }) {
  return <nav className="mode-switch" aria-label="Contexte du parcours"><Link href={`/app/courses/${slug}`}>Vue d&apos;ensemble</Link>{canLearn && <Link href={`/app/courses/${slug}`}>Apprendre</Link>}{canEdit && <Link href={`/app/courses/${slug}?mode=edit`}>Modifier</Link>}{canPublish && <Link href={`/app/courses/${slug}?mode=publication`}>Publication</Link>}</nav>;
}

export default async function CoursePage({ params, searchParams }: { params: Promise<{ courseSlug: string }>; searchParams: Promise<{ mode?: string }> }) {
  const { courseSlug } = await params;
  const { mode: requestedMode } = await searchParams;
  const course = await getCourseDetail(courseSlug);
  if (!course) return <p className="env-note">Parcours introuvable ou lecture Supabase indisponible.</p>;

  const [state, relationship] = await Promise.all([getLearningState(course), getAuthoringRelationship(course.id)]);
  const capabilities = resolveCourseCapabilities({ isOwner: relationship.isOwner, isEnrolled: state.enrollment !== null });
  const mode = requestedMode === "publication" && capabilities.canPublish ? "publication" : requestedMode === "edit" && capabilities.canEdit ? "edit" : "view";
  const outline = course.outline.map((module) => ({ ...module, lessons: module.lessons.map((lesson) => ({ ...lesson, status: state.completedLessonIds.has(lesson.id) ? "completed" as const : state.continueLessonId === lesson.id ? "in-progress" as const : "not-started" as const })) }));
  const continueLesson = outline.flatMap((module) => module.lessons).find((lesson) => lesson.id === state.continueLessonId);
  const primaryAction = !state.enrollment
    ? <EnrollButton courseId={course.id} courseSlug={course.slug} />
    : continueLesson
      ? <StartCourseLink href={`/app/courses/${course.slug}/lessons/${continueLesson.slug}`} label={state.enrollment.status === "completed" ? "Revoir le parcours" : state.percentage ? "Continuer" : "Commencer"} />
      : null;

  const content = mode === "edit"
    ? <><CourseModeLinks slug={course.slug} {...capabilities} /><CourseEditor course={course} /></>
    : mode === "publication"
      ? <><CourseModeLinks slug={course.slug} {...capabilities} /><PublicationPanel course={course} readiness={getPublicationReadiness(course)} /></>
      : <><CourseModeLinks slug={course.slug} {...capabilities} /><p className="eyebrow">{course.domain ?? "Parcours"}</p><h2>{course.subtitle ?? course.description ?? "Programme du parcours"}</h2><p className="caption">{relationship.isOwner && state.enrollment ? "J'apprends · Je crée" : relationship.isOwner ? "Je crée" : state.enrollment ? "J'apprends" : "Découvrir"}</p>{state.enrollment && <div className="course-progress"><strong>{state.percentage}%</strong><span>{state.completedLessonIds.size} / {outline.flatMap((module) => module.lessons).length} leçons terminées</span></div>}{primaryAction}<section className="content-section"><h2>Programme</h2>{outline.map((module) => <div className="program-module" key={module.id}><h3>{module.moduleTitle}</h3>{module.lessons.map((lesson) => <p key={lesson.id}>{lesson.status === "completed" ? "Terminé · " : ""}{lesson.title}{lesson.durationMinutes ? ` · ${lesson.durationMinutes} min` : ""}</p>)}</div>)}</section></>;

  return <CourseWorkspace course={course} mode={mode} capabilities={capabilities} outline={outline} forgeContext={{ mode: mode === "view" ? "learn" : "edit", courseTitle: course.title }} content={content} />;
}
