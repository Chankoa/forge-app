import "server-only";
import type { createServerSupabaseClient } from "../supabase/server";
import type { ForgeReader } from "./context";
import { ForgeError } from "./contracts";
import { domainNameFromRelation } from "@/lib/courses/presentation";
import type { CourseMembershipRole, CourseMembershipStatus } from "@/lib/capabilities/course-capabilities";

type Client = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;
export function createForgeReader(client: Client): ForgeReader {
  return {
    async course(slug) {
      const { data, error } = await client.from("courses").select("id,teacher_id,title,description,status,level,domains(name)").eq("slug", slug).maybeSingle();
      if (error) throw new ForgeError("context_unavailable");
      return data ? { id: data.id, teacher_id: data.teacher_id, title: data.title, description: data.description, status: data.status, level: data.level, domain: domainNameFromRelation(data.domains) } : null;
    },
    async enrolled(courseId, userId) {
      const { data, error } = await client.from("enrollments").select("id").eq("course_id", courseId).eq("user_id", userId).maybeSingle();
      if (error) throw new ForgeError("context_unavailable");
      return Boolean(data);
    },
    async membership(courseId, userId) {
      const { data, error } = await client.from("course_memberships").select("role,status").eq("course_id", courseId).eq("user_id", userId).maybeSingle();
      if (error) throw new ForgeError("context_unavailable");
      return { role: (data?.role ?? null) as CourseMembershipRole | null, status: (data?.status ?? null) as CourseMembershipStatus | null };
    },
    async lesson(courseId, slug) {
      const { data, error } = await client.from("lessons").select("id,course_id,module_id,title,description,content,objectives").eq("course_id", courseId).eq("slug", slug).maybeSingle();
      if (error) throw new ForgeError("context_unavailable");
      return data;
    },
    async modules(courseId) {
      const { data, error } = await client.from("course_modules").select("id,title").eq("course_id", courseId).order("display_order");
      if (error) throw new ForgeError("context_unavailable");
      return data ?? [];
    },
    async lessonTitles(courseId) {
      const { data, error } = await client.from("lessons").select("module_id,title").eq("course_id", courseId).order("display_order");
      if (error) throw new ForgeError("context_unavailable");
      return data ?? [];
    },
    async sources(courseId, ids) {
      const { data, error } = await client.from("course_sources").select("id,course_id,title,type,source_kind,extraction_status,extracted_content,storage_bucket,storage_path,file_size,mime_type").eq("course_id", courseId).in("id", ids);
      if (error) throw new ForgeError("source_unavailable");
      return data ?? [];
    },
    async downloadText(source) {
      const { data, error } = await client.storage.from("course-sources").download(source.storage_path!);
      if (error || !data || data.size > 10 * 1024 * 1024) throw new ForgeError("source_unavailable");
      return data.text();
    },
  };
}
