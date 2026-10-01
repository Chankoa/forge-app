import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CourseMembershipRole, CourseMembershipStatus } from "@/lib/capabilities/course-capabilities";

export async function getAuthoringRelationship(courseId: string) {
  const client = await createServerSupabaseClient();
  if (!client) return { configured: false, isOwner: false, isEnrolled: false, membershipRole: null, membershipStatus: null };
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { configured: true, isOwner: false, isEnrolled: false, membershipRole: null, membershipStatus: null };
  const [{ data: course }, { data: enrollment }, { data: membership }] = await Promise.all([
    client.from("courses").select("teacher_id").eq("id", courseId).maybeSingle(),
    client.from("enrollments").select("id").eq("course_id", courseId).eq("user_id", user.id).maybeSingle(),
    client.from("course_memberships").select("role,status").eq("course_id", courseId).eq("user_id", user.id).maybeSingle(),
  ]);
  return {
    configured: true,
    isOwner: course?.teacher_id === user.id,
    isEnrolled: Boolean(enrollment),
    membershipRole: (membership?.role ?? null) as CourseMembershipRole | null,
    membershipStatus: (membership?.status ?? null) as CourseMembershipStatus | null,
  };
}

export async function listActiveDomains() {
  const client = await createServerSupabaseClient();
  if (!client) return [];
  const { data } = await client.from("domains").select("id,name").eq("status", "active").order("display_order");
  return (data ?? []) as Array<{ id: string; name: string }>;
}