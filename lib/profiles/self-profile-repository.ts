import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SelfProfile } from "./profile-contracts";

export async function getSelfProfile(): Promise<SelfProfile | null> {
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const { data, error } = await client.from("profiles").select("id,name").eq("id", user.id).maybeSingle();
  if (error || !data) return null;
  return { id: data.id, name: data.name };
}