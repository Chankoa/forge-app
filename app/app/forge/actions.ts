"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { forgeRequestSchema, type ForgeResponse } from "@/lib/forge/contracts";
import { parseForgeConfig } from "@/lib/forge/config";
import { createForgeReader } from "@/lib/forge/repository";
import { createForgeProvider } from "@/lib/forge/provider";
import { createForgeRateLimiter } from "@/lib/forge/rate-limit";
import { runForge } from "@/lib/forge/service";

const consume = createForgeRateLimiter();

export async function generateForgeAction(raw: unknown): Promise<ForgeResponse> {
  if (!forgeRequestSchema.safeParse(raw).success) return { ok: false, error: "invalid_request" };
  try {
    const client = await createServerSupabaseClient();
    if (!client) return { ok: false, error: "context_unavailable" };
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return { ok: false, error: "unauthenticated" };
    const config = parseForgeConfig(process.env);
    return await runForge(raw, { userId: user.id, reader: createForgeReader(client), provider: createForgeProvider(config), maxInputChars: config.maxInputChars, consumeRateLimit: (id) => consume(id, config.rateLimitPerHour) });
  } catch { return { ok: false, error: "context_unavailable" }; }
}
