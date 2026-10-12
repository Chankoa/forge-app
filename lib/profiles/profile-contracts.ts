import { z } from "zod";

export const profileNameSchema = z.object({ name: z.string().trim().min(2).max(120) });
const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
export const profileDetailsSchema = z.object({ headline: optionalText(120), location: optionalText(120), bio: optionalText(1200) });
export type ProfileDetails = z.infer<typeof profileDetailsSchema>;

export const profileDomainIdsSchema = z.array(z.uuid()).max(12).transform((ids) => [...new Set(ids)]);

export const avatarMimeTypes = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export const avatarMaxBytes = 2 * 1024 * 1024;
export const avatarBucket = "profile-avatars";

export function validateAvatarUpload(mimeType: string, size: number) {
  if (!(mimeType in avatarMimeTypes)) return { ok: false as const, error: "Utilisez une image JPEG, PNG ou WebP." };
  if (!Number.isInteger(size) || size <= 0 || size > avatarMaxBytes) return { ok: false as const, error: "La photo doit peser 2 Mo au maximum." };
  return { ok: true as const };
}

export function avatarStoragePath(userId: string, mimeType: string, token: string) {
  const extension = avatarMimeTypes[mimeType as keyof typeof avatarMimeTypes];
  return `${userId}/avatar-${token}.${extension}`;
}

export function isOwnAvatarPath(userId: string, path: string | null | undefined): path is string {
  return typeof path === "string" && path.startsWith(`${userId}/`) && !path.slice(userId.length + 1).includes("/");
}

export function avatarStoragePathFromPublicUrl(userId: string, avatarUrl: string | null | undefined, publicUrlPrefix: string): string | null {
  if (!avatarUrl) return null;
  try {
    const avatar = new URL(avatarUrl);
    const prefix = new URL(publicUrlPrefix);
    if (avatar.origin !== prefix.origin) return null;
    const prefixPath = `${prefix.pathname.replace(/\/+$/, "")}/`;
    if (!avatar.pathname.startsWith(prefixPath)) return null;
    const path = decodeURIComponent(avatar.pathname.slice(prefixPath.length));
    return isOwnAvatarPath(userId, path) ? path : null;
  } catch {
    return null;
  }
}

export type SelfProfile = {
  id: string;
  name: string | null;
  headline: string | null;
  location: string | null;
  bio: string | null;
  avatarUrl: string | null;
  domainIds: string[];
};