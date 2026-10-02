import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CourseDetail, CourseOutline } from "./contracts";
import { classroomDataFromRows, classroomLearnerDetailFromRows, globalClassroomOverviewFromRows, type ClassroomData, type ClassroomEnrollmentRow, type ClassroomLearnerDetail, type ClassroomProfileRow, type ClassroomProgressRow, type GlobalClassroomOverview } from "./classroom";

export type { ClassroomData } from "./classroom";

export async function getCourseClassroom(course: CourseDetail): Promise<ClassroomData | null> {
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const { data: ownedCourse } = await client.from("courses").select("teacher_id").eq("id", course.id).maybeSingle();
  if (ownedCourse?.teacher_id !== user.id) return null;

  const [{ data: enrollmentData, error: enrollmentError }, { data: progressData, error: progressError }] = await Promise.all([
    client.from("enrollments").select("user_id,status,current_lesson_id").eq("course_id", course.id),
    client.from("lesson_progress").select("user_id,lesson_id,completed").eq("course_id", course.id),
  ]);
  if (enrollmentError || progressError) return null;
  const enrollments = (enrollmentData ?? []) as ClassroomEnrollmentRow[];
  const learnerIds = Array.from(new Set(enrollments.map((enrollment) => enrollment.user_id)));
  const { data: profileData, error: profileError } = learnerIds.length ? await client.from("profiles").select("id,name").in("id", learnerIds) : { data: [], error: null };
  if (profileError) return null;

  return classroomDataFromRows(course.outline, enrollments, (progressData ?? []) as ClassroomProgressRow[], (profileData ?? []) as ClassroomProfileRow[]);
}

export async function getCourseClassroomLearnerDetail(course: CourseDetail, learnerId: string): Promise<ClassroomLearnerDetail | null> {
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const { data: ownedCourse } = await client.from("courses").select("teacher_id").eq("id", course.id).maybeSingle();
  if (ownedCourse?.teacher_id !== user.id) return null;

  const { data: enrollmentData, error: enrollmentError } = await client.from("enrollments").select("user_id,status,current_lesson_id").eq("course_id", course.id).eq("user_id", learnerId).maybeSingle();
  if (enrollmentError || !enrollmentData) return null;
  const [{ data: progressData, error: progressError }, { data: profileData, error: profileError }] = await Promise.all([
    client.from("lesson_progress").select("user_id,lesson_id,completed").eq("course_id", course.id).eq("user_id", learnerId),
    client.from("profiles").select("id,name").eq("id", learnerId).maybeSingle(),
  ]);
  if (progressError || profileError) return null;

  return classroomLearnerDetailFromRows(course.outline, enrollmentData as ClassroomEnrollmentRow, (progressData ?? []) as ClassroomProgressRow[], (profileData ?? undefined) as ClassroomProfileRow | undefined);
}

export async function getGlobalClassroomOverview(): Promise<GlobalClassroomOverview[]> {
  const client = await createServerSupabaseClient();
  if (!client) return [];
  const { data: { user } } = await client.auth.getUser();
  if (!user) return [];
  const { data: courseData, error: courseError } = await client.from("courses").select("id,slug,title,status,visibility").eq("teacher_id", user.id).order("title");
  if (courseError || !courseData?.length) return [];
  const courseIds = courseData.map((course: { id: string }) => course.id);
  const [{ data: moduleData, error: moduleError }, { data: lessonData, error: lessonError }, { data: enrollmentData, error: enrollmentError }, { data: progressData, error: progressError }] = await Promise.all([
    client.from("course_modules").select("id,course_id,title,display_order").in("course_id", courseIds).order("display_order"),
    client.from("lessons").select("id,course_id,module_id,slug,title,duration_minutes,type,status,display_order").in("course_id", courseIds).order("display_order"),
    client.from("enrollments").select("course_id,user_id,status,current_lesson_id").in("course_id", courseIds),
    client.from("lesson_progress").select("course_id,user_id,lesson_id,completed").in("course_id", courseIds),
  ]);
  if (moduleError || lessonError || enrollmentError || progressError) return [];
  const modules = (moduleData ?? []) as Array<{ id: string; course_id: string; title: string }>;
  const lessons = (lessonData ?? []) as Array<{ id: string; course_id: string; module_id: string; slug: string; title: string; duration_minutes: number | null; type: string; status: string }>;
  const courses = courseData.map((course: { id: string; slug: string; title: string; status: string | null; visibility: string | null }) => ({
    ...course,
    outline: modules.filter((module) => module.course_id === course.id).map((module): CourseOutline[number] => ({
      id: module.id,
      moduleTitle: module.title,
      lessons: lessons.filter((lesson) => lesson.course_id === course.id && lesson.module_id === module.id).map((lesson) => ({ id: lesson.id, slug: lesson.slug, title: lesson.title, description: null, content: null, objectives: [], durationMinutes: lesson.duration_minutes, contentType: lesson.type, publishingStatus: lesson.status, status: "not-started" })),
    })),
  }));
  return globalClassroomOverviewFromRows(courses, (enrollmentData ?? []) as Array<ClassroomEnrollmentRow & { course_id: string }>, (progressData ?? []) as Array<ClassroomProgressRow & { course_id: string }>);
}