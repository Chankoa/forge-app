import {
  coverBriefRequestSchema, coverContextSchema, coverImageRequestSchema, coverMessages, coverPromptRequestSchema,
  type CoverAspectRatio, type CoverContext, type CoverImageBytes, type CoverImageResult, type CoverPrompt, type MediaCapability, type MediaResult, type VisualBrief,
} from "./media-contracts";
import { inspectImage, isCleanPrompt, validateBrief, validatePrompt } from "./media-validation";

export type CoverTextProvider = { generate(capability: "generate_cover_brief" | "generate_cover_prompt" | "generate_visual_brief" | "generate_visual_prompt", prompt: string): Promise<unknown> };
export type CoverImageProvider = { generate(input: { prompt: string; aspectRatio: CoverAspectRatio }): Promise<CoverImageBytes> };
export type CoverReader = { loadCover(courseId: string): Promise<CoverContext | null> };
type Telemetry = (data: { capability: MediaCapability; duration: number; validation: string; width?: number; height?: number }) => void;
export type MediaCommon = { consume(): void; telemetry?: Telemetry };
type Common = MediaCommon;

export function mediaFailure<T>(capability: MediaCapability, status: MediaResult<T>["status"], summary: string): MediaResult<T> {
  return { capability, status, summary, data: null };
}
const safeCategory = (error: unknown) => ({ stage: "provider", category: "provider_error", errorName: error instanceof Error ? error.name : null });

// Read-only ports: model invocations cannot reach cover persistence, which only exists behind the explicit accept action.
export async function prepareCoverBrief(raw: unknown, deps: CoverReader & Common & { provider: CoverTextProvider }): Promise<MediaResult<{ brief: VisualBrief }>> {
  const capability = "generate_cover_brief" as const;
  const parsed = coverBriefRequestSchema.safeParse(raw);
  if (!parsed.success) return mediaFailure(capability, "validation_error", coverMessages.invalid);
  const started = Date.now();
  let validation = "provider_error";
  try {
    const context = await deps.loadCover(parsed.data.courseId);
    if (!context) { validation = "permission_denied"; return mediaFailure(capability, "permission_denied", coverMessages.denied); }
    if (!coverContextSchema.safeParse(context).success) { validation = "validation_error"; return mediaFailure(capability, "validation_error", coverMessages.brief); }
    deps.consume();
    const brief = validateBrief(await deps.provider.generate(capability, JSON.stringify({ context, previous: parsed.data.previous, instruction: parsed.data.instruction })));
    if (!brief) { validation = "invalid_result"; return mediaFailure(capability, "invalid_result", coverMessages.brief); }
    validation = "success";
    return { capability, status: "success", summary: "Direction visuelle prête à examiner.", data: { brief } };
  } catch (error) {
    console.info("[forge] media " + JSON.stringify({ capability, ...safeCategory(error) }));
    return mediaFailure(capability, "provider_error", coverMessages.brief);
  } finally { deps.telemetry?.({ capability, duration: Date.now() - started, validation }); }
}

export async function prepareCoverPrompt(raw: unknown, deps: CoverReader & Common & { provider: CoverTextProvider }): Promise<MediaResult<{ prompt: CoverPrompt }>> {
  const capability = "generate_cover_prompt" as const;
  const parsed = coverPromptRequestSchema.safeParse(raw);
  if (!parsed.success || !validateBrief(parsed.data.brief)) return mediaFailure(capability, "validation_error", coverMessages.invalid);
  const started = Date.now();
  let validation = "provider_error";
  try {
    const context = await deps.loadCover(parsed.data.courseId);
    if (!context) { validation = "permission_denied"; return mediaFailure(capability, "permission_denied", coverMessages.denied); }
    deps.consume();
    const identity = { title: context.title, subtitle: context.subtitle, domain: context.domain };
    const prompt = validatePrompt(await deps.provider.generate(capability, JSON.stringify({ identity, brief: parsed.data.brief })), parsed.data.brief);
    if (!prompt) { validation = "invalid_result"; return mediaFailure(capability, "invalid_result", coverMessages.brief); }
    validation = "success";
    return { capability, status: "success", summary: "Prompt prêt à examiner.", data: { prompt } };
  } catch (error) {
    console.info("[forge] media " + JSON.stringify({ capability, ...safeCategory(error) }));
    return mediaFailure(capability, "provider_error", coverMessages.brief);
  } finally { deps.telemetry?.({ capability, duration: Date.now() - started, validation }); }
}

// One image per call. The result is transient: nothing is stored, only a preview reference is returned.
export async function generateCoverImage(raw: unknown, deps: CoverReader & Common & { image: CoverImageProvider }): Promise<MediaResult<CoverImageResult>> {
  const capability = "generate_cover_image" as const;
  const parsed = coverImageRequestSchema.safeParse(raw);
  if (!parsed.success || !isCleanPrompt(parsed.data.prompt)) return mediaFailure(capability, "validation_error", coverMessages.invalid);
  const started = Date.now();
  let validation = "provider_error";
  let dimensions: { width?: number; height?: number } = {};
  try {
    if (!(await deps.loadCover(parsed.data.courseId))) { validation = "permission_denied"; return mediaFailure(capability, "permission_denied", coverMessages.denied); }
    deps.consume();
    const generated = await deps.image.generate({ prompt: parsed.data.prompt, aspectRatio: parsed.data.aspectRatio });
    const inspected = inspectImage(generated?.bytes);
    if (!inspected.ok) { validation = "invalid_" + inspected.reason; return mediaFailure(capability, "invalid_result", coverMessages.unusable); }
    dimensions = { width: inspected.width, height: inspected.height };
    validation = "success";
    return { capability, status: "success", summary: "Image prête à examiner.", data: { status: "success", mimeType: inspected.mimeType, size: inspected.size, width: inspected.width, height: inspected.height, previewUrl: `data:${inspected.mimeType};base64,${Buffer.from(generated.bytes).toString("base64")}` } };
  } catch (error) {
    console.info("[forge] media " + JSON.stringify({ capability, ...safeCategory(error) }));
    return mediaFailure(capability, "provider_error", coverMessages.image);
  } finally { deps.telemetry?.({ capability, duration: Date.now() - started, validation, ...dimensions }); }
}
