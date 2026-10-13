import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSelfProfileForUser } from "@/lib/profiles/self-profile-repository";
export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const client = await createServerSupabaseClient();
  let profile: Awaited<ReturnType<typeof getSelfProfileForUser>> = null;
  if (client) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) redirect("/login?next=/app");
    profile = await getSelfProfileForUser(client, user.id);
  }
  return <AppShell profileName={profile?.name} profileAvatarUrl={profile?.avatarUrl}>{children}</AppShell>;
}