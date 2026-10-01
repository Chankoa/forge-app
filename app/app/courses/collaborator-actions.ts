"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { collaboratorIdentity, collaboratorRoleSchema, type CollaboratorCandidate, type CollaboratorRole } from "@/lib/courses/collaborators";

const courseIdSchema = z.string().uuid();
const userIdSchema = z.string().uuid();
const searchSchema = z.string().trim().max(120);

async function requireActiveCourseOwner(courseId: string) {
  const client = await createServerSupabaseClient();
  if (!client) throw new Error("Supabase local n'est pas configuré.");
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Votre session a expiré. Connectez-vous à nouveau.");
  const [{ data: course }, { data: profile }] = await Promise.all([
    client.from("courses").select("id,slug,teacher_id").eq("id", courseId).maybeSingle(),
    client.from("profiles").select("status").eq("id", user.id).maybeSingle(),
  ]);
  if (!course || course.teacher_id !== user.id || profile?.status !== "active") throw new Error("Vous ne pouvez pas gérer les collaborateurs de ce parcours.");
  return { client, course };
}

function mutationFailure(error: unknown): never {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("collaborator_not_available")) throw new Error("Ce membre Forge n'est plus disponible.");
  if (message.includes("collaborator_not_found")) throw new Error("Ce collaborateur n'est plus disponible.");
  throw new Error("La modification des collaborateurs a échoué.");
}

export async function searchCourseCollaboratorCandidatesAction(courseIdValue: string, searchValue: string): Promise<CollaboratorCandidate[]> {
  const courseId = courseIdSchema.parse(courseIdValue);
  const search = searchSchema.parse(searchValue);
  if (search.length < 2) return [];
  const { client } = await requireActiveCourseOwner(courseId);
  const { data, error } = await client.rpc("search_course_collaborator_candidates", { target_course_id: courseId, search_term: search });
  if (error) throw new Error("La recherche de membres est indisponible.");
  return ((data ?? []) as Array<{ user_id: string; name: string | null }>).flatMap((row) => typeof row.user_id === "string" ? [collaboratorIdentity(row.user_id, row.name)] : []);
}

export async function addCourseCollaboratorAction(courseIdValue: string, userIdValue: string, roleValue: CollaboratorRole) {
  const courseId = courseIdSchema.parse(courseIdValue); const userId = userIdSchema.parse(userIdValue); const role = collaboratorRoleSchema.parse(roleValue);
  const { client, course } = await requireActiveCourseOwner(courseId);
  const { error } = await client.rpc("add_course_collaborator", { target_course_id: courseId, target_user_id: userId, target_role: role });
  if (error) mutationFailure(error);
  revalidatePath(`/app/courses/${course.slug}`);
}

export async function changeCourseCollaboratorRoleAction(courseIdValue: string, userIdValue: string, roleValue: CollaboratorRole) {
  const courseId = courseIdSchema.parse(courseIdValue); const userId = userIdSchema.parse(userIdValue); const role = collaboratorRoleSchema.parse(roleValue);
  const { client, course } = await requireActiveCourseOwner(courseId);
  const { error } = await client.rpc("change_course_collaborator_role", { target_course_id: courseId, target_user_id: userId, target_role: role });
  if (error) mutationFailure(error);
  revalidatePath(`/app/courses/${course.slug}`);
}

export async function setCourseCollaboratorStatusAction(courseIdValue: string, userIdValue: string, status: "active" | "revoked") {
  const courseId = courseIdSchema.parse(courseIdValue); const userId = userIdSchema.parse(userIdValue);
  const { client, course } = await requireActiveCourseOwner(courseId);
  const { error } = await client.rpc("set_course_collaborator_status", { target_course_id: courseId, target_user_id: userId, target_status: status });
  if (error) mutationFailure(error);
  revalidatePath(`/app/courses/${course.slug}`);
}