"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { courseRemixCockpitPath, CourseRemixError, requestCourseRemix } from "@/lib/courses/remix";

export async function createCourseRemixAction(sourceCourseId: string) {
  const client = await createServerSupabaseClient();
  if (!client) throw new CourseRemixError("Impossible de créer le remix pour le moment.");
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new CourseRemixError("Connectez-vous pour remixer ce parcours.");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sourceCourseId)) {
    throw new CourseRemixError("Ce parcours ne peut pas être remixé.");
  }
  const destination = await requestCourseRemix(client, sourceCourseId);
  return { ...destination, redirectTo: courseRemixCockpitPath(destination.slug) };
}