"use client";
import { createBrowserClient as createClient } from "@supabase/ssr";
export function createBrowserClient() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; return url && key ? createClient(url, key) : null; }