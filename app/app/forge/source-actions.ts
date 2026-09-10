"use server";

import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assertForgeAccess } from "@/lib/forge/context";

const requestSchema = z.object({
  courseSlug: z.string().trim().min(1).max(180).regex(/^[a-zA-Z0-9_-]+$/),
  mode: z.enum(["learn", "edit"]),
}).strict();

export type ForgeSourceOption = { id: string; title: string; type: string; usable: boolean; reason?: "not_ready" | "extraction_unavailable" | "unsupported_type" };

export async function listForgeSourcesAction(raw: unknown): Promise<ForgeSourceOption[]> {
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return [];
  try {
    const client = await createServerSupabaseClient();
    if (!client) return [];
    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];
    const { data: course } = await client.from("courses").select("id,teacher_id").eq("slug", parsed.data.courseSlug).maybeSingle();
    if (!course) return [];
    const { data: enrollment } = await client.from("enrollments").select("id").eq("course_id", course.id).eq("user_id", user.id).maybeSingle();
    assertForgeAccess(parsed.data.mode, course.teacher_id === user.id, Boolean(enrollment));
    const { data, error } = await client.from("course_sources").select("id,title,type,source_kind,extraction_status,extracted_content,storage_bucket,storage_path,file_size,mime_type").eq("course_id", course.id).order("created_at");
    if (error) return [];
    return (data ?? []).map((source) => {
      const extracted = Boolean(source.extracted_content?.trim());
      const downloadable = source.source_kind === "file" && ["text", "markdown"].includes(source.type) && source.storage_bucket === "course-sources" && Boolean(source.storage_path) && Boolean(source.file_size) && source.file_size <= 10 * 1024 * 1024 && ["text/plain", "text/markdown"].includes(source.mime_type);
      const usable = source.extraction_status === "ready" && (extracted || downloadable);
      return { id: source.id, title: source.title, type: source.type.toUpperCase(), usable, reason: source.extraction_status !== "ready" ? "not_ready" : !["text", "markdown", "pdf"].includes(source.type) ? "unsupported_type" : "extraction_unavailable" };
    });
  } catch {
    return [];
  }
}