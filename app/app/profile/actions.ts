"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { avatarBucket, avatarStoragePath, avatarStoragePathFromPublicUrl, profileDetailsSchema, profileDomainIdsSchema, profileNameSchema, validateAvatarUpload } from "@/lib/profiles/profile-contracts";

async function requireSelf() {
  const client = await createServerSupabaseClient();
  if (!client) throw new Error("Supabase est indisponible.");
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Votre session a expiré. Connectez-vous à nouveau.");
  return { client, user };
}

export async function saveProfileInfoAction(formData: FormData) {
  const name = profileNameSchema.safeParse({ name: formData.get("name") });
  if (!name.success) throw new Error("Votre nom doit contenir entre 2 et 120 caractères.");
  const details = profileDetailsSchema.safeParse({ headline: formData.get("headline") ?? "", location: formData.get("location") ?? "", bio: formData.get("bio") ?? "" });
  if (!details.success) throw new Error("Vérifiez la longueur des champs : titre et lieu 120 caractères, présentation 1 200 caractères maximum.");
  const { client, user } = await requireSelf();
  const patch: Record<string, string | null> = { name: name.data.name };
  for (const key of ["headline", "location", "bio"] as const) if (formData.has(key)) patch[key] = details.data[key];
  const { data, error } = await client.from("profiles").update(patch).eq("id", user.id).select("id,name").maybeSingle();
  if (error || !data) throw new Error("Votre profil n'a pas pu être sauvegardé.");
  revalidatePath("/app/profile");
  return { name: data.name as string };
}

export async function saveProfileBioAction(formData: FormData) {
  const parsed = profileDetailsSchema.shape.bio.safeParse(formData.get("bio") ?? "");
  if (!parsed.success) throw new Error("La présentation ne peut pas dépasser 1 200 caractères.");
  const { client, user } = await requireSelf();
  const { error } = await client.from("profiles").update({ bio: parsed.data }).eq("id", user.id);
  if (error) throw new Error("Votre présentation n'a pas pu être sauvegardée.");
  revalidatePath("/app/profile");
  return { saved: true };
}

export async function saveProfileDomainsAction(domainIds: string[]) {
  const parsed = profileDomainIdsSchema.safeParse(domainIds);
  if (!parsed.success) throw new Error("Sélection de domaines invalide (12 maximum).");
  const { client, user } = await requireSelf();
  if (parsed.data.length) {
    const { data: valid, error: domainError } = await client.from("domains").select("id").eq("status", "active").in("id", parsed.data);
    if (domainError) throw new Error("Les domaines n'ont pas pu être vérifiés.");
    if ((valid ?? []).length !== parsed.data.length) throw new Error("Un domaine sélectionné n'est plus disponible.");
  }
  const { data: current, error: readError } = await client.from("profile_domains").select("domain_id").eq("profile_id", user.id);
  if (readError) throw new Error("Vos domaines n'ont pas pu être mis à jour.");
  const existing = new Set((current ?? []).map((row: { domain_id: string }) => row.domain_id));
  const toAdd = parsed.data.filter((id) => !existing.has(id));
  const toRemove = [...existing].filter((id) => !parsed.data.includes(id));
  if (toAdd.length) {
    const { error } = await client.from("profile_domains").insert(toAdd.map((domain_id) => ({ profile_id: user.id, domain_id })));
    if (error) throw new Error("Vos domaines n'ont pas pu être mis à jour.");
  }
  if (toRemove.length) {
    const { error } = await client.from("profile_domains").delete().eq("profile_id", user.id).in("domain_id", toRemove);
    if (error) throw new Error("Vos domaines n'ont pas pu être mis à jour.");
  }
  revalidatePath("/app/profile");
  return { domainIds: parsed.data };
}

export async function uploadProfileAvatarAction(formData: FormData) {
  const file = formData.get("avatar");
  if (!(file instanceof File)) throw new Error("Sélectionnez une image.");
  const validation = validateAvatarUpload(file.type, file.size);
  if (!validation.ok) throw new Error(validation.error);
  const { client, user } = await requireSelf();
  const { data: previous, error: readError } = await client.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
  if (readError || !previous) throw new Error("Votre photo de profil n'a pas pu être lue.");
  const path = avatarStoragePath(user.id, file.type, crypto.randomUUID());
  const { error: uploadError } = await client.storage.from(avatarBucket).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error("Le téléversement de la photo a échoué.");
  const avatarUrl = client.storage.from(avatarBucket).getPublicUrl(path).data.publicUrl;
  const { error } = await client.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
  if (error) {
    const { error: cleanupError } = await client.storage.from(avatarBucket).remove([path]);
    if (cleanupError) throw new Error("Votre photo n'a pas pu être enregistrée et le fichier téléversé n'a pas pu être nettoyé.");
    throw new Error("Votre photo n'a pas pu être enregistrée.");
  }
  const publicPrefix = client.storage.from(avatarBucket).getPublicUrl("").data.publicUrl;
  const previousPath = avatarStoragePathFromPublicUrl(user.id, previous?.avatar_url, publicPrefix);
  const cleanup = previousPath ? await client.storage.from(avatarBucket).remove([previousPath]) : null;
  revalidatePath("/app", "layout");
  return { avatarUrl, cleanupWarning: cleanup?.error ? "La photo a été mise à jour, mais l’ancienne image n’a pas pu être nettoyée." : null };
}

export async function removeProfileAvatarAction() {
  const { client, user } = await requireSelf();
  const { data: previous, error: readError } = await client.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
  if (readError || !previous) throw new Error("Votre photo de profil n'a pas pu être lue.");
  const { error } = await client.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  if (error) throw new Error("Votre photo n'a pas pu être supprimée.");
  const publicPrefix = client.storage.from(avatarBucket).getPublicUrl("").data.publicUrl;
  const previousPath = avatarStoragePathFromPublicUrl(user.id, previous?.avatar_url, publicPrefix);
  const cleanup = previousPath ? await client.storage.from(avatarBucket).remove([previousPath]) : null;
  revalidatePath("/app", "layout");
  return { removed: true, cleanupWarning: cleanup?.error ? "La photo a été retirée du profil, mais l’ancien fichier n’a pas pu être nettoyé." : null };
}

export async function saveProfileNameAction(formData: FormData) {
  const parsed = profileNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) throw new Error("Votre nom doit contenir entre 2 et 120 caractères.");
  const client = await createServerSupabaseClient();
  if (!client) throw new Error("Supabase est indisponible.");
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Votre session a expiré. Connectez-vous à nouveau.");
  const { data, error } = await client.from("profiles").update({ name: parsed.data.name }).eq("id", user.id).select("id,name").maybeSingle();
  if (error || !data) throw new Error("Votre profil n'a pas pu être sauvegardé.");
  revalidatePath("/app/profile");
  return { name: data.name };
}