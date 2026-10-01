"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { collaborationRequestMessageSchema } from "@/lib/courses/collaboration-requests";
import { collaboratorRoleSchema, type CollaboratorRole } from "@/lib/courses/collaborators";

const courseIdSchema = z.string().uuid();
const requestIdSchema = z.string().uuid();

async function activeClient() {
  const client = await createServerSupabaseClient();
  if (!client) throw new Error("Supabase local n'est pas configuré.");
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Votre session a expiré. Connectez-vous à nouveau.");
  const { data: profile } = await client.from("profiles").select("status").eq("id", user.id).maybeSingle();
  if (profile?.status !== "active") throw new Error("Votre compte ne peut pas effectuer cette action.");
  return client;
}

async function ownerCourse(client: Awaited<ReturnType<typeof activeClient>>, courseId: string) {
  const { data: { user } } = await client.auth.getUser();
  const { data: course } = await client.from("courses").select("slug,teacher_id").eq("id", courseId).maybeSingle();
  if (!course || course.teacher_id !== user?.id) throw new Error("Vous ne pouvez pas gérer les demandes de ce parcours.");
  return course;
}

function requestError(error: unknown): never {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("request_already_pending")) throw new Error("Une demande de collaboration est déjà en attente.");
  if (message.includes("request_not_eligible")) throw new Error("Vous ne pouvez pas demander à collaborer sur ce parcours.");
  if (message.includes("requester_no_longer_eligible")) throw new Error("Le demandeur n'est plus éligible.");
  if (message.includes("request_not_pending")) throw new Error("Cette demande a déjà été traitée.");
  throw new Error("La demande de collaboration n'a pas pu être mise à jour.");
}

export async function createCourseCollaborationRequestAction(courseIdValue: string, messageValue: string) {
  const courseId = courseIdSchema.parse(courseIdValue); const message = collaborationRequestMessageSchema.parse(messageValue);
  const client = await activeClient();
  const { data: course } = await client.from("courses").select("slug").eq("id", courseId).maybeSingle();
  const { error } = await client.rpc("create_course_collaboration_request", { target_course_id: courseId, request_message: message || null });
  if (error) requestError(error);
  if (course?.slug) revalidatePath(`/app/courses/${course.slug}`);
}

export async function setCourseCollaborationRequestsEnabledAction(courseIdValue: string, enabled: boolean) {
  const courseId = courseIdSchema.parse(courseIdValue); const client = await activeClient(); const course = await ownerCourse(client, courseId);
  const { error } = await client.rpc("set_course_collaboration_requests_enabled", { target_course_id: courseId, enabled });
  if (error) requestError(error);
  revalidatePath(`/app/courses/${course.slug}`);
}

export async function resolveCourseCollaborationRequestAction(courseIdValue: string, requestIdValue: string, resolution: "accepted" | "declined", roleValue?: CollaboratorRole) {
  const courseId = courseIdSchema.parse(courseIdValue); const requestId = requestIdSchema.parse(requestIdValue); const client = await activeClient(); const course = await ownerCourse(client, courseId);
  const role = resolution === "accepted" ? collaboratorRoleSchema.parse(roleValue) : null;
  const { error } = await client.rpc("resolve_course_collaboration_request", { target_request_id: requestId, resolution, accepted_role: role });
  if (error) requestError(error);
  revalidatePath(`/app/courses/${course.slug}`);
}