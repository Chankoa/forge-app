export type CoverPresentation = { url: string; altText: string | null; source: "storage" | "legacy" };

export type CourseCoverFields = {
  cover_image: string | null;
  cover_storage_path: string | null;
  cover_mime_type: string | null;
  cover_file_size: number | null;
};

const coverMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const courseCoverMaxBytes = 5 * 1024 * 1024;
export const courseCoverBucket = "course-covers";
export const coverGuidance = "Format horizontal recommandé (JPEG, PNG ou WebP, 5 Mo maximum).";

// Cover mutation is owner-only. Editors, viewers and learners cannot create, accept or replace a cover.
export function canManageCourseCover(teacherId: string | null | undefined, userId: string | null | undefined) {
  return Boolean(teacherId) && Boolean(userId) && teacherId === userId;
}

export function validateCourseCoverUpload(mimeType: string, size: number) {
  if (!coverMimeTypes.includes(mimeType as (typeof coverMimeTypes)[number])) {
    return { ok: false as const, error: "Utilisez une image JPEG, PNG ou WebP." };
  }
  if (!Number.isInteger(size) || size <= 0 || size > courseCoverMaxBytes) {
    return { ok: false as const, error: "La couverture doit peser 5 Mo au maximum." };
  }
  return { ok: true as const };
}

function isSafeImageReference(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function legacyCoverImageUrl(value: string | null | undefined): string | null {
  const image = value?.trim();
  return image && isSafeImageReference(image) ? image : null;
}

export function courseCoverPresentation(
  fields: CourseCoverFields,
  publicStorageUrl: (path: string) => string,
): CoverPresentation | null {
  const storagePath = fields.cover_storage_path?.trim();
  if (storagePath) return { url: publicStorageUrl(storagePath), altText: null, source: "storage" };

  const legacy = legacyCoverImageUrl(fields.cover_image);
  if (legacy) return { url: legacy, altText: null, source: "legacy" };

  // Some legacy cover_image values are object paths rather than public URLs.
  const legacyPath = fields.cover_image?.trim();
  if (legacyPath && !legacyPath.startsWith("/") && !legacyPath.includes(":")) {
    return { url: publicStorageUrl(legacyPath), altText: null, source: "legacy" };
  }
  return null;
}
