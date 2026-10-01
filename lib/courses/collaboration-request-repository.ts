import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { collaborationRequestFromRow, type CourseCollaborationRequest, type MyCollaborationRequest } from "./collaboration-requests";

export async function getMyCourseCollaborationRequest(courseId: string): Promise<{ request: MyCollaborationRequest | null; available: boolean }> {
  const client = await createServerSupabaseClient();
  if (!client) return { request: null, available: false };
  const { data, error } = await client.rpc("get_my_course_collaboration_request", { target_course_id: courseId });
  if (error) return { request: null, available: false };
  const row = Array.isArray(data) ? data[0] : null;
  return { request: row && typeof row.request_id === "string" && typeof row.created_at === "string" ? { requestId: row.request_id, createdAt: row.created_at } : null, available: true };
}

export async function listCourseCollaborationRequests(courseId: string): Promise<{ requests: CourseCollaborationRequest[]; available: boolean }> {
  const client = await createServerSupabaseClient();
  if (!client) return { requests: [], available: false };
  const { data, error } = await client.rpc("list_course_collaboration_requests", { target_course_id: courseId });
  if (error) return { requests: [], available: false };
  return { requests: ((data ?? []) as Array<{ request_id: string; requester_id: string; name: string | null; message: string | null; created_at: string }>).flatMap((row) => { const request = collaborationRequestFromRow(row); return request ? [request] : []; }), available: true };
}