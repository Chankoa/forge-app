"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadLibraryCourses } from "@/lib/library/library-repository";
import { deleteLibraryMedia, libraryDeleteMessages, type LibraryMediaDeleteResult } from "@/lib/library/media-delete";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Signed with the caller's session so Storage RLS stays authoritative. URLs are short-lived and never persisted.
async function signMedia(ids: string[]): Promise<Record<string, string>> {
  const valid = [...new Set(ids.filter((id) => uuid.test(id)))].slice(0, 24);
  if (!valid.length) return {};
  const client = await createServerSupabaseClient();
  if (!client) return {};
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return {};
  const courses = (await loadLibraryCourses(client, userData.user.id)).filter((c) => c.capabilities.canUploadMedia).map((c) => c.id);
  if (!courses.length) return {};
  const { data: rows } = await client.from("course_media_resources").select("id,storage_path").in("id", valid).in("course_id", courses).eq("storage_bucket", "course-media").eq("status", "ready");
  const list = ((rows ?? []) as { id: string; storage_path: string }[]).filter((row) => row.storage_path);
  if (!list.length) return {};
  const { data: signed } = await client.storage.from("course-media").createSignedUrls(list.map((row) => row.storage_path), 300);
  const result: Record<string, string> = {};
  for (const row of list) {
    const hit = signed?.find((entry) => entry.path === row.storage_path);
    if (hit?.signedUrl) result[row.id] = hit.signedUrl;
  }
  return result;
}

export async function getLibraryThumbnailsAction(ids: string[]): Promise<Record<string, string>> {
  try { return await signMedia(Array.isArray(ids) ? ids : []); } catch { return {}; }
}

export async function getLibraryMediaPreviewAction(id: string): Promise<{ ok: true; url: string } | { ok: false }> {
  try {
    const url = (await signMedia([String(id)]))[String(id)];
    return url ? { ok: true, url } : { ok: false };
  } catch { return { ok: false }; }
}

export async function deleteLibraryMediaAction(mediaId: string): Promise<LibraryMediaDeleteResult> {
  try {
    const client = await createServerSupabaseClient();
    if (!client || !uuid.test(String(mediaId))) return { ok: false, code: "not_found", error: libraryDeleteMessages.not_found };
    const result = await deleteLibraryMedia({
      getUserId: async () => (await client.auth.getUser()).data.user?.id ?? null,
      getMedia: async (id) => (await client.from("course_media_resources").select("id,course_id,storage_path,storage_bucket").eq("id", id).maybeSingle()).data ?? null,
      getCourseOwner: async (courseId) => (await client.from("courses").select("teacher_id").eq("id", courseId).maybeSingle()).data?.teacher_id ?? null,
      listLessonContents: async (courseId) => { const { data, error } = await client.from("lessons").select("content").eq("course_id", courseId); return error ? null : (data ?? []); },
      deleteRow: async (courseId, id) => { const { data, error } = await client.from("course_media_resources").delete().eq("id", id).eq("course_id", courseId).select("id"); return !error && (data?.length ?? 0) === 1; },
      removeFile: async (path) => { const { data, error } = await client.storage.from("course-media").remove([path]); return !error && (data?.length ?? 0) === 1; },
    }, { mediaId });
    if (result.ok || result.code === "storage_delete_failed") revalidatePath("/app/library");
    return result;
  } catch {
    return { ok: false, code: "db_delete_failed", error: libraryDeleteMessages.db_delete_failed };
  }
}
