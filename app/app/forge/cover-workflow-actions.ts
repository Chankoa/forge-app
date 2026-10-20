"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseForgeConfig } from "@/lib/forge/config";
import { createForgeRateLimiter } from "@/lib/forge/rate-limit";
import { createCoverImageProvider, createCoverTextProvider } from "@/lib/forge/intelligence/provider";
import { mediaCapabilityDefinitions } from "@/lib/forge/intelligence/capabilities";
import { createCoverRepository, createLessonVisualRepository } from "@/lib/forge/orchestrator/repository";
import { generateVisualImage, prepareVisualBrief, prepareVisualPrompt } from "@/lib/forge/orchestrator/lesson-visual-service";
import { generateCoverImage, mediaFailure, prepareCoverBrief, prepareCoverPrompt } from "@/lib/forge/orchestrator/media-service";
import { coverMessages, lessonVisualMessages, type CoverImageResult, type CoverPrompt, type MediaCapability, type MediaResult, type VisualBrief } from "@/lib/forge/orchestrator/media-contracts";

// Process-local guards; image generation has a lower ceiling because each call is billed.
const consumeText = createForgeRateLimiter();
const consumeImage = createForgeRateLimiter();

async function session(capability: MediaCapability, deniedMessage: string = coverMessages.denied) {
  const client = await createServerSupabaseClient();
  const user = client ? (await client.auth.getUser()).data.user : null;
  // Identity always comes from the server session, never from the request.
  return client && user ? { client, user, config: parseForgeConfig(process.env), denied: null } : { client: null, user: null, config: null, denied: mediaFailure<never>(capability, "permission_denied", deniedMessage) };
}
const telemetry = (data: { capability: MediaCapability; duration: number; validation: string; width?: number; height?: number }) => {
  const model = mediaCapabilityDefinitions[data.capability].resolveModel(process.env, parseForgeConfig(process.env).model);
  console.info("[forge] media", { ...data, provider: process.env.AI_PROVIDER || "openai-compatible", model: model ?? null });
};

// Last-resort diagnostics: error type and a short message only, never course content or credentials.
const logFailure = (capability: MediaCapability, error: unknown) => console.info("[forge] media action_error", { capability, errorName: error instanceof Error ? error.name : null, detail: error instanceof Error ? error.message.slice(0, 200) : null });

export async function prepareCoverBriefAction(raw: unknown): Promise<MediaResult<{ brief: VisualBrief }>> {
  const capability = "generate_cover_brief";
  try {
    const { client, user, config, denied } = await session(capability);
    if (!client || !user || !config) return denied!;
    return await prepareCoverBrief(raw, { ...createCoverRepository(client, user.id), provider: createCoverTextProvider(config, process.env), consume: () => consumeText(user.id, config.rateLimitPerHour), telemetry });
  } catch (error) { logFailure(capability, error); return mediaFailure(capability, "provider_error", coverMessages.brief); }
}

export async function prepareCoverPromptAction(raw: unknown): Promise<MediaResult<{ prompt: CoverPrompt }>> {
  const capability = "generate_cover_prompt";
  try {
    const { client, user, config, denied } = await session(capability);
    if (!client || !user || !config) return denied!;
    return await prepareCoverPrompt(raw, { ...createCoverRepository(client, user.id), provider: createCoverTextProvider(config, process.env), consume: () => consumeText(user.id, config.rateLimitPerHour), telemetry });
  } catch (error) { logFailure(capability, error); return mediaFailure(capability, "provider_error", coverMessages.brief); }
}

export async function generateCoverImageAction(raw: unknown): Promise<MediaResult<CoverImageResult>> {
  const capability = "generate_cover_image";
  try {
    const { client, user, config, denied } = await session(capability);
    if (!client || !user || !config) return denied!;
    return await generateCoverImage(raw, { ...createCoverRepository(client, user.id), image: createCoverImageProvider(config, process.env), consume: () => consumeImage(user.id, Math.min(config.rateLimitPerHour, 10)), telemetry });
  } catch (error) { logFailure(capability, error); return mediaFailure(capability, "provider_error", coverMessages.image); }
}

// Lesson illustrations share the cover text/image providers, models and rate limiters (same process-local counters, image = 10/hour).
export async function prepareVisualBriefAction(raw: unknown): Promise<MediaResult<{ brief: VisualBrief }>> {
  const capability = "generate_visual_brief";
  try {
    const { client, user, config, denied } = await session(capability, lessonVisualMessages.denied);
    if (!client || !user || !config) return denied!;
    return await prepareVisualBrief(raw, { ...createLessonVisualRepository(client, user.id), provider: createCoverTextProvider(config, process.env), consume: () => consumeText(user.id, config.rateLimitPerHour), telemetry });
  } catch (error) { logFailure(capability, error); return mediaFailure(capability, "provider_error", lessonVisualMessages.brief); }
}

export async function prepareVisualPromptAction(raw: unknown): Promise<MediaResult<{ prompt: CoverPrompt }>> {
  const capability = "generate_visual_prompt";
  try {
    const { client, user, config, denied } = await session(capability, lessonVisualMessages.denied);
    if (!client || !user || !config) return denied!;
    return await prepareVisualPrompt(raw, { ...createLessonVisualRepository(client, user.id), provider: createCoverTextProvider(config, process.env), consume: () => consumeText(user.id, config.rateLimitPerHour), telemetry });
  } catch (error) { logFailure(capability, error); return mediaFailure(capability, "provider_error", lessonVisualMessages.brief); }
}

export async function generateVisualImageAction(raw: unknown): Promise<MediaResult<CoverImageResult>> {
  const capability = "generate_visual_image";
  try {
    const { client, user, config, denied } = await session(capability, lessonVisualMessages.denied);
    if (!client || !user || !config) return denied!;
    return await generateVisualImage(raw, { ...createLessonVisualRepository(client, user.id), image: createCoverImageProvider(config, process.env), consume: () => consumeImage(user.id, Math.min(config.rateLimitPerHour, 10)), telemetry });
  } catch (error) { logFailure(capability, error); return mediaFailure(capability, "provider_error", lessonVisualMessages.image); }
}
