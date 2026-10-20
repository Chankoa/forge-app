import { createServerSupabaseClient } from "@/lib/supabase/server";
import { evaluateCourseDeletionEligibility, type CourseDeletionEligibility } from "./course-management";

type ServerSupabaseClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

export async function getCourseStorageDependencyCount(client: ServerSupabaseClient, courseId: string, coverStoragePath: string | null) {
  const [media, resources, sources] = await Promise.all([
    client.from("course_media_resources").select("id", { count: "exact", head: true }).eq("course_id", courseId).not("storage_path", "is", null).neq("storage_path", ""),
    client.from("resources").select("id", { count: "exact", head: true }).eq("course_id", courseId).not("storage_path", "is", null).neq("storage_path", ""),
    client.from("course_sources").select("id", { count: "exact", head: true }).eq("course_id", courseId).not("storage_path", "is", null).neq("storage_path", ""),
  ]);
  if (media.error || resources.error || sources.error) return null;
  return (coverStoragePath?.trim() ? 1 : 0) + (media.count ?? 0) + (resources.count ?? 0) + (sources.count ?? 0);
}

export async function getCourseDeletionEligibility(courseId: string): Promise<CourseDeletionEligibility> {
  const client = await createServerSupabaseClient();
  if (!client) return { allowed: false, blocker: "unavailable", enrollmentCount: 0, storageDependencyCount: 0 };
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { allowed: false, blocker: "unavailable", enrollmentCount: 0, storageDependencyCount: 0 };
  const { data: course, error: courseError } = await client.from("courses").select("id,teacher_id,status,cover_storage_path").eq("id", courseId).maybeSingle();
  if (courseError || !course) return { allowed: false, blocker: "unavailable", enrollmentCount: 0, storageDependencyCount: 0 };
  const [enrollments, storageCount] = await Promise.all([
    client.from("enrollments").select("id", { count: "exact", head: true }).eq("course_id", courseId),
    getCourseStorageDependencyCount(client, courseId, course.cover_storage_path),
  ]);
  if (enrollments.error || storageCount === null) return { allowed: false, blocker: "unavailable", enrollmentCount: 0, storageDependencyCount: 0 };
  return evaluateCourseDeletionEligibility({ isOwner: course.teacher_id === user.id, status: course.status, enrollmentCount: enrollments.count ?? 0, storageDependencyCount: storageCount });
}
