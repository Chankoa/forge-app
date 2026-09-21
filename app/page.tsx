import { PublicShell } from "@/components/shell/PublicShell";
import { PublicIntentExperience } from "@/components/forge/PublicIntentExperience";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listActiveDomains } from "@/lib/courses/authoring-repository";
import { redirect } from "next/navigation";

export default async function Home() {
  const client = await createServerSupabaseClient();
  const { data: { user } } = client ? await client.auth.getUser() : { data: { user: null } };
  if (user) redirect("/app");
  const domains = await listActiveDomains();
  return <PublicShell><PublicIntentExperience authenticated={false} domains={domains.map(({ name }) => ({ name }))} /></PublicShell>;
}
