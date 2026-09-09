import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export default async function WorkspaceLayout({ children }: { children: ReactNode }) { const client = await createServerSupabaseClient(); if (client) { const { data: { user } } = await client.auth.getUser(); if (!user) redirect("/login?next=/app"); } return <AppShell>{children}</AppShell>; }