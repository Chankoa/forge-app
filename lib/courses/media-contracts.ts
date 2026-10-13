import { z } from "zod";

export const mediaKinds = ["image", "audio", "video"] as const;
export type MediaKind = (typeof mediaKinds)[number];
export const mediaStatuses = ["ready", "unavailable"] as const;
export type MediaStatus = (typeof mediaStatuses)[number];
export const mediaMimeTypes = {
  image: ["image/jpeg", "image/png", "image/webp"],
  audio: ["audio/mpeg", "audio/mp4", "audio/wav"],
} as const;
export const mediaUploadLimits = { image: 8 * 1024 * 1024, audio: 25 * 1024 * 1024 } as const;
export const mediaResourceSchema = z.object({
  id: z.uuid(), courseId: z.uuid(), createdBy: z.uuid(), storageBucket: z.literal("course-media"), storagePath: z.string().min(1),
  kind: z.enum(mediaKinds), mimeType: z.string().min(1), fileSize: z.number().int().nonnegative().nullable(),
  title: z.string().trim().max(220).nullable(), altText: z.string().trim().min(1).max(500).nullable(),
  caption: z.string().trim().max(500).nullable(), durationSeconds: z.number().int().nonnegative().nullable(),
  status: z.enum(mediaStatuses), createdAt: z.string(), updatedAt: z.string(),
}).strict();
export type MediaResource = z.infer<typeof mediaResourceSchema>;
export type MediaPresentation = { id: string; kind: MediaKind; url: string | null; title: string | null; altText: string | null; caption: string | null; durationSeconds: number | null; status: MediaStatus };

export function sanitizeMediaFilename(value: string) {
  const base = value.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").replace(/^\.+/, "").replace(/^-+|-+$/g, "").slice(0, 120);
  return base || "media";
}

export function courseMediaStoragePath(courseId: string, resourceId: string, filename: string) {
  return `${courseId}/${resourceId}/${sanitizeMediaFilename(filename)}`;
}

export function validateMediaUpload(kind: MediaKind, mimeType: string, size: number) {
  if (kind === "video") return { ok: false as const, error: "Les vidéos téléversées ne sont pas encore prises en charge." };
  if (!mediaMimeTypes[kind].includes(mimeType as never)) return { ok: false as const, error: "Ce format média n’est pas pris en charge." };
  if (!Number.isInteger(size) || size <= 0 || size > mediaUploadLimits[kind]) return { ok: false as const, error: "Le fichier média dépasse la taille autorisée." };
  return { ok: true as const };
}
