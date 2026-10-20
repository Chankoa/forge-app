import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { libraryAccess, mediaReferenceMap, normalizeMedia, normalizeResource, normalizeSource, type LibraryContext, type LibraryCourse, type LibraryItem, type MediaRow, type ResourceRow, type SourceRow } from "./library-items";

const LIMIT = 500;
type CourseRow = { id: string; slug: string; title: string; teacher_id: string; status: string | null };

// Courses the user owns or actively edits. Viewers and learners get nothing: the Library is a creator surface.
export async function loadLibraryCourses(client: SupabaseClient, userId: string): Promise<LibraryCourse[]> {
  const [owned, memberships] = await Promise.all([
    client.from("courses").select("id,slug,title,teacher_id,status").eq("teacher_id", userId).limit(LIMIT),
    client.from("course_memberships").select("course_id,role,status").eq("user_id", userId).eq("status", "active").eq("role", "editor").limit(LIMIT),
  ]);
  const courses = new Map<string, LibraryCourse>();
  for (const row of (owned.data ?? []) as CourseRow[]) courses.set(row.id, { id: row.id, slug: row.slug, title: row.title, ownerId: row.teacher_id, status: row.status, role: "owner", capabilities: libraryAccess({ isOwner: true, courseStatus: row.status }).capabilities });
  const editorIds = ((memberships.data ?? []) as { course_id: string }[]).map((row) => row.course_id).filter((id) => !courses.has(id));
  if (editorIds.length) {
    const { data } = await client.from("courses").select("id,slug,title,teacher_id,status").in("id", editorIds);
    for (const row of (data ?? []) as CourseRow[]) courses.set(row.id, { id: row.id, slug: row.slug, title: row.title, ownerId: row.teacher_id, status: row.status, role: "editor", capabilities: libraryAccess({ isOwner: false, courseStatus: row.status, membershipRole: "editor", membershipStatus: "active" }).capabilities });
  }
  return [...courses.values()];
}

export async function loadLibraryItems(client: SupabaseClient, userId: string): Promise<{ items: LibraryItem[]; courses: LibraryCourse[] }> {
  const courses = await loadLibraryCourses(client, userId);
  if (!courses.length) return { items: [], courses };
  const mediaCourseIds = courses.filter((c) => c.capabilities.canUploadMedia).map((c) => c.id);
  const ownedIds = courses.filter((c) => c.capabilities.canManageResources).map((c) => c.id);
  const sourceIds = courses.filter((c) => c.capabilities.canManageSources).map((c) => c.id);
  const allIds = courses.map((c) => c.id);
  const empty = Promise.resolve({ data: [] as unknown[] });
  const [media, resources, sources, lessons, modules] = await Promise.all([
    mediaCourseIds.length ? client.from("course_media_resources").select("id,course_id,created_by,storage_path,kind,mime_type,file_size,title,alt_text,caption,status,created_at").in("course_id", mediaCourseIds).order("created_at", { ascending: false }).limit(LIMIT) : empty,
    ownedIds.length ? client.from("resources").select("id,course_id,module_id,lesson_id,title,type,href,file_name,file_size,mime_type,storage_bucket,storage_path,access,created_by,created_at").in("course_id", ownedIds).order("created_at", { ascending: false }).limit(LIMIT) : empty,
    sourceIds.length ? client.from("course_sources").select("id,course_id,teacher_id,title,type,source_kind,original_url,extraction_status,file_name,file_size,mime_type,storage_path,created_at").in("course_id", sourceIds).eq("teacher_id", userId).order("created_at", { ascending: false }).limit(LIMIT) : empty,
    client.from("lessons").select("id,slug,title,module_id,course_id,content").in("course_id", allIds).limit(LIMIT * 4),
    client.from("modules").select("id,title,course_id").in("course_id", allIds).limit(LIMIT * 2),
  ]);
  const lessonRows = (lessons.data ?? []) as { id: string; slug: string; title: string; module_id: string | null; course_id: string; content: string | null }[];
  const mediaCourses = new Set(mediaCourseIds);
  const context: LibraryContext = {
    courses: new Map(courses.map((c) => [c.id, c])),
    lessons: new Map(lessonRows.map((l) => [l.id, { id: l.id, slug: l.slug, title: l.title, moduleId: l.module_id, courseId: l.course_id }])),
    modules: new Map(((modules.data ?? []) as { id: string; title: string }[]).map((m) => [m.id, { id: m.id, title: m.title }])),
    references: mediaReferenceMap(lessonRows.filter((l) => mediaCourses.has(l.course_id))),
  };
  const items = [
    ...((media.data ?? []) as MediaRow[]).map((r) => normalizeMedia(r, context)),
    ...((resources.data ?? []) as ResourceRow[]).map((r) => normalizeResource(r, context)),
    ...((sources.data ?? []) as SourceRow[]).map((r) => normalizeSource(r, context)),
  ].filter((item): item is LibraryItem => item !== null);
  items.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  return { items, courses };
}
