"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { profileNameSchema } from "@/lib/profiles/profile-contracts";

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