export const SOURCE_BUCKET = "course-sources";
export const PDF_SIGNED_URL_TTL_SECONDS = 300;

export type SourceResourceRow = {
  id: string;
  course_id: string | null;
  type: string;
  source_kind: string;
  storage_bucket: string | null;
  storage_path: string | null;
  mime_type: string | null;
  title?: string | null;
  file_size?: number | null;
};

export type SourceResourceError = "invalid_request" | "unauthenticated" | "permission_denied" | "not_found" | "not_pdf" | "url_unavailable" | "resource_in_use" | "invalid_storage_path" | "db_delete_failed" | "storage_delete_failed";

export const sourceResourceMessages: Record<SourceResourceError, string> = {
  invalid_request: "Source indisponible.",
  unauthenticated: "Votre session a expiré.",
  permission_denied: "Vous n’avez pas accès à cette source.",
  not_found: "Source indisponible.",
  not_pdf: "Le document ne peut pas être affiché.",
  url_unavailable: "Le document ne peut pas être affiché.",
  resource_in_use: "Cette source est encore utilisée ailleurs.",
  invalid_storage_path: "Impossible de supprimer cette source.",
  db_delete_failed: "Impossible de supprimer cette source.",
  storage_delete_failed: "Impossible de supprimer cette source.",
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-zA-Z0-9_-]{1,180}$/;

export const isValidResourceId = (value: unknown): value is string => typeof value === "string" && uuidPattern.test(value);
export const isValidCourseSlug = (value: unknown): value is string => typeof value === "string" && slugPattern.test(value);

export function isPdfSource(row: Pick<SourceResourceRow, "type" | "source_kind" | "storage_bucket" | "storage_path" | "mime_type">) {
  return row.type === "pdf" && row.source_kind === "file" && row.mime_type === "application/pdf" && row.storage_bucket === SOURCE_BUCKET && Boolean(row.storage_path);
}

// Upload contract: {userId}/{courseId}/{uuid}-{filename}. Anything else (historic brief paths, traversal) is never removed.
export function isOwnedCoursePath(path: string, userId: string, courseId: string) {
  const parts = path.split("/");
  return parts.length === 3 && parts[0] === userId && parts[1] === courseId && parts[2].length > 0 && !parts.some((part) => part === "." || part === ".." || part.includes("\\"));
}

type CourseRow = { id: string; teacher_id: string };

type BaseDeps = {
  getUserId(): Promise<string | null>;
  getCourse(slug: string): Promise<CourseRow | null>;
  getSource(courseId: string, sourceId: string): Promise<SourceResourceRow | null>;
};

export type PdfAccessDeps = BaseDeps & {
  createSignedUrl(path: string, expiresIn: number): Promise<string | null>;
};

export type DeleteDeps = BaseDeps & {
  countPathReferences(bucket: string, path: string): Promise<number | null>;
  deleteRow(courseId: string, sourceId: string): Promise<boolean>;
  removeFile(path: string): Promise<boolean>;
};

export type PdfAccessResult = { ok: true; url: string; title: string; fileSize: number | null; expiresIn: number } | { ok: false; code: SourceResourceError; error: string };
export type DeleteResult = { ok: true; storageRemoved: boolean } | { ok: false; code: SourceResourceError; error: string };

const fail = (code: SourceResourceError) => ({ ok: false as const, code, error: sourceResourceMessages[code] });

export async function resolvePdfAccess(deps: PdfAccessDeps, input: { courseSlug: unknown; sourceId: unknown }): Promise<PdfAccessResult> {
  if (!isValidCourseSlug(input.courseSlug) || !isValidResourceId(input.sourceId)) return fail("invalid_request");
  const userId = await deps.getUserId();
  if (!userId) return fail("unauthenticated");
  const course = await deps.getCourse(input.courseSlug);
  if (!course) return fail("not_found");
  // Sources are Forge working context, not learner material: owner only, enrollment never grants access.
  if (course.teacher_id !== userId) return fail("permission_denied");
  const source = await deps.getSource(course.id, input.sourceId);
  if (!source || source.course_id !== course.id) return fail("not_found");
  if (!isPdfSource(source)) return fail("not_pdf");
  const url = await deps.createSignedUrl(source.storage_path!, PDF_SIGNED_URL_TTL_SECONDS);
  if (!url) return fail("url_unavailable");
  return { ok: true, url, title: source.title ?? "Document PDF", fileSize: source.file_size ?? null, expiresIn: PDF_SIGNED_URL_TTL_SECONDS };
}

export async function deleteSourceResource(deps: DeleteDeps, input: { courseSlug: unknown; sourceId: unknown }): Promise<DeleteResult> {
  if (!isValidCourseSlug(input.courseSlug) || !isValidResourceId(input.sourceId)) return fail("invalid_request");
  const userId = await deps.getUserId();
  if (!userId) return fail("unauthenticated");
  const course = await deps.getCourse(input.courseSlug);
  if (!course) return fail("not_found");
  if (course.teacher_id !== userId) return fail("permission_denied");
  const source = await deps.getSource(course.id, input.sourceId);
  if (!source || source.course_id !== course.id) return fail("not_found");
  const hasFile = Boolean(source.storage_path || source.storage_bucket);
  if (hasFile) {
    if (source.storage_bucket !== SOURCE_BUCKET || !source.storage_path || !isOwnedCoursePath(source.storage_path, userId, course.id)) return fail("invalid_storage_path");
    const references = await deps.countPathReferences(source.storage_bucket, source.storage_path);
    if (references === null) return fail("db_delete_failed");
    if (references > 1) return fail("resource_in_use");
  }
  // DB first: a DB constraint can still veto deletion before any file is destroyed.
  // A failed file removal afterwards leaves an unreferenced object (logged by the caller), never a row pointing at a missing file.
  if (!(await deps.deleteRow(course.id, source.id))) return fail("db_delete_failed");
  if (!hasFile) return { ok: true, storageRemoved: false };
  if (!(await deps.removeFile(source.storage_path!))) return fail("storage_delete_failed");
  return { ok: true, storageRemoved: true };
}

export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return null;
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
