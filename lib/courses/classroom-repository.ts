import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CourseDetail } from "./contracts";
import { classroomDataFromRows, type ClassroomData, type ClassroomEnrollmentRow, type ClassroomProfileRow, type ClassroomProgressRow } from "./classroom";

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