import { safeAvatarUrl } from "./avatar-url";

export type AuthorIdentity = { profileId: string; displayName: string; initials: string; avatarUrl: string | null };
export type PublicAuthorIdentity = Omit<AuthorIdentity, "profileId" | "avatarUrl"> & { avatarUrl?: string | null };
export type PublicCourseAuthorRow = { profile_id: string; name: string | null; avatar_url?: string | null };

const fallbackName = "Propriétaire non renseigné";

export function courseOwnerLabel(name: string | null | undefined): string {
  const displayName = name?.trim();
  return displayName || fallbackName;
}

export function authorInitials(name: string | null | undefined): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return words.length ? words.slice(0, 2).map((word) => word[0]?.toLocaleUpperCase("fr")).join("") : "AF";
}

export function authorIdentityFromPublicRow(row: PublicCourseAuthorRow): AuthorIdentity {
  const displayName = row.name?.trim() || fallbackName;
  return { profileId: row.profile_id, displayName, initials: authorInitials(displayName), avatarUrl: safeAvatarUrl(row.avatar_url) };
}

export function publicAuthorIdentity(row: PublicCourseAuthorRow): PublicAuthorIdentity {
  const { displayName, initials, avatarUrl } = authorIdentityFromPublicRow(row);
  return { displayName, initials, avatarUrl };
}

export function isPublicCourse(course: { status: string | null; visibility: string | null }): boolean {
  return course.status === "published" && course.visibility === "public";
}

export function publicAuthorIdentityFromRpcData(data: unknown): PublicAuthorIdentity | null {
  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row !== "object" || !("profile_id" in row) || typeof row.profile_id !== "string" || !("name" in row) || (typeof row.name !== "string" && row.name !== null)) return null;
  if ("avatar_url" in row && typeof row.avatar_url !== "string" && row.avatar_url !== null) return null;
  return publicAuthorIdentity({ profile_id: row.profile_id, name: row.name, avatar_url: "avatar_url" in row ? row.avatar_url : null });
}
