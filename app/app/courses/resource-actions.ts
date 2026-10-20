"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  RESOURCE_BUCKET,
  deleteLessonResource,
  lessonResourceMessages,
  listLessonResources,
  resolveResourcePdf,
  uploadPdfResource,
  type LessonResourceRow,
  type LessonResourceView,
  type ResourceDeleteResult,
  type ResourcePdfResult,
  type UploadResult,
} from "@/lib/forge/lesson-resources";

const columns = "id,course_id,lesson_id,title,file_name,file_size,mime_type,storage_bucket,storage_path,access";

async function context() {
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const base = {
    getUserId: async () => (await client.auth.getUser()).data.user?.id ?? null,
    getCourse: async (slug: string) => (await client.from("courses").select("id,teacher_id,status").eq("slug", slug).maybeSingle()).data ?? null,
    getResource: async (courseId: string, id: string) => ((await client.from("resources").select(columns).eq("id", id).eq("course_id", courseId).maybeSingle()).data as LessonResourceRow | null) ?? null,
    isEnrolled: async (courseId: string, userId: string) => Boolean((await client.from("enrollments").select("id").eq("course_id", courseId).eq("user_id", userId).maybeSingle()).data),
    lessonBelongs: async (courseId: string, lessonId: string) => Boolean((await client.from("lessons").select("id").eq("id", lessonId).eq("course_id", courseId).maybeSingle()).data),
    removeFile: async (path: string) => { const { data, error } = await client.storage.from(RESOURCE_BUCKET).remove([path]); if (error) console.error("[resources] file cleanup failed", { bucket: RESOURCE_BUCKET }); return !error && (data?.length ?? 0) === 1; },
  };
  return { client, base };
}

export async function listLessonResourcesAction(courseSlug: string, lessonId: string): Promise<LessonResourceView[]> {
  try {
    const ctx = await context();
    if (!ctx) return [];
    const { client, base } = ctx;
    return await listLessonResources({
      ...base,
      listResources: async (courseId, lesson) => ((await client.from("resources").select(columns).eq("course_id", courseId).eq("lesson_id", lesson).order("created_at")).data as LessonResourceRow[] | null) ?? [],
    }, { courseSlug, lessonId });
  } catch {
    return [];
  }
}

export async function getLessonResourcePdfUrlAction(courseSlug: string, resourceId: string): Promise<ResourcePdfResult> {
  try {
    const ctx = await context();
    if (!ctx) return { ok: false, code: "url_unavailable", error: lessonResourceMessages.url_unavailable };
    const { client, base } = ctx;
    // Signed with the caller's session, so Storage RLS stays authoritative. Never persisted.
    return await resolveResourcePdf({ ...base, createSignedUrl: async (path, ttl) => (await client.storage.from(RESOURCE_BUCKET).createSignedUrl(path, ttl)).data?.signedUrl ?? null }, { courseSlug, resourceId });
  } catch {
    return { ok: false, code: "url_unavailable", error: lessonResourceMessages.url_unavailable };
  }
}

export async function uploadLessonResourceAction(courseSlug: string, lessonId: string, formData: FormData): Promise<UploadResult> {
  try {
    const ctx = await context();
    if (!ctx) return { ok: false, code: "upload_failed", error: lessonResourceMessages.upload_failed };
    const { client, base } = ctx;
    const entry = formData.get("resource");
    const file = entry instanceof File ? entry : null;
    const head = file ? new Uint8Array(await file.slice(0, 8).arrayBuffer()) : new Uint8Array();
    const result = await uploadPdfResource({
      ...base,
      uniqueId: () => crypto.randomUUID(),
      uploadFile: async (path) => !(await client.storage.from(RESOURCE_BUCKET).upload(path, new Blob([file!], { type: "application/pdf" }), { contentType: "application/pdf", upsert: false })).error,
      insertRow: async (row) => {
        const { data, error } = await client.from("resources").insert({ title: row.title, type: "download", href: row.path, file_name: row.fileName, file_size: row.fileSize, mime_type: "application/pdf", storage_bucket: RESOURCE_BUCKET, storage_path: row.path, access: "enrolled", course_id: row.courseId, lesson_id: row.lessonId, created_by: row.userId }).select(columns).single();
        return error ? null : (data as LessonResourceRow);
      },
    }, { courseSlug, lessonId, file: file ? { name: file.name, type: file.type, size: file.size, head } : null });
    if (result.ok) revalidatePath(`/app/courses/${courseSlug}`);
    return result;
  } catch {
    return { ok: false, code: "upload_failed", error: lessonResourceMessages.upload_failed };
  }
}

export async function deleteLessonResourceAction(courseSlug: string, resourceId: string): Promise<ResourceDeleteResult> {
  try {
    const ctx = await context();
    if (!ctx) return { ok: false, code: "db_delete_failed", error: lessonResourceMessages.db_delete_failed };
    const { client, base } = ctx;
    const result = await deleteLessonResource({
      ...base,
      countPathReferences: async (path) => { const { count, error } = await client.from("resources").select("id", { count: "exact", head: true }).eq("storage_path", path); return error ? null : count ?? 0; },
      deleteRow: async (courseId, id) => { const { data, error } = await client.from("resources").delete().eq("id", id).eq("course_id", courseId).select("id"); return !error && (data?.length ?? 0) === 1; },
    }, { courseSlug, resourceId });
    if (result.ok || result.code === "storage_delete_failed") revalidatePath(`/app/courses/${courseSlug}`);
    return result;
  } catch {
    return { ok: false, code: "db_delete_failed", error: lessonResourceMessages.db_delete_failed };
  }
}
