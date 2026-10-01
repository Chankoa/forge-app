import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { domainNameFromRelation } from "@/lib/courses/presentation";
import type { CurriculumContext, SubjectCandidate } from "./contracts";
import { selectPlausibleCandidates, visiblePublishedCandidates } from "./candidates";
import { resolveCourseCapabilities, type CourseMembershipRole, type CourseMembershipStatus } from "@/lib/capabilities/course-capabilities";

type Client = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;
type CandidateRow = { id: string; slug: string; title: string; description: string | null; level: string | null; status: string | null; visibility: string | null; domains: { name: string } | { name: string }[] | null };

export async function getPublicCandidates(client: Client, intent: string): Promise<SubjectCandidate[]> {
  // Both predicates are explicit even when RLS also limits the session.
  const { data, error } = await client.from("courses")
    .select("id,slug,title,description,level,status,visibility,domains(name)")
    .eq("status", "published").eq("visibility", "public")
    .order("created_at", { ascending: false }).limit(80);
  if (error) throw new Error("candidate_lookup_failed");
  const candidates: SubjectCandidate[] = visiblePublishedCandidates((data ?? []) as CandidateRow[]).map((row) => ({ id: row.id, slug: row.slug, title: row.title, description: row.description, domain: domainNameFromRelation(row.domains), level: row.level }));
  return selectPlausibleCandidates(intent, candidates);
}

export async function getAuthorableCurriculumContext(client: Client, courseId: string, userId: string): Promise<CurriculumContext | null> {
  const { data: course, error } = await client.from("courses").select("id,title,description,subtitle,teacher_id,domains(name)").eq("id", courseId).maybeSingle();
  if (error || !course) return null;
  const { data: membership } = await client.from("course_memberships").select("role,status").eq("course_id", courseId).eq("user_id", userId).maybeSingle();
  const capabilities = resolveCourseCapabilities({ isOwner: course.teacher_id === userId, isEnrolled: false, membershipRole: (membership?.role ?? null) as CourseMembershipRole | null, membershipStatus: (membership?.status ?? null) as CourseMembershipStatus | null });
  if (!capabilities.canUseForge) return null;
  const [{ data: modules, error: modulesError }, { data: lessons, error: lessonsError }] = await Promise.all([
    client.from("course_modules").select("id,title,display_order").eq("course_id", courseId).order("display_order"),
    client.from("lessons").select("id,module_id,title,display_order,description,objectives").eq("course_id", courseId).order("display_order"),
  ]);
  if (modulesError || lessonsError) throw new Error("curriculum_lookup_failed");
  return {
    course: { id: course.id, title: course.title, description: course.description, domain: domainNameFromRelation(course.domains), objectives: course.subtitle },
    modules: (modules ?? []).map((module, position) => ({
      id: module.id, title: module.title, position,
      lessons: (lessons ?? []).filter((lesson) => lesson.module_id === module.id).map((lesson, lessonPosition) => ({ id: lesson.id, title: lesson.title, position: lessonPosition, objective: Array.isArray(lesson.objectives) ? lesson.objectives.slice(0, 2).join(" ; ").slice(0, 350) || null : null, summary: lesson.description?.slice(0, 280) ?? null })),
    })),
  };
}
