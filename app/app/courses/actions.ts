"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function requireUserClient() {
  const client = await createServerSupabaseClient();
  if (!client) throw new Error("Supabase local n'est pas configuré.");
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Votre session a expiré. Connectez-vous à nouveau.");
  return { client, user };
}

export async function enrollCourseAction(courseId: string, courseSlug: string) {
  const { client, user } = await requireUserClient();
  const { data: course } = await client.from("courses").select("id,status,visibility").eq("id", courseId).maybeSingle();
  if (!course || course.status !== "published" || course.visibility !== "public") throw new Error("Ce parcours n'est pas accessible à l'inscription.");
  const { error } = await client.from("enrollments").upsert({ user_id: user.id, course_id: courseId, status: "not-started" }, { onConflict: "user_id,course_id", ignoreDuplicates: true });
  if (error) throw new Error(error.code === "23505" ? "Vous êtes déjà inscrit à ce parcours." : "L'inscription n'a pas pu être enregistrée.");
  revalidatePath("/app/explore");
  revalidatePath("/app/courses");
  revalidatePath(`/app/courses/${courseSlug}`);
}

export async function completeLessonAction(courseId: string, lessonId: string, courseSlug: string) {
  const { client, user } = await requireUserClient();
  const { data: enrollment } = await client.from("enrollments").select("id,started_at").eq("course_id", courseId).maybeSingle();
  if (!enrollment) throw new Error("L'inscription est requise pour mettre à jour votre progression.");
  const { data: lesson } = await client.from("lessons").select("id").eq("id", lessonId).eq("course_id", courseId).maybeSingle();
  if (!lesson) throw new Error("Cette leçon n'appartient pas à ce parcours.");
  const now = new Date().toISOString();
  const { error: progressError } = await client.from("lesson_progress").upsert({ user_id: user.id, course_id: courseId, lesson_id: lessonId, completed: true, completed_at: now }, { onConflict: "user_id,lesson_id" });
  if (progressError) throw new Error("La progression n'a pas pu être enregistrée.");
  const [{ data: lessons }, { data: progress }] = await Promise.all([client.from("lessons").select("id").eq("course_id", courseId), client.from("lesson_progress").select("lesson_id,completed").eq("course_id", courseId)]);
  const completedIds = new Set((progress ?? []).filter((item: { completed: boolean }) => item.completed).map((item: { lesson_id: string }) => item.lesson_id));
  const courseLessons = lessons ?? [];
  const allComplete = courseLessons.length > 0 && courseLessons.every((item: { id: string }) => completedIds.has(item.id));
  const { error: enrollmentError } = await client.from("enrollments").update({ status: allComplete ? "completed" : "in-progress", started_at: enrollment.started_at ?? now, completed_at: allComplete ? now : null, last_accessed_at: now }).eq("id", enrollment.id);
  if (enrollmentError) throw new Error("L'état du parcours n'a pas pu être mis à jour.");
  revalidatePath("/app/courses");
  revalidatePath(`/app/courses/${courseSlug}`);
  revalidatePath(`/app/courses/${courseSlug}/lessons`, "layout");
}