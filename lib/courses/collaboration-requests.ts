import { z } from "zod";
import { collaboratorIdentity, type CollaboratorCandidate, type CollaboratorRole } from "./collaborators";

export const collaborationRequestMessageSchema = z.string().trim().max(1000);
export type CourseCollaborationRequest = CollaboratorCandidate & { requestId: string; message: string | null; createdAt: string };
export type MyCollaborationRequest = { requestId: string; createdAt: string };
export type RequestResolution = "accepted" | "declined";

export function collaborationRequestFromRow(row: { request_id: string; requester_id: string; name: string | null; message: string | null; created_at: string }): CourseCollaborationRequest | null {
  if (typeof row.request_id !== "string" || typeof row.requester_id !== "string" || typeof row.created_at !== "string") return null;
  return { ...collaboratorIdentity(row.requester_id, row.name), requestId: row.request_id, message: typeof row.message === "string" ? row.message : null, createdAt: row.created_at };
}

export function acceptedRequestRole(resolution: RequestResolution, role: CollaboratorRole | null): CollaboratorRole | null {
  return resolution === "accepted" ? role : null;
}