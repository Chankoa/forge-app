import { CourseWorkspace } from "@/components/course/CourseWorkspace";
import { CourseEditor } from "@/components/authoring/CourseEditor";
import { PublicationPanel } from "@/components/authoring/PublicationPanel";
import { StartCourseLink } from "@/components/learning/LearningActions";
import Link from "next/link";
import { resolveCourseCapabilities } from "@/lib/capabilities/course-capabilities";
import { getAuthoringRelationship } from "@/lib/courses/authoring-repository";
import { getCourseDetail, getLearningState } from "@/lib/courses/learning-repository";
import { getPublicationReadiness } from "@/lib/courses/publication";
import { ProgressRing, RelationPills } from "@/components/course/CoursePresentation";
import { courseRelations } from "@/lib/courses/presentation";
import { BookOpen, Clock3, Layers3, PenLine } from "lucide-react";

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
  const primaryAction = state.enrollment && continueLesson
      ? <StartCourseLink href={`/app/courses/${course.slug}/lessons/${continueLesson.slug}`} label={state.enrollment.status === "completed" ? "Revoir le parcours" : state.percentage ? "Continuer" : "Commencer"} />
      : null;

  const content = mode === "edit"
    ? <CourseEditor course={course} />
    : mode === "publication"
      ? <PublicationPanel course={course} readiness={getPublicationReadiness(course)} />
      : <div className="course-overview"><div className="course-overview__intro"><div><p className="eyebrow">{course.domain ?? "Parcours"}</p><h2>{course.subtitle ?? course.description ?? "Programme du parcours"}</h2><RelationPills relations={courseRelations(Boolean(state.enrollment), relationship.isOwner)} /></div>{primaryAction}</div><div className="course-overview__stats"><div><Layers3 size={19} /><strong>{outline.length}</strong><span>Modules</span></div><div><BookOpen size={19} /><strong>{outline.flatMap((module) => module.lessons).length}</strong><span>Leçons</span></div><div><Clock3 size={19} /><strong>{course.durationMinutes ?? outline.flatMap((module) => module.lessons).reduce((sum, lesson) => sum + (lesson.durationMinutes ?? 0), 0)} min</strong><span>Durée estimée</span></div>{state.enrollment && <div><ProgressRing value={state.percentage} size={54} /><span><strong>{state.percentage}%</strong>Progression</span></div>}</div><section className="content-section course-program"><h2>Programme</h2>{outline.map((module, moduleIndex) => <details className="program-module" key={module.id} open={moduleIndex < 2}><summary><span>{moduleIndex + 1}</span><strong>{module.moduleTitle}</strong>{relationship.isOwner && <Link className="program-edit-link" href={`/app/courses/${course.slug}?mode=edit#module-${module.id}`} aria-label={`Modifier le module ${module.moduleTitle}`}><PenLine size={15} /></Link>}<small>{module.lessons.length} leçon{module.lessons.length > 1 ? "s" : ""}</small></summary>{module.lessons.map((lesson, lessonIndex) => <p key={lesson.id}><span>{lesson.status === "completed" ? "✓" : `${moduleIndex + 1}.${lessonIndex + 1}`}</span>{relationship.isOwner ? <><Link href={`/app/courses/${course.slug}/lessons/${lesson.slug}?mode=preview`}>{lesson.title}</Link><Link className="program-edit-link" href={`/app/courses/${course.slug}/lessons/${lesson.slug}?mode=edit`} aria-label={`Modifier ${lesson.title}`}><PenLine size={15} /></Link></> : state.enrollment ? <Link href={`/app/courses/${course.slug}/lessons/${lesson.slug}`}>{lesson.title}</Link> : lesson.title}<small>{lesson.durationMinutes ? `${lesson.durationMinutes} min` : ""}</small></p>)}</details>)}</section></div>;

  return <CourseWorkspace course={course} mode={mode} capabilities={capabilities} outline={outline} learnLesson={continueLesson?.slug} forgeContext={{ mode: mode === "view" ? "learn" : "edit", courseTitle: course.title }} content={content} />;
}
