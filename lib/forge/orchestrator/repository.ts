import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveCourseCapabilities } from "@/lib/capabilities/course-capabilities";
import { domainNameFromRelation } from "@/lib/courses/presentation";
import type { CourseOperation, CoursePlanContext } from "./contracts";
import type { CoverContext } from "./media-contracts";
import { canManageCourseCover } from "@/lib/courses/cover-contracts";

type Client = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

// Cover context: identity-level metadata only, and only for the owner (the existing cover contract is owner-only).
export function createCoverRepository(client: Client, userId: string) {
  const clip = (value: string | null, max: number) => (value ?? "").trim().slice(0, max);
  return {
    async loadCover(courseId: string): Promise<CoverContext | null> {
      const { data: course, error } = await client.from("courses").select("title,subtitle,description,teacher_id,domains(name),level").eq("id", courseId).maybeSingle();
      if (error || !course || !canManageCourseCover(course.teacher_id, userId)) return null;
      const [modules, lessons] = await Promise.all([
        client.from("course_modules").select("title").eq("course_id", courseId).order("display_order").order("id").limit(12),
        client.from("lessons").select("objectives").eq("course_id", courseId).order("display_order").order("id").limit(60),
      ]);
      if (modules.error || lessons.error || !modules.data || !lessons.data) throw new Error("context_unavailable");
      const objectives = [...new Set(lessons.data.flatMap((lesson) => lesson.objectives ?? []).map((item: string) => clip(item, 240)).filter(Boolean))].slice(0, 12);
      return {
        title: clip(course.title, 260), subtitle: clip(course.subtitle, 300) || null, description: clip(course.description, 1200) || null,
        domain: domainNameFromRelation(course.domains), level: course.level ? clip(String(course.level), 60) : null,
        objectives, moduleTitles: modules.data.map((module) => clip(module.title, 240)).filter(Boolean),
      };
    },
  };
}

export function createCoursePlanRepository(client: Client, userId: string) {
  return {
    async load(courseId: string): Promise<CoursePlanContext | null> {
      const [{ data: course, error }, { data: membership, error: membershipError }] = await Promise.all([
        client.from("courses").select("id,title,subtitle,description,teacher_id,status,domains(name),level,duration_minutes").eq("id", courseId).maybeSingle(),
        client.from("course_memberships").select("role,status").eq("course_id", courseId).eq("user_id", userId).maybeSingle(),
      ]);
      if (error || !course) return null;
      if (course.teacher_id !== userId && membershipError) return null;
      const capabilities = resolveCourseCapabilities({ isOwner: course.teacher_id === userId, isEnrolled: false, courseStatus: course.status, membershipRole: membership?.role, membershipStatus: membership?.status });
      if (!capabilities.canEditMetadata || !capabilities.canEditStructure || !capabilities.canEditLessons) return null;
      const [modules, lessons, sources] = await Promise.all([
        client.from("course_modules").select("id,title,display_order").eq("course_id", courseId).order("display_order").order("id").limit(101),
        client.from("lessons").select("id,module_id,title,display_order,objectives,duration_minutes,content").eq("course_id", courseId).order("display_order").order("id").limit(501),
        client.from("course_sources").select("id", { count: "exact", head: true }).eq("course_id", courseId),
      ]);
      if (modules.error || lessons.error || sources.error || !modules.data || !lessons.data || modules.data.length > 100 || lessons.data.length > 500) throw new Error("context_unavailable");
      if (lessons.data.some((lesson) => !modules.data.some((module) => module.id === lesson.module_id))) throw new Error("context_unavailable");
      return {
        course: { id: course.id, title: course.title, subtitle: course.subtitle, description: course.description, domain: domainNameFromRelation(course.domains), level: course.level, durationMinutes: course.duration_minutes, sourceCount: sources.count ?? 0 },
        modules: modules.data.map((module) => ({ id: module.id, title: module.title, position: module.display_order, lessons: lessons.data.filter((lesson) => lesson.module_id === module.id).map((lesson) => ({
          id: lesson.id, moduleId: lesson.module_id, title: lesson.title, position: lesson.display_order, objectives: lesson.objectives, durationMinutes: lesson.duration_minutes,
          contentLength: typeof lesson.content === "string" ? lesson.content.length : 0, hasMedia: typeof lesson.content === "string" && /^:::(?:image|audio|video)\s*$/m.test(lesson.content),
        })) })),
      };
    },
    async write(courseId: string, operation: CourseOperation): Promise<"success" | "stale" | "failed"> {
      // Same authoring fields/permissions as create/actions, with compare-and-set added.
      // No slug, status, domain, order, content or ownership is writable here.
      const table = operation.target.kind === "course" ? "courses" : operation.target.kind === "module" ? "course_modules" : "lessons";
      const field = operation.type === "update_course_summary" ? "description" : operation.type === "update_lesson_objective" ? "objectives" : "title";
      const value = field === "objectives" ? operation.after.split("\n").map((item) => item.trim()) : operation.after;
      let mutation = client.from(table).update({ [field]: value }).eq("id", operation.target.id);
      mutation = operation.target.kind === "course" ? mutation.eq("id", courseId) : mutation.eq("course_id", courseId);
      if (operation.target.kind === "lesson") mutation = mutation.eq("module_id", operation.target.moduleId!);
      // PostgREST text[] equality: quote each literal, including commas/quotes/backslashes.
      const before = field === "objectives" && operation.before !== null ? `{${operation.before === "" ? "" : operation.before.split("\n").map((item) => JSON.stringify(item)).join(",")}}` : operation.before;
      mutation = before === null ? mutation.is(field, null) : mutation.eq(field, before);
      const { data, error } = await mutation.select("id").maybeSingle();
      if (error) return "failed";
      return data ? "success" : "stale";
    },
  };
}
