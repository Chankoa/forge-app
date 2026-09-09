import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAuthoringRelationship(courseId: string) {
  const client = await createServerSupabaseClient();
  if (!client) return { configured: false, isOwner: false, isEnrolled: false };
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { configured: true, isOwner: false, isEnrolled: false };
  const [{ data: course }, { data: enrollment }] = await Promise.all([
    client.from("courses").select("teacher_id").eq("id", courseId).maybeSingle(),
    client.from("enrollments").select("id").eq("course_id", courseId).maybeSingle(),
  ]);
  return { configured: true, isOwner: course?.teacher_id === user.id, isEnrolled: Boolean(enrollment) };
}

export async function listActiveDomains() {
  const client = await createServerSupabaseClient();
  if (!client) return [];
  const { data } = await client.from("domains").select("id,name").eq("status", "active").order("display_order");
  return (data ?? []) as Array<{ id: string; name: string }>;
}