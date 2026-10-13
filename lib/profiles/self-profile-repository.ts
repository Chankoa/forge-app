import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SelfProfile } from "./profile-contracts";
import { safeAvatarUrl } from "./avatar-url";

type ServerClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

export async function getSelfProfile(): Promise<SelfProfile | null> {
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  return getSelfProfileForUser(client, user.id);
}

export async function getSelfProfileForUser(client: ServerClient, userId: string): Promise<SelfProfile | null> {
  const { data, error } = await client.from("profiles").select("id,name").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  // Identity extras are read separately so the profile stays usable until the I.11.B migration is applied.
  const [{ data: extras }, { data: domains }] = await Promise.all([
    client.from("profiles").select("headline,location,bio,avatar_url").eq("id", userId).maybeSingle(),
    client.from("profile_domains").select("domain_id").eq("profile_id", userId),
  ]);
  return {
    id: data.id,
    name: data.name,
    headline: extras?.headline ?? null,
    location: extras?.location ?? null,
    bio: extras?.bio ?? null,
    avatarUrl: safeAvatarUrl(typeof extras?.avatar_url === "string" ? extras.avatar_url : null),
    domainIds: (domains ?? []).map((row: { domain_id: string }) => row.domain_id),
  };
}

export async function listProfileDomainOptions(): Promise<Array<{ id: string; name: string }>> {
  const client = await createServerSupabaseClient();
  if (!client) return [];
  const { data } = await client.from("domains").select("id,name").eq("status", "active").order("display_order");
  return (data ?? []) as Array<{ id: string; name: string }>;
}
