import Link from "next/link";
import { CourseWorkspace } from "@/components/course/CourseWorkspace";
import { canAccessLessonMode, resolveCourseCapabilities } from "@/lib/capabilities/course-capabilities";
import { getCourseDetail, getLearningState } from "@/lib/courses/learning-repository";
import { LearnerLesson } from "@/components/learning/LearnerLesson";
import { getAuthoringRelationship } from "@/lib/courses/authoring-repository";
import { LessonEditor } from "@/components/authoring/LessonEditor";
import { getLessonNavigation } from "@/lib/courses/lesson-navigation";

export default async function LessonPage({ params, searchParams }: { params: Promise<{ courseSlug: string; lessonSlug: string }>; searchParams: Promise<{ mode?: string }> }) {
  const { courseSlug, lessonSlug } = await params; const { mode } = await searchParams;
  const course = await getCourseDetail(courseSlug);
  if (!course) return <p className="env-note">Parcours introuvable ou lecture Supabase indisponible.</p>;
  const [state, relation] = await Promise.all([getLearningState(course), getAuthoringRelationship(course.id)]);
  const capabilities = resolveCourseCapabilities({ isOwner: relation.isOwner, isEnrolled: state.enrollment !== null, courseStatus: course.status, membershipRole: relation.membershipRole, membershipStatus: relation.membershipStatus }); const edit = mode === "edit"; const preview = mode === "preview" && capabilities.canPreview;
  if (!canAccessLessonMode(capabilities, mode)) return <p className="env-note">{edit ? "La capacité de modification est requise pour éditer cette leçon." : "L&apos;inscription est requise pour accéder aux leçons."} <Link href={`/app/courses/${course.slug}`}>Vue d&apos;ensemble du parcours</Link></p>;
  const outline = course.outline.map((module) => ({ ...module, lessons: module.lessons.map((item) => ({ ...item, status: state.completedLessonIds.has(item.id) ? "completed" as const : state.continueLessonId === item.id ? "in-progress" as const : "not-started" as const })) }));
  const navigation = getLessonNavigation(outline, lessonSlug);
  if (!navigation) return <p className="env-note">Leçon introuvable. <Link href={`/app/courses/${course.slug}`}>Vue d&apos;ensemble du parcours</Link></p>;
  const { lesson, previous, next, position, total, moduleTitle, moduleNumber, lessonNumber } = navigation;
  return <CourseWorkspace course={course} mode={edit ? "edit" : preview ? "preview" : "learn"} capabilities={capabilities} outline={outline} selectedLesson={lesson.slug} forgeContext={{ mode: edit ? "edit" : "learn", courseTitle: course.title, lessonTitle: lesson.title }} content={edit ? <LessonEditor courseId={course.id} courseSlug={course.slug} lesson={lesson} moduleTitle={moduleTitle} moduleNumber={moduleNumber} lessonNumber={lessonNumber} /> : <LearnerLesson courseId={course.id} courseSlug={course.slug} lesson={lesson} moduleTitle={moduleTitle} moduleNumber={moduleNumber} lessonNumber={lessonNumber} position={position} total={total} previous={previous} next={next} preview={preview} completed={state.completedLessonIds.has(lesson.id)} />} />;
}
