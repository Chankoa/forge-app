export const RESOURCE_BUCKET = "resources";
export const RESOURCE_MAX_BYTES = 10 * 1024 * 1024;
export const RESOURCE_PDF_TTL_SECONDS = 300;

export const lessonResourceMessages = {
  invalid_request: "Ressource indisponible.",
  unauthenticated: "Votre session a expiré.",
  permission_denied: "Vous n’avez pas accès à cette ressource.",
  not_found: "Ressource indisponible.",
  not_pdf: "Le document ne peut pas être affiché.",
  url_unavailable: "Le document ne peut pas être affiché.",
  invalid_storage_path: "Impossible de supprimer cette ressource.",
  resource_in_use: "Cette ressource est encore utilisée ailleurs.",
  db_delete_failed: "Impossible de supprimer cette ressource.",
  storage_delete_failed: "Impossible de supprimer cette ressource.",
  no_file: "Choisissez un fichier PDF.",
  empty_file: "Le fichier est vide.",
  file_too_large: "Le fichier ne peut pas dépasser 10 Mo.",
  unsupported_type: "Seuls les fichiers PDF sont acceptés.",
  upload_failed: "Le téléversement a échoué. Réessayez.",
  insert_failed: "La ressource n’a pas pu être enregistrée.",
} as const;
export type LessonResourceError = keyof typeof lessonResourceMessages;

export type LessonResourceRow = {
  id: string;
  course_id: string | null;
  lesson_id: string | null;
  title: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  access: string;
};
export type LessonResourceView = { id: string; title: string; fileSize?: number };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === "string" && uuidPattern.test(value);
const slugPattern = /^[a-zA-Z0-9_-]{1,180}$/;
const fail = <C extends LessonResourceError>(code: C) => ({ ok: false as const, code, error: lessonResourceMessages[code] });
type Failure<C extends LessonResourceError> = { ok: false; code: C; error: string };

export function isPdfResource(row: Pick<LessonResourceRow, "mime_type" | "storage_bucket" | "storage_path">) {
  return row.mime_type === "application/pdf" && row.storage_bucket === RESOURCE_BUCKET && Boolean(row.storage_path);
}

export function toLessonResourceView(row: LessonResourceRow): LessonResourceView {
  return { id: row.id, title: row.title, fileSize: row.file_size ?? undefined };
}

// Contract shared with the existing bucket: {userId}/{courseId}/{lessonId}/{unique-filename}.
export function isOwnedResourcePath(path: string, userId: string, courseId: string, lessonId?: string) {
  const parts = path.split("/");
  return parts.length === 4 && parts[0] === userId && parts[1] === courseId && (lessonId === undefined || parts[2] === lessonId) && parts[3].length > 0 && !parts.some((part) => part === "." || part === ".." || part.includes("\\"));
}

export function buildResourcePath(userId: string, courseId: string, lessonId: string, fileName: string, unique: string) {
  const base = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\.pdf$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "document";
  return `${userId}/${courseId}/${lessonId}/${unique}-${base}.pdf`;
}

export type PdfUploadCheck = { name: string; type: string; size: number; head: Uint8Array };
export function validatePdfUpload(file: PdfUploadCheck): { ok: true } | Failure<"empty_file" | "file_too_large" | "unsupported_type"> {
  if (file.size <= 0) return fail("empty_file");
  if (file.size > RESOURCE_MAX_BYTES) return fail("file_too_large");
  const magic = String.fromCharCode(...Array.from(file.head.slice(0, 5)));
  // The declared MIME, the extension and the real file signature must all agree.
  if (file.type !== "application/pdf" || !/\.pdf$/i.test(file.name) || magic !== "%PDF-") return fail("unsupported_type");
  return { ok: true };
}

type Course = { id: string; teacher_id: string; status: string };
type Base = {
  getUserId(): Promise<string | null>;
  getCourse(slug: string): Promise<Course | null>;
  getResource(courseId: string, id: string): Promise<LessonResourceRow | null>;
};

export type ListDeps = Base & {
  isEnrolled(courseId: string, userId: string): Promise<boolean>;
  lessonBelongs(courseId: string, lessonId: string): Promise<boolean>;
  listResources(courseId: string, lessonId: string): Promise<LessonResourceRow[]>;
};
export async function listLessonResources(deps: ListDeps, input: { courseSlug: unknown; lessonId: unknown }): Promise<LessonResourceView[]> {
  if (typeof input.courseSlug !== "string" || !slugPattern.test(input.courseSlug) || !isUuid(input.lessonId)) return [];
  const userId = await deps.getUserId();
  if (!userId) return [];
  const course = await deps.getCourse(input.courseSlug);
  if (!course) return [];
  const owner = course.teacher_id === userId;
  if (!owner && !(course.status === "published" && (await deps.isEnrolled(course.id, userId)))) return [];
  if (!(await deps.lessonBelongs(course.id, input.lessonId))) return [];
  const rows = await deps.listResources(course.id, input.lessonId);
  // Learners only see resources explicitly shared with enrolled learners; premium and unknown access stay hidden.
  return rows.filter((row) => row.course_id === course.id && row.lesson_id === input.lessonId && isPdfResource(row) && (owner || row.access === "enrolled" || row.access === "free")).map(toLessonResourceView);
}

export type PdfDeps = Base & {
  isEnrolled(courseId: string, userId: string): Promise<boolean>;
  createSignedUrl(path: string, expiresIn: number): Promise<string | null>;
};
export type ResourcePdfResult = { ok: true; url: string; title: string; fileSize: number | null; expiresIn: number } | Failure<LessonResourceError>;
export async function resolveResourcePdf(deps: PdfDeps, input: { courseSlug: unknown; resourceId: unknown }): Promise<ResourcePdfResult> {
  if (typeof input.courseSlug !== "string" || !slugPattern.test(input.courseSlug) || !isUuid(input.resourceId)) return fail("invalid_request");
  const userId = await deps.getUserId();
  if (!userId) return fail("unauthenticated");
  const course = await deps.getCourse(input.courseSlug);
  if (!course) return fail("not_found");
  const owner = course.teacher_id === userId;
  if (!owner && !(course.status === "published" && (await deps.isEnrolled(course.id, userId)))) return fail("permission_denied");
  const row = await deps.getResource(course.id, input.resourceId);
  if (!row || row.course_id !== course.id) return fail("not_found");
  if (!owner && row.access !== "enrolled" && row.access !== "free") return fail("permission_denied");
  if (!isPdfResource(row)) return fail("not_pdf");
  const url = await deps.createSignedUrl(row.storage_path!, RESOURCE_PDF_TTL_SECONDS);
  if (!url) return fail("url_unavailable");
  return { ok: true, url, title: row.title, fileSize: row.file_size, expiresIn: RESOURCE_PDF_TTL_SECONDS };
}

export type UploadDeps = Base & {
  lessonBelongs(courseId: string, lessonId: string): Promise<boolean>;
  uploadFile(path: string): Promise<boolean>;
  insertRow(row: { courseId: string; lessonId: string; userId: string; title: string; fileName: string; fileSize: number; path: string }): Promise<LessonResourceRow | null>;
  removeFile(path: string): Promise<boolean>;
  uniqueId(): string;
};
export type UploadResult = { ok: true; resource: LessonResourceView } | Failure<LessonResourceError>;
export async function uploadPdfResource(deps: UploadDeps, input: { courseSlug: unknown; lessonId: unknown; file: PdfUploadCheck | null }): Promise<UploadResult> {
  if (typeof input.courseSlug !== "string" || !slugPattern.test(input.courseSlug) || !isUuid(input.lessonId)) return fail("invalid_request");
  if (!input.file) return fail("no_file");
  const checked = validatePdfUpload(input.file);
  if (!checked.ok) return checked;
  const userId = await deps.getUserId();
  if (!userId) return fail("unauthenticated");
  const course = await deps.getCourse(input.courseSlug);
  if (!course) return fail("not_found");
  if (course.teacher_id !== userId) return fail("permission_denied");
  if (!(await deps.lessonBelongs(course.id, input.lessonId))) return fail("not_found");
  const path = buildResourcePath(userId, course.id, input.lessonId, input.file.name, deps.uniqueId());
  if (!(await deps.uploadFile(path))) return fail("upload_failed");
  const row = await deps.insertRow({ courseId: course.id, lessonId: input.lessonId, userId, title: input.file.name.replace(/\.pdf$/i, "").slice(0, 160) || "Document", fileName: input.file.name.slice(0, 180), fileSize: input.file.size, path });
  if (!row) { await deps.removeFile(path); return fail("insert_failed"); }
  return { ok: true, resource: toLessonResourceView(row) };
}

export type ResourceDeleteDeps = Base & {
  countPathReferences(path: string): Promise<number | null>;
  deleteRow(courseId: string, id: string): Promise<boolean>;
  removeFile(path: string): Promise<boolean>;
};
export type ResourceDeleteResult = { ok: true; storageRemoved: boolean } | Failure<LessonResourceError>;
export async function deleteLessonResource(deps: ResourceDeleteDeps, input: { courseSlug: unknown; resourceId: unknown }): Promise<ResourceDeleteResult> {
  if (typeof input.courseSlug !== "string" || !slugPattern.test(input.courseSlug) || !isUuid(input.resourceId)) return fail("invalid_request");
  const userId = await deps.getUserId();
  if (!userId) return fail("unauthenticated");
  const course = await deps.getCourse(input.courseSlug);
  if (!course) return fail("not_found");
  if (course.teacher_id !== userId) return fail("permission_denied");
  const row = await deps.getResource(course.id, input.resourceId);
  if (!row || row.course_id !== course.id) return fail("not_found");
  const hasFile = Boolean(row.storage_path || row.storage_bucket);
  if (hasFile) {
    if (row.storage_bucket !== RESOURCE_BUCKET || !row.storage_path || !isOwnedResourcePath(row.storage_path, userId, course.id)) return fail("invalid_storage_path");
    const references = await deps.countPathReferences(row.storage_path);
    if (references === null) return fail("db_delete_failed");
    if (references > 1) return fail("resource_in_use");
  }
  // DB first, so a DB veto never destroys the file; a failed file removal leaves an unreferenced object, not a dangling row.
  if (!(await deps.deleteRow(course.id, row.id))) return fail("db_delete_failed");
  if (!hasFile) return { ok: true, storageRemoved: false };
  if (!(await deps.removeFile(row.storage_path!))) return fail("storage_delete_failed");
  return { ok: true, storageRemoved: true };
}
