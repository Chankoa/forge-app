"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { courseCoverBucket, validateCourseCoverUpload } from "@/lib/courses/cover-contracts";
import { sanitizeMediaFilename } from "@/lib/courses/media-contracts";
import { inspectImage } from "@/lib/forge/orchestrator/media-validation";

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

type CoverClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;
type CoverCourse = { slug: string; teacher_id: string };

// Single persistence path shared by manual upload and Forge-generated covers.
async function storeCover(client: CoverClient, course: CoverCourse, courseId: string, file: File) {
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

export async function setCourseCoverAction(courseId: string, formData: FormData) {
  const { client, course } = await requireCoverOwner(courseId);
  const file = formData.get("cover");
  if (!(file instanceof File)) throw new Error("Sélectionnez une image.");
  return storeCover(client, course, courseId, file);
}

// Explicit acceptance of a Forge-generated image. The bytes are re-inspected here (type from content, size, dimensions)
// and then follow the same pipeline as a manual upload; the declared client type is never trusted.
export async function acceptGeneratedCoverAction(courseId: string, formData: FormData) {
  const { client, course } = await requireCoverOwner(courseId);
  const file = formData.get("cover");
  if (!(file instanceof File)) throw new Error("Cette image ne peut pas être utilisée comme couverture.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const inspected = inspectImage(bytes);
  if (!inspected.ok) throw new Error("Cette image ne peut pas être utilisée comme couverture.");
  const extension = inspected.mimeType === "image/jpeg" ? "jpg" : inspected.mimeType.slice(6);
  try {
    return await storeCover(client, course, courseId, new File([bytes], `forge-cover.${extension}`, { type: inspected.mimeType }));
  } catch {
    throw new Error("L’enregistrement de la couverture a échoué.");
  }
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
