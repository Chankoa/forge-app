"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createLessonVisualRepository } from "@/lib/forge/orchestrator/repository";
import { acceptLessonImage } from "@/lib/forge/orchestrator/lesson-visual-service";
import { lessonVisualMessages } from "@/lib/forge/orchestrator/media-contracts";
import { uploadCourseMediaAction } from "@/app/app/create/actions";

export type AcceptLessonImageResult =
  | { ok: true; resource: { id: string; kind: string; title: string | null; altText: string | null; caption: string | null; status: string } }
  | { ok: false; message: string };

export async function acceptGeneratedLessonImageAction(courseId: string, lessonId: string, formData: FormData): Promise<AcceptLessonImageResult> {
  try {
    const client = await createServerSupabaseClient();
    const user = client ? (await client.auth.getUser()).data.user : null;
    if (!client || !user) return { ok: false, message: lessonVisualMessages.denied };
    const result = await acceptLessonImage(courseId, lessonId, { file: formData.get("file"), altText: formData.get("altText"), caption: formData.get("caption") }, {
      ...createLessonVisualRepository(client, user.id),
      store: (form) => uploadCourseMediaAction(courseId, form),
    });
    return result.ok ? { ok: true, resource: result.resource } : result;
  } catch {
    return { ok: false, message: lessonVisualMessages.save };
  }
}
