import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { collaboratorIdentity, collaboratorRoleSchema, collaboratorStatusSchema, type CourseCollaborator } from "./collaborators";

type CollaboratorRow = { user_id: string; name: string | null; role: string; status: string };

export async function listCourseCollaborators(courseId: string): Promise<{ collaborators: CourseCollaborator[]; available: boolean }> {
  const client = await createServerSupabaseClient();
  if (!client) return { collaborators: [], available: false };
  const { data, error } = await client.rpc("list_course_collaborators", { target_course_id: courseId });
  if (error) return { collaborators: [], available: false };
  const collaborators = ((data ?? []) as CollaboratorRow[]).flatMap((row) => {
    const role = collaboratorRoleSchema.safeParse(row.role);
    const status = collaboratorStatusSchema.safeParse(row.status);
    if (!role.success || !status.success || typeof row.user_id !== "string") return [];
    return [{ ...collaboratorIdentity(row.user_id, row.name), role: role.data, status: status.data }];
  });
  return { collaborators, available: true };
}