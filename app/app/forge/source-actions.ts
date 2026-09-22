"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assertForgeAccess } from "@/lib/forge/context";
import { classifyStorageUploadError, normalizeTextFile, safeUploadDiagnostic, sourceUploadMessage } from "@/lib/forge/source-upload";
import { fetchPublicText, UrlSourceError, validatePublicUrl } from "@/lib/forge/url-fetch";
import { extractUrlText } from "@/lib/forge/url-extract";

const requestSchema = z.object({
  courseSlug: z.string().trim().min(1).max(180).regex(/^[a-zA-Z0-9_-]+$/),
  mode: z.enum(["learn", "edit"]),
}).strict();

export type ForgeSourceOption = { id: string; title: string; type: string; url?: string; usable: boolean; reason?: "not_ready" | "extraction_unavailable" | "unsupported_type" };

const sourceFileSchema = z.object({
  name: z.string().trim().min(1).max(180),
  type: z.string().max(120),
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
    const { data, error } = await client.from("course_sources").select("id,title,type,source_kind,original_url,extraction_status,extracted_content,storage_bucket,storage_path,file_size,mime_type").eq("course_id", course.id).order("created_at");
    if (error) return [];
    return (data ?? []).map((source) => {
      const extracted = Boolean(source.extracted_content?.trim());
      const downloadable = source.source_kind === "file" && ["text", "markdown"].includes(source.type) && source.storage_bucket === "course-sources" && Boolean(source.storage_path) && Boolean(source.file_size) && source.file_size <= 10 * 1024 * 1024 && ["text/plain", "text/markdown"].includes(source.mime_type);
      const supported = ["text", "markdown", "pdf"].includes(source.type) && ["text", "file"].includes(source.source_kind) || source.type === "web" && source.source_kind === "url";
      const usable = supported && source.extraction_status === "ready" && (extracted || downloadable);
      return { id: source.id, title: source.title, type: source.source_kind === "url" ? "URL" : source.type.toUpperCase(), url: source.source_kind === "url" ? source.original_url ?? undefined : undefined, usable, reason: source.extraction_status !== "ready" ? "not_ready" : !supported ? "unsupported_type" : "extraction_unavailable" };
    });
  } catch {
    return [];
  }
}

export async function uploadForgeSourceAction(courseSlug: string, formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const file = formData.get("source");
  if (!(file instanceof File)) return { ok: false, error: "Choisissez un fichier TXT ou MD." };
  const normalized = normalizeTextFile(file.name);
  if (!normalized.ok) return { ok: false, error: sourceUploadMessage(normalized.code) };
  const mimeType = normalized.mimeType;
  const parsed = sourceFileSchema.safeParse({ name: file.name, type: mimeType, size: file.size });
  if (!parsed.success) return { ok: false, error: file.size > 10 * 1024 * 1024 ? sourceUploadMessage("file_too_large") : sourceUploadMessage("unsupported_type") };
  let content: string;
  try { content = (await file.text()).replace(/\u0000/g, "").trim(); } catch { return { ok: false, error: sourceUploadMessage("invalid_text_file") }; }
  if (!content) return { ok: false, error: "Le fichier ne contient aucun texte exploitable." };
  try {
    const client = await createServerSupabaseClient();
    if (!client) return { ok: false, error: "Supabase est indisponible." };
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { ok: false, error: "Votre session a expiré." };
    const { data: course } = await client.from("courses").select("id,teacher_id").eq("slug", courseSlug).maybeSingle();
    if (!course || course.teacher_id !== user.id) return { ok: false, error: "Vous ne pouvez pas ajouter une source à ce parcours." };
    const type = mimeType === "text/markdown" ? "markdown" : "text";
    const path = `${user.id}/${course.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const uploadBody = new Blob([file], { type: mimeType });
    const { error: uploadError } = await client.storage.from("course-sources").upload(path, uploadBody, { contentType: mimeType, upsert: false });
    if (uploadError) { const code = classifyStorageUploadError(uploadError); console.error("[forge] source upload failed", safeUploadDiagnostic("storage.upload", uploadError, "course-sources", path, true, true)); return { ok: false, error: sourceUploadMessage(code) }; }
    const { error: insertError } = await client.from("course_sources").insert({ teacher_id: user.id, course_id: course.id, title: file.name, type, file_name: file.name, storage_bucket: "course-sources", storage_path: path, mime_type: mimeType, file_size: file.size, metadata: {}, source_kind: "file", extracted_content: content, extraction_status: "ready" });
    if (insertError) { const { error: rollbackError } = await client.storage.from("course-sources").remove([path]); console.error("[forge] source insert failed", safeUploadDiagnostic("course_sources.insert", insertError, "course-sources", path, true, true)); if (rollbackError) console.error("[forge] source rollback failed", safeUploadDiagnostic("storage.remove", rollbackError, "course-sources", path, true, true)); return { ok: false, error: sourceUploadMessage("source_insert_failed") }; }
    revalidatePath(`/app/courses/${courseSlug}`);
    return { ok: true };
  } catch (error) {
    console.error("[forge] source upload failed", safeUploadDiagnostic("source-upload", error, "course-sources", "not-created", false, false));
    return { ok: false, error: sourceUploadMessage("unknown") };
  }
}

const urlMessages: Record<string, string> = { invalid_url: "URL non valide", unsupported_protocol: "URL non valide", private_address: "Adresse non autorisée", dns_resolution_failed: "Page inaccessible", redirect_blocked: "Adresse non autorisée", too_many_redirects: "Page inaccessible", timeout: "Page inaccessible", fetch_failed: "Page inaccessible", unsupported_content_type: "Type de contenu non pris en charge", content_too_large: "Page trop volumineuse", empty_content: "Contenu exploitable introuvable" };
export async function addForgeUrlSourceAction(courseSlug: string, rawUrl: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^[a-zA-Z0-9_-]{1,180}$/.test(courseSlug)) return { ok: false, error: "Parcours indisponible" };
  try {
    const url = validatePublicUrl(rawUrl);
    const client = await createServerSupabaseClient();
    if (!client) return { ok: false, error: "Page inaccessible" };
    const { data: { user } } = await client.auth.getUser();
    if (!user) return { ok: false, error: "Votre session a expiré." };
    const { data: course } = await client.from("courses").select("id,teacher_id").eq("slug", courseSlug).maybeSingle();
    if (!course || course.teacher_id !== user.id) return { ok: false, error: "Vous ne pouvez pas ajouter une source à ce parcours." };
    const fetched = await fetchPublicText(url.href);
    const extracted = extractUrlText(fetched.body, fetched.mimeType);
    const { error } = await client.from("course_sources").insert({ teacher_id: user.id, course_id: course.id, title: extracted.title || new URL(fetched.url).hostname, type: "web", source_kind: "url", original_url: fetched.url, mime_type: fetched.mimeType, extracted_content: extracted.text, extraction_status: "ready", metadata: { rawChars: fetched.rawChars, extractedChars: extracted.extractedChars } });
    if (error) return { ok: false, error: "Impossible d’enregistrer la source." };
    revalidatePath(`/app/courses/${courseSlug}`);
    return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof UrlSourceError ? urlMessages[error.code] : "Page inaccessible" }; }
}
