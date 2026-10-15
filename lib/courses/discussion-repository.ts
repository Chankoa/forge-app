import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { authorInitials } from "@/lib/profiles/author-identity";
import {
  discussionAccess,
  normalizeDiscussionBody,
  normalizeDiscussionContext,
  normalizePersistedDiscussionContext,
  type CourseDiscussionAccess,
  type CourseDiscussionMessage,
} from "./discussion";

function unavailableAccess(): CourseDiscussionAccess {
  return { canRead: false, canPost: false, isOwner: false, userId: null };
}

export async function getCourseDiscussionAccess(courseId: string): Promise<CourseDiscussionAccess> {
  const client = await createServerSupabaseClient();
  if (!client) return unavailableAccess();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return unavailableAccess();
  const [{ data: course }, { data: membership }] = await Promise.all([
    client.from("courses").select("teacher_id").eq("id", courseId).maybeSingle(),
    client.from("course_memberships").select("role,status").eq("course_id", courseId).eq("user_id", user.id).maybeSingle(),
  ]);
  return discussionAccess({
    isOwner: course?.teacher_id === user.id,
    membershipRole: membership?.role ?? null,
    membershipStatus: membership?.status ?? null,
    userId: user.id,
  });
}

function messageFromRpc(row: Record<string, unknown>): CourseDiscussionMessage | null {
  const id = typeof row.id === "string" ? row.id : null;
  const courseId = typeof row.course_id === "string" ? row.course_id : null;
  const context = normalizePersistedDiscussionContext({
    type: row.context_type,
    moduleId: row.context_module_id,
    lessonId: row.context_lesson_id,
  });
  const body = typeof row.body === "string" ? row.body : null;
  const createdAt = typeof row.created_at === "string" ? row.created_at : null;
  const updatedAt = typeof row.updated_at === "string" ? row.updated_at : null;
  if (!id || !courseId || !context || !body || !createdAt || !updatedAt) return null;
  const displayName = typeof row.author_name === "string" && row.author_name.trim() ? row.author_name.trim() : "Utilisateur supprimé";
  return {
    id,
    courseId,
    authorId: typeof row.author_id === "string" ? row.author_id : null,
    context: { type: context.type, moduleId: context.moduleId ?? null, lessonId: context.lessonId ?? null },
    body,
    createdAt,
    updatedAt,
    deletedAt: typeof row.deleted_at === "string" ? row.deleted_at : null,
    author: { displayName, avatarUrl: typeof row.author_avatar_url === "string" ? row.author_avatar_url : null },
  };
}

export async function listCourseDiscussion(courseId: string) {
  const client = await createServerSupabaseClient();
  if (!client) return { messages: [] as CourseDiscussionMessage[], available: false };
  const access = await getCourseDiscussionAccess(courseId);
  if (!access.canRead) return { messages: [] as CourseDiscussionMessage[], available: false };
  const { data, error } = await client.rpc("list_course_discussion_messages", { target_course_id: courseId });
  if (error) return { messages: [] as CourseDiscussionMessage[], available: false };
  return { messages: (Array.isArray(data) ? data : []).map((item) => messageFromRpc(item as Record<string, unknown>)).filter((item): item is CourseDiscussionMessage => item !== null), available: true };
}

async function authenticatedMutation(courseId: string) {
  const client = await createServerSupabaseClient();
  if (!client) throw new Error("Discussion indisponible.");
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Vous n’avez plus accès à cette discussion.");
  const access = await getCourseDiscussionAccess(courseId);
  if (!access.canPost) throw new Error("Vous n’avez plus accès à cette discussion.");
  return { client, user, access };
}

export async function createCourseDiscussionMessage(input: { courseId: string; context: unknown; body: unknown }) {
  const body = normalizeDiscussionBody(input.body);
  const context = normalizeDiscussionContext(input.context);
  if (!body) throw new Error(`Le message doit contenir entre 1 et ${4000} caractères.`);
  if (!context) throw new Error("Le contexte du message est invalide.");
  const { client, user } = await authenticatedMutation(input.courseId);
  const { error } = await client.from("course_discussion_messages").insert({
    course_id: input.courseId,
    author_id: user.id,
    context_type: context.type,
    context_module_id: context.moduleId ?? null,
    context_lesson_id: context.lessonId ?? null,
    body,
  });
  if (error) throw new Error("Impossible d’envoyer le message.");
}

export async function updateCourseDiscussionMessage(input: { courseId: string; messageId: string; body: unknown }) {
  const body = normalizeDiscussionBody(input.body);
  if (!body) throw new Error(`Le message doit contenir entre 1 et ${4000} caractères.`);
  const { client } = await authenticatedMutation(input.courseId);
  const { data, error } = await client.from("course_discussion_messages").update({ body }).eq("id", input.messageId).eq("course_id", input.courseId).is("deleted_at", null).select("id").maybeSingle();
  if (error || !data) throw new Error("Ce message n’est plus disponible.");
}

export async function deleteCourseDiscussionMessage(input: { courseId: string; messageId: string }) {
  const { client } = await authenticatedMutation(input.courseId);
  const { data, error } = await client.from("course_discussion_messages").update({ deleted_at: new Date().toISOString() }).eq("id", input.messageId).eq("course_id", input.courseId).is("deleted_at", null).select("id").maybeSingle();
  if (error || !data) throw new Error("Ce message n’est plus disponible.");
}

export function discussionAuthorFallback(name: string | null | undefined) {
  const displayName = name?.trim() || "Utilisateur supprimé";
  return { displayName, initials: authorInitials(displayName) };
}

