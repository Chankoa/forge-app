"use server";

import { headers } from "next/headers";
import { parseForgeConfig } from "@/lib/forge/config";
import { createForgeRateLimiter } from "@/lib/forge/rate-limit";
import { createPublicForgeProvider } from "@/lib/forge/public-provider";
import { runPublicCoursePreview } from "@/lib/forge/public-service";
import type { PublicPreviewResponse } from "@/lib/forge/public-contracts";

const consume = createForgeRateLimiter();
export async function generatePublicPreviewAction(raw: unknown): Promise<PublicPreviewResponse> {
  const requestHeaders = await headers();
  const fingerprint = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "anonymous";
  const config = parseForgeConfig(process.env);
  return runPublicCoursePreview(raw, { provider: createPublicForgeProvider(config), maxOutputTokens: Math.min(config.maxOutputTokens, 1800), telemetry: (metrics) => console.info("[forge] public preview", metrics), consumeRateLimit: () => consume(`public:${fingerprint}`, Math.min(config.rateLimitPerHour, 5)) });
}
