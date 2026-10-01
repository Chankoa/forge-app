import { z } from "zod";
import { authorInitials } from "@/lib/profiles/author-identity";

export const collaboratorRoleSchema = z.enum(["viewer", "editor"]);
export const collaboratorStatusSchema = z.enum(["active", "invited", "suspended", "revoked"]);

export type CollaboratorRole = z.infer<typeof collaboratorRoleSchema>;
export type CollaboratorStatus = z.infer<typeof collaboratorStatusSchema>;
export type CourseCollaborator = { userId: string; displayName: string; initials: string; role: CollaboratorRole; status: CollaboratorStatus };
export type CollaboratorCandidate = { userId: string; displayName: string; initials: string };

export function collaboratorIdentity(userId: string, name: string | null): CollaboratorCandidate {
  const displayName = name?.trim() || "Membre Forge";
  return { userId, displayName, initials: authorInitials(displayName) };
}

export function canManageCollaborator(row: Pick<CourseCollaborator, "role">): boolean {
  return row.role === "viewer" || row.role === "editor";
}