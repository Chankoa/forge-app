"use server";

import { revalidatePath } from "next/cache";
import { courseDiscussionPath } from "@/lib/courses/context-navigation";
import {
  createCourseDiscussionMessage,
  deleteCourseDiscussionMessage,
  updateCourseDiscussionMessage,
} from "@/lib/courses/discussion-repository";

function refresh(courseSlug: string) {
  revalidatePath(courseDiscussionPath(courseSlug));
}

export async function createCourseDiscussionMessageAction(input: { courseId: string; courseSlug: string; context: unknown; body: unknown }) {
  try {
    await createCourseDiscussionMessage(input);
    refresh(input.courseSlug);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Impossible d’envoyer le message." };
  }
}

export async function updateCourseDiscussionMessageAction(input: { courseId: string; courseSlug: string; messageId: string; body: unknown }) {
  try {
    await updateCourseDiscussionMessage(input);
    refresh(input.courseSlug);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Impossible de modifier le message." };
  }
}

export async function deleteCourseDiscussionMessageAction(input: { courseId: string; courseSlug: string; messageId: string }) {
  try {
    await deleteCourseDiscussionMessage(input);
    refresh(input.courseSlug);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Impossible de supprimer le message." };
  }
}
