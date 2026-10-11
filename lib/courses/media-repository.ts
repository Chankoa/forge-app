import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mediaResourceSchema, type MediaPresentation } from "./media-contracts";

type MediaRow = {
  id: string; course_id: string; created_by: string; storage_bucket: "course-media"; storage_path: string; kind: "image" | "audio" | "video"; mime_type: string; file_size: number | null;
  title: string | null; alt_text: string | null; caption: string | null; duration_seconds: number | null;
  status: "ready" | "unavailable"; created_at: string; updated_at: string;
};

export async function resolveCourseMediaResources(client: SupabaseClient, courseId: string, ids: readonly string[]): Promise<Record<string, MediaPresentation>> {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) return {};
  const { data, error } = await client.from("course_media_resources").select("id,course_id,created_by,storage_bucket,storage_path,kind,mime_type,file_size,title,alt_text,caption,duration_seconds,status,created_at,updated_at").eq("course_id", courseId).eq("storage_bucket", "course-media").in("id", uniqueIds);
  if (error) return Object.fromEntries(uniqueIds.map((id) => [id, { id, kind: "image" as const, url: null, title: null, altText: null, caption: null, durationSeconds: null, status: "unavailable" as const }]));
  const result: Record<string, MediaPresentation> = {};
  for (const row of (data ?? []) as MediaRow[]) {
    const parsed = mediaResourceSchema.safeParse({ id: row.id, courseId: row.course_id, createdBy: row.created_by, storageBucket: row.storage_bucket, storagePath: row.storage_path, kind: row.kind, mimeType: row.mime_type, fileSize: row.file_size, title: row.title, altText: row.alt_text, caption: row.caption, durationSeconds: row.duration_seconds, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at });
    if (!parsed.success || row.status !== "ready") {
      result[row.id] = { id: row.id, kind: row.kind, url: null, title: row.title, altText: row.alt_text, caption: row.caption, durationSeconds: row.duration_seconds, status: "unavailable" };
      continue;
    }
    const signed = await client.storage.from("course-media").createSignedUrl(row.storage_path, 300);
    result[row.id] = { id: row.id, kind: row.kind, url: signed.error ? null : signed.data.signedUrl, title: row.title, altText: row.alt_text, caption: row.caption, durationSeconds: row.duration_seconds, status: signed.error ? "unavailable" : "ready" };
  }
  for (const id of uniqueIds) if (!result[id]) result[id] = { id, kind: "image", url: null, title: null, altText: null, caption: null, durationSeconds: null, status: "unavailable" };
  return result;
}
