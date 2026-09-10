"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assertForgeAccess } from "@/lib/forge/context";

const requestSchema = z.object({
  courseSlug: z.string().trim().min(1).max(180).regex(/^[a-zA-Z0-9_-]+$/),
  mode: z.enum(["learn", "edit"]),
}).strict();

export type ForgeSourceOption = { id: string; title: string; type: string; usable: boolean; reason?: "not_ready" | "extraction_unavailable" | "unsupported_type" };

const sourceFileSchema = z.object({
  name: z.string().trim().min(1).max(180),
  type: z.enum(["text/plain", "text/markdown"]),
  size: z.number().int().positive().max(10 * 1024 * 1024),
});

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

export async function uploadForgeSourceAction(courseSlug: string, formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const file = formData.get("source");
  if (!(file instanceof File)) return { ok: false, error: "Choisissez un fichier TXT ou MD." };
  const parsed = sourceFileSchema.safeParse({ name: file.name, type: file.type, size: file.size });
  if (!parsed.success || !/\.(txt|md)$/i.test(file.name)) return { ok: false, error: "Forge accepte uniquement les fichiers TXT et MD de moins de 10 Mo." };
  const content = (await file.text()).replace(/\u0000/g, "").trim();
  if (!content) return { ok: false, error: "Le fichier ne contient aucun texte exploitable." };
  try {
    const client = await createServerSupabaseClient();
    if (!client) return { ok: false, error: "Supabase est indisponible." };
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { ok: false, error: "Votre session a expiré." };
    const { data: course } = await client.from("courses").select("id,teacher_id").eq("slug", courseSlug).maybeSingle();
    if (!course || course.teacher_id !== user.id) return { ok: false, error: "Vous ne pouvez pas ajouter une source à ce parcours." };
    const type = file.type === "text/markdown" ? "markdown" : "text";
    const path = `${user.id}/${course.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error: uploadError } = await client.storage.from("course-sources").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) return { ok: false, error: "Le fichier n'a pas pu être téléversé." };
    const { error: insertError } = await client.from("course_sources").insert({ teacher_id: user.id, course_id: course.id, title: file.name, type, file_name: file.name, storage_bucket: "course-sources", storage_path: path, mime_type: file.type, file_size: file.size, metadata: {}, source_kind: "file", extracted_content: content, extraction_status: "ready" });
    if (insertError) { await client.storage.from("course-sources").remove([path]); return { ok: false, error: "La source n'a pas pu être enregistrée." }; }
    revalidatePath(`/app/courses/${courseSlug}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "La source n'a pas pu être ajoutée." };
  }
}