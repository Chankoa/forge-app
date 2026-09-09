import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";
export async function GET(request: Request) { const url = new URL(request.url); const code = url.searchParams.get("code"); const client = await createServerSupabaseClient(); if (code && client) await client.auth.exchangeCodeForSession(code); return NextResponse.redirect(new URL(safeNext(url.searchParams.get("next")), url.origin)); }