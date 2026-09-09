import "server-only";

import type { CourseDetail, CourseLesson, CourseOutline, CourseSummary } from "./contracts";
import type { EnrollmentState, LearningState } from "@/lib/learning/contracts";
import { progressPercentage, resolveContinueLessonId } from "@/lib/learning/progress";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CourseRow = { id: string; slug: string; title: string; subtitle: string | null; description: string | null; status: string | null; visibility: string | null; duration_minutes: number | null; domains: { name: string }[] | null };
type ModuleRow = { id: string; title: string; display_order: number };
type LessonRow = { id: string; module_id: string; slug: string; title: string; description: string | null; content: string | null; objectives: string[] | null; duration_minutes: number | null; display_order: number };
type EnrollmentRow = { id: string; course_id: string; status: EnrollmentState["status"]; current_lesson_id: string | null };
type ProgressRow = { lesson_id: string; completed: boolean; updated_at: string };

function mapSummary(row: CourseRow): CourseSummary { return { id: row.id, slug: row.slug, title: row.title, description: row.description, domain: row.domains?.[0]?.name ?? null, status: row.status, durationMinutes: row.duration_minutes }; }

export async function getCourseDetail(courseSlug: string): Promise<CourseDetail | null> {
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const { data: courseData, error: courseError } = await client.from("courses").select("id,slug,title,subtitle,description,status,visibility,duration_minutes,domains(name)").eq("slug", courseSlug).maybeSingle();
  if (courseError || !courseData) return null;
  const course = courseData as CourseRow;
  const [{ data: moduleData, error: moduleError }, { data: lessonData, error: lessonError }] = await Promise.all([
    client.from("course_modules").select("id,title,display_order").eq("course_id", course.id).order("display_order"),
    client.from("lessons").select("id,module_id,slug,title,description,content,objectives,duration_minutes,display_order").eq("course_id", course.id).order("display_order"),
  ]);
  if (moduleError || lessonError) return null;
  const lessons = (lessonData ?? []) as LessonRow[];
  const outline: CourseOutline = ((moduleData ?? []) as ModuleRow[]).map((module) => ({ id: module.id, moduleTitle: module.title, lessons: lessons.filter((lesson) => lesson.module_id === module.id).map((lesson): CourseLesson => ({ id: lesson.id, slug: lesson.slug, title: lesson.title, description: lesson.description, content: lesson.content, objectives: lesson.objectives ?? [], durationMinutes: lesson.duration_minutes, status: "not-started" })) }));
  return { ...mapSummary(course), subtitle: course.subtitle, visibility: course.visibility, outline };
}

export async function getLearningState(course: CourseDetail): Promise<LearningState> {
  const client = await createServerSupabaseClient();
  if (!client) return { enrollment: null, progress: [], completedLessonIds: new Set(), percentage: 0, continueLessonId: null };
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { enrollment: null, progress: [], completedLessonIds: new Set(), percentage: 0, continueLessonId: null };
  const { data: enrollmentData } = await client.from("enrollments").select("id,course_id,status,current_lesson_id").eq("course_id", course.id).maybeSingle();
  const enrollment = enrollmentData as EnrollmentRow | null;
  if (!enrollment) return { enrollment: null, progress: [], completedLessonIds: new Set(), percentage: 0, continueLessonId: null };
  const { data: progressData } = await client.from("lesson_progress").select("lesson_id,completed,updated_at").eq("course_id", course.id);
  const progress = (progressData ?? []) as ProgressRow[];
  const completedLessonIds = new Set(progress.filter((item) => item.completed).map((item) => item.lesson_id));
  return { enrollment: { id: enrollment.id, courseId: enrollment.course_id, status: enrollment.status, currentLessonId: enrollment.current_lesson_id }, progress: progress.map((item) => ({ lessonId: item.lesson_id, completed: item.completed, updatedAt: item.updated_at })), completedLessonIds, percentage: progressPercentage(course.outline.flatMap((module) => module.lessons).length, completedLessonIds), continueLessonId: resolveContinueLessonId(course.outline, progress.map((item) => ({ lessonId: item.lesson_id, completed: item.completed, updatedAt: item.updated_at })), enrollment.current_lesson_id) };
}

export async function listMyLearningCourses(): Promise<Array<{ course: CourseDetail; state: LearningState }>> {
  const client = await createServerSupabaseClient();
  if (!client) return [];
  const { data: enrollments } = await client.from("enrollments").select("course_id").order("last_accessed_at", { ascending: false, nullsFirst: false });
  const courseIds = Array.from(new Set((enrollments ?? []).map((item: { course_id: string }) => item.course_id)));
  const details = await Promise.all(courseIds.map(async (courseId) => { const { data } = await client.from("courses").select("slug").eq("id", courseId).maybeSingle(); return data?.slug ? getCourseDetail(data.slug) : null; }));
  return (await Promise.all(details.filter((detail): detail is CourseDetail => Boolean(detail)).map(async (course) => ({ course, state: await getLearningState(course) }))));
}

export async function listMyCourses(): Promise<Array<{ course: CourseDetail; state: LearningState; isOwner: boolean }>> {
  const client = await createServerSupabaseClient();
  if (!client) return [];
  const { data: { user } } = await client.auth.getUser();
  if (!user) return [];
  const [{ data: enrollments }, { data: authored }] = await Promise.all([
    client.from("enrollments").select("course_id"),
    client.from("courses").select("id,slug").eq("teacher_id", user.id),
  ]);
  const authoredById = new Map((authored ?? []).map((course: { id: string; slug: string }) => [course.id, course.slug]));
  const courseIds = new Set([...(enrollments ?? []).map((item: { course_id: string }) => item.course_id), ...authoredById.keys()]);
  const details = await Promise.all([...courseIds].map(async (courseId) => {
    const slug = authoredById.get(courseId) ?? (await client.from("courses").select("slug").eq("id", courseId).maybeSingle()).data?.slug;
    return slug ? getCourseDetail(slug) : null;
  }));
  return Promise.all(details.filter((course): course is CourseDetail => Boolean(course)).map(async (course) => ({ course, state: await getLearningState(course), isOwner: authoredById.has(course.id) })));
}