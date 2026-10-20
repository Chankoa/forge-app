import { resolveCourseCapabilities, type CourseCapabilities, type CourseMembershipRole, type CourseMembershipStatus } from "@/lib/capabilities/course-capabilities";
import { resourceIdsInRichContent } from "@/lib/courses/lesson-rich-content";

// UI-only projection over course_media_resources, resources and course_sources. Nothing here is persisted or merged.
export type LibraryKind = "media" | "resource" | "source";

export const libraryKindLabels: Record<LibraryKind, string> = { media: "Média", resource: "Ressource pédagogique", source: "Source Forge" };
export const libraryTabLabels = { all: "Tous", media: "Médias", resource: "Ressources", source: "Sources Forge" } as const;
export type LibraryTab = keyof typeof libraryTabLabels;

export const libraryMessages = {
  subtitle: "Retrouvez les médias, ressources pédagogiques et sources utilisés dans vos parcours.",
  empty: "Aucun élément dans votre bibliothèque pour le moment.",
  emptyFiltered: "Aucun élément ne correspond à ces filtres.",
  emptyUnreferenced: "Aucun média non référencé.",
  emptyReferenced: "Aucun média référencé.",
  referencedBlocked: "Ce média est référencé dans une leçon. Retirez-le du contenu avant de le supprimer.",
  unreferencedConfirm: "Ce média n’est actuellement référencé dans aucune leçon.",
} as const;

export type LibraryItem = {
  id: string;
  kind: LibraryKind;
  title: string;
  fileName: string | null;
  mimeType: string | null;
  mediaKind: "image" | "audio" | "video" | null;
  altText: string | null;
  caption: string | null;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  moduleId: string | null;
  moduleTitle: string | null;
  lessonId: string | null;
  lessonSlug: string | null;
  lessonTitle: string | null;
  createdAt: string | null;
  createdBy: string | null;
  fileSize: number | null;
  storageBacked: boolean;
  visibility: string;
  status: string;
  referenced: boolean | null;
  referenceCount: number;
  sourceKind: string | null;
  typeLabel: string;
  isPdf: boolean;
  url: string | null;
  canDelete: boolean;
};

export type LibraryCourse = { id: string; slug: string; title: string; ownerId: string; status: string | null; role: "owner" | "editor"; capabilities: CourseCapabilities };
export type LibraryLesson = { id: string; slug: string; title: string; moduleId: string | null; courseId: string };
export type LibraryModule = { id: string; title: string };
export type LibraryContext = { courses: Map<string, LibraryCourse>; lessons: Map<string, LibraryLesson>; modules: Map<string, LibraryModule>; references: Map<string, string[]> };

export type MediaRow = { id: string; course_id: string; created_by: string | null; storage_path: string | null; kind: "image" | "audio" | "video"; mime_type: string; file_size: number | null; title: string | null; alt_text: string | null; caption: string | null; status: string; created_at: string | null };
export type ResourceRow = { id: string; course_id: string | null; module_id: string | null; lesson_id: string | null; title: string; type: string | null; href: string | null; file_name: string | null; file_size: number | null; mime_type: string | null; storage_bucket: string | null; storage_path: string | null; access: string | null; created_by: string | null; created_at: string | null };
export type SourceRow = { id: string; course_id: string | null; title: string; type: string; source_kind: string; original_url: string | null; extraction_status: string; file_name: string | null; file_size: number | null; mime_type: string | null; storage_path: string | null; teacher_id: string | null; created_at: string | null };

// Relationship → what the Library may show for a course. Mirrors the existing per-object capabilities; nothing wider.
export function libraryAccess(relationship: { isOwner: boolean; courseStatus?: string | null; membershipRole?: CourseMembershipRole | null; membershipStatus?: CourseMembershipStatus | null }) {
  const capabilities = resolveCourseCapabilities({ isOwner: relationship.isOwner, isEnrolled: false, courseStatus: relationship.courseStatus, membershipRole: relationship.membershipRole, membershipStatus: relationship.membershipStatus });
  return { capabilities, media: capabilities.canUploadMedia, resources: capabilities.canManageResources, sources: capabilities.canManageSources, deleteMedia: capabilities.canDeleteMedia };
}

// A media row is referenced when a `:::image` / `:::audio` directive in a lesson of the same course points at its id.
export function mediaReferenceMap(lessons: ReadonlyArray<{ id: string; content: string | null }>): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const lesson of lessons) for (const id of resourceIdsInRichContent(lesson.content ?? "")) map.set(id, [...(map.get(id) ?? []), lesson.id]);
  return map;
}

const lessonPlace = (context: LibraryContext, lessonId: string | null, courseId: string) => {
  const lesson = lessonId ? context.lessons.get(lessonId) : undefined;
  const valid = lesson && lesson.courseId === courseId ? lesson : undefined;
  const mod = valid?.moduleId ? context.modules.get(valid.moduleId) : undefined;
  return { moduleId: valid?.moduleId ?? null, moduleTitle: mod?.title ?? null, lessonId: valid?.id ?? null, lessonSlug: valid?.slug ?? null, lessonTitle: valid?.title ?? null };
};

export function normalizeMedia(row: MediaRow, context: LibraryContext): LibraryItem | null {
  const course = context.courses.get(row.course_id);
  if (!course || !course.capabilities.canUploadMedia) return null;
  const referencing = (context.references.get(row.id) ?? []).filter((lessonId) => context.lessons.get(lessonId)?.courseId === row.course_id);
  const place = lessonPlace(context, referencing[0] ?? null, row.course_id);
  const fileName = row.storage_path ? row.storage_path.split("/").pop() ?? null : null;
  return {
    id: row.id, kind: "media", title: row.title?.trim() || row.alt_text?.trim() || fileName || "Média sans titre", fileName, mimeType: row.mime_type, mediaKind: row.kind, altText: row.alt_text, caption: row.caption,
    courseId: course.id, courseSlug: course.slug, courseTitle: course.title, ...place, createdAt: row.created_at, createdBy: row.created_by, fileSize: row.file_size, storageBacked: Boolean(row.storage_path),
    visibility: "Équipe du parcours", status: row.status === "ready" ? "ready" : "unavailable", referenced: referencing.length > 0, referenceCount: referencing.length, sourceKind: null,
    typeLabel: row.kind === "image" ? "Image" : row.kind === "audio" ? "Audio" : "Vidéo", isPdf: false, url: null, canDelete: course.capabilities.canDeleteMedia,
  };
}

const accessLabels: Record<string, string> = { enrolled: "Apprenants inscrits", free: "Accès libre", premium: "Premium" };
const isPdfMime = (mime: string | null | undefined) => (mime ?? "").toLowerCase() === "application/pdf";
const isSafeHttpUrl = (value: string | null | undefined): value is string => { try { const url = new URL(value ?? ""); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } };

export function normalizeResource(row: ResourceRow, context: LibraryContext): LibraryItem | null {
  const course = row.course_id ? context.courses.get(row.course_id) : undefined;
  if (!course || !course.capabilities.canManageResources) return null;
  const storageBacked = Boolean(row.storage_path);
  const place = lessonPlace(context, row.lesson_id, course.id);
  const mod = row.module_id ? context.modules.get(row.module_id) : undefined;
  const pdf = isPdfMime(row.mime_type) && storageBacked;
  return {
    id: row.id, kind: "resource", title: row.title?.trim() || row.file_name || "Ressource sans titre", fileName: row.file_name, mimeType: row.mime_type, mediaKind: null, altText: null, caption: null,
    courseId: course.id, courseSlug: course.slug, courseTitle: course.title, ...place, moduleId: place.moduleId ?? row.module_id ?? null, moduleTitle: place.moduleTitle ?? mod?.title ?? null,
    createdAt: row.created_at, createdBy: row.created_by, fileSize: row.file_size, storageBacked, visibility: accessLabels[row.access ?? ""] ?? "Propriétaire", status: "ready", referenced: null, referenceCount: 0, sourceKind: null,
    typeLabel: pdf ? "PDF" : storageBacked ? "Fichier" : "Lien", isPdf: pdf, url: !storageBacked && isSafeHttpUrl(row.href) ? row.href : null, canDelete: course.capabilities.canManageResources,
  };
}

const sourceStatus = (value: string) => (value === "ready" ? "ready" : value === "error" ? "error" : "pending");
export function normalizeSource(row: SourceRow, context: LibraryContext): LibraryItem | null {
  const course = row.course_id ? context.courses.get(row.course_id) : undefined;
  if (!course || !course.capabilities.canManageSources) return null;
  const storageBacked = Boolean(row.storage_path);
  const pdf = isPdfMime(row.mime_type) && storageBacked;
  const typeLabel = row.source_kind === "url" ? "Lien web" : pdf ? "PDF" : row.type === "markdown" ? "Markdown" : row.type === "text" ? "Texte" : (row.type || "Fichier").toUpperCase();
  return {
    id: row.id, kind: "source", title: row.title?.trim() || row.file_name || "Source sans titre", fileName: row.file_name, mimeType: row.mime_type, mediaKind: null, altText: null, caption: null,
    courseId: course.id, courseSlug: course.slug, courseTitle: course.title, moduleId: null, moduleTitle: null, lessonId: null, lessonSlug: null, lessonTitle: null,
    createdAt: row.created_at, createdBy: row.teacher_id, fileSize: row.file_size, storageBacked, visibility: "Forge uniquement", status: sourceStatus(row.extraction_status), referenced: null, referenceCount: 0,
    sourceKind: row.source_kind, typeLabel, isPdf: pdf, url: row.source_kind === "url" && isSafeHttpUrl(row.original_url) ? row.original_url : null, canDelete: course.capabilities.canManageSources,
  };
}

export type LibraryFilters = { tab: LibraryTab; courseId: string; referenced: "all" | "referenced" | "unreferenced"; query: string };
export const defaultLibraryFilters: LibraryFilters = { tab: "all", courseId: "all", referenced: "all", query: "" };

const fold = (value: string | null | undefined) => (value ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
export function matchesLibraryQuery(item: LibraryItem, query: string) {
  const needle = fold(query).trim();
  if (!needle) return true;
  return [item.title, item.fileName, item.altText, item.courseTitle, item.lessonTitle].some((field) => fold(field).includes(needle));
}

export function filterLibraryItems(items: readonly LibraryItem[], filters: LibraryFilters): LibraryItem[] {
  return items.filter((item) => {
    if (filters.tab !== "all" && item.kind !== filters.tab) return false;
    if (filters.courseId !== "all" && item.courseId !== filters.courseId) return false;
    if (filters.referenced !== "all" && (item.kind !== "media" || item.referenced !== (filters.referenced === "referenced"))) return false;
    return matchesLibraryQuery(item, filters.query);
  });
}

export function libraryTabCounts(items: readonly LibraryItem[]): Record<LibraryTab, number> {
  return { all: items.length, media: items.filter((item) => item.kind === "media").length, resource: items.filter((item) => item.kind === "resource").length, source: items.filter((item) => item.kind === "source").length };
}

export function libraryEmptyMessage(totalItems: number, filters: LibraryFilters) {
  if (totalItems === 0) return libraryMessages.empty;
  if (filters.referenced === "unreferenced") return libraryMessages.emptyUnreferenced;
  if (filters.referenced === "referenced") return libraryMessages.emptyReferenced;
  return libraryMessages.emptyFiltered;
}

export function isImageThumbnailCandidate(item: Pick<LibraryItem, "kind" | "mediaKind" | "status" | "storageBacked">) {
  return item.kind === "media" && item.status === "ready" && item.storageBacked && item.mediaKind === "image";
}

// Canonical routes only. Modules have no route of their own, so module context links to the course.
export function libraryCourseHref(item: Pick<LibraryItem, "courseSlug">) { return `/app/courses/${item.courseSlug}?mode=edit`; }
export function libraryLessonHref(item: Pick<LibraryItem, "courseSlug" | "lessonSlug">) { return item.lessonSlug ? `/app/courses/${item.courseSlug}/lessons/${item.lessonSlug}?mode=edit` : null; }
