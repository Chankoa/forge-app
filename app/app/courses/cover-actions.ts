"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { courseCoverBucket, validateCourseCoverUpload } from "@/lib/courses/cover-contracts";
import { sanitizeMediaFilename } from "@/lib/courses/media-contracts";

async function requireCoverOwner(courseId: string) {
  const client = await createServerSupabaseClient();
  if (!client) throw new Error("Supabase est indisponible.");
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Votre session a expiré. Connectez-vous à nouveau.");
  const { data: course, error } = await client.from("courses").select("id,slug,teacher_id,cover_storage_path").eq("id", courseId).maybeSingle();
  if (error || !course) throw new Error("Ce parcours est introuvable ou inaccessible.");
  if (course.teacher_id !== user.id) throw new Error("Seul le propriétaire peut gérer la couverture.");
  return { client, user, course };
}

async function removeUploadedObject(client: Awaited<ReturnType<typeof createServerSupabaseClient>>, path: string) {
  if (!client) throw new Error("Supabase est indisponible.");
  const { error } = await client.storage.from(courseCoverBucket).remove([path]);
  if (error) throw new Error("Le nettoyage de l’image téléversée a échoué.");
}

export async function setCourseCoverAction(courseId: string, formData: FormData) {
  const { client, course } = await requireCoverOwner(courseId);
  const file = formData.get("cover");
  if (!(file instanceof File)) throw new Error("Sélectionnez une image.");
  const validation = validateCourseCoverUpload(file.type, file.size);
  if (!validation.ok) throw new Error(validation.error);

  const storagePath = `${course.teacher_id}/${courseId}/${crypto.randomUUID()}-${sanitizeMediaFilename(file.name)}`;
  const { error: uploadError } = await client.storage.from(courseCoverBucket).upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error("Le téléversement de la couverture a échoué.");

  const { data: updatedCourse, error } = await client.from("courses").update({
    cover_storage_path: storagePath,
    cover_mime_type: file.type,
    cover_file_size: file.size,
  }).eq("id", courseId).eq("teacher_id", course.teacher_id).select("id").maybeSingle();
  if (error || !updatedCourse) {
    await removeUploadedObject(client, storagePath);
    throw new Error("La couverture n'a pas pu être appliquée au parcours.");
  }

  revalidateCoverSurfaces(course.slug);
  return { saved: true };
}

export async function removeCourseCoverAction(courseId: string) {
  const { client, course } = await requireCoverOwner(courseId);
  const hasUploadedCover = typeof course.cover_storage_path === "string" && course.cover_storage_path.trim().length > 0;
  const uploadedPath = hasUploadedCover ? course.cover_storage_path : null;
  const patch = {
    cover_storage_path: null,
    cover_mime_type: null,
    cover_file_size: null,
    ...(!hasUploadedCover ? { cover_image: null } : {}),
  };
  const { data: updatedCourse, error } = await client.from("courses").update(patch).eq("id", courseId).eq("teacher_id", course.teacher_id).select("id").maybeSingle();
  if (error || !updatedCourse) throw new Error("La couverture n'a pas pu être supprimée.");
  const { error: cleanupError } = uploadedPath
    ? await client.storage.from(courseCoverBucket).remove([uploadedPath])
    : { error: null };
  revalidateCoverSurfaces(course.slug);
  return {
    removed: true,
    cleanupWarning: cleanupError ? "La couverture a été retirée, mais son fichier n'a pas pu être nettoyé." : null,
  };
}

function revalidateCoverSurfaces(slug: string) {
  revalidatePath(`/app/courses/${slug}`);
  revalidatePath("/app/courses");
  revalidatePath("/app/explore");
  revalidatePath("/explore");
  revalidatePath(`/courses/${slug}`);
}
