import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type OwnerCollaborationAwareness = { requestId: string; courseId: string; courseTitle: string; requesterName: string; createdAt: string };
export type RequesterCollaborationAwareness = { courseId: string; courseTitle: string; role: "editor" | "viewer"; ownerName: string | null; resolvedAt: string };
export type WorkspaceCollaborationAwareness = { ownerRequests: OwnerCollaborationAwareness[]; acceptedRequests: RequesterCollaborationAwareness[] };

function ownerRequestFromRow(row: { request_id: unknown; course_id: unknown; course_title: unknown; requester_name: unknown; created_at: unknown }): OwnerCollaborationAwareness | null {
  if (typeof row.request_id !== "string" || typeof row.course_id !== "string" || typeof row.course_title !== "string" || typeof row.created_at !== "string") return null;
  return { requestId: row.request_id, courseId: row.course_id, courseTitle: row.course_title, requesterName: typeof row.requester_name === "string" && row.requester_name.trim() ? row.requester_name : "Un apprenant", createdAt: row.created_at };
}

function acceptedRequestFromRow(row: { course_id: unknown; course_title: unknown; accepted_role: unknown; owner_name: unknown; resolved_at: unknown }): RequesterCollaborationAwareness | null {
  if (typeof row.course_id !== "string" || typeof row.course_title !== "string" || typeof row.resolved_at !== "string" || (row.accepted_role !== "editor" && row.accepted_role !== "viewer")) return null;
  return { courseId: row.course_id, courseTitle: row.course_title, role: row.accepted_role, ownerName: typeof row.owner_name === "string" && row.owner_name.trim() ? row.owner_name : null, resolvedAt: row.resolved_at };
}

export async function getWorkspaceCollaborationAwareness(): Promise<WorkspaceCollaborationAwareness> {
  const client = await createServerSupabaseClient();
  if (!client) return { ownerRequests: [], acceptedRequests: [] };
  const [{ data: ownerData, error: ownerError }, { data: acceptedData, error: acceptedError }] = await Promise.all([
    client.rpc("list_owned_pending_collaboration_awareness"),
    client.rpc("list_my_recent_accepted_collaboration_awareness"),
  ]);
  return {
    ownerRequests: ownerError ? [] : ((ownerData ?? []) as Array<{ request_id: unknown; course_id: unknown; course_title: unknown; requester_name: unknown; created_at: unknown }>).flatMap((row) => { const request = ownerRequestFromRow(row); return request ? [request] : []; }),
    acceptedRequests: acceptedError ? [] : ((acceptedData ?? []) as Array<{ course_id: unknown; course_title: unknown; accepted_role: unknown; owner_name: unknown; resolved_at: unknown }>).flatMap((row) => { const request = acceptedRequestFromRow(row); return request ? [request] : []; }),
  };
}