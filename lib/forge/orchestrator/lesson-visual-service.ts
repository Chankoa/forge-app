import {
  lessonVisualContextSchema, lessonVisualMessages, visualBriefRequestSchema, visualImageRequestSchema, visualPromptRequestSchema,
  type CoverImageResult, type CoverPrompt, type LessonVisualContext, type MediaCapability, type MediaResult, type VisualBrief,
} from "./media-contracts";
import { mediaFailure, type CoverImageProvider, type CoverTextProvider, type MediaCommon } from "./media-service";
import { inspectImage, isCleanPrompt, validateBrief, validatePrompt } from "./media-validation";

// Returns null when the user may not author this lesson (not owner / active editor, or the lesson is not in the course).
export type LessonVisualReader = { loadLesson(courseId: string, lessonId: string): Promise<LessonVisualContext | null> };

const safeCategory = (error: unknown) => ({ stage: "provider", category: "provider_error", errorName: error instanceof Error ? error.name : null });
const failure = (capability: MediaCapability, error: unknown) => console.info("[forge] media " + JSON.stringify({ capability, ...safeCategory(error) }));

// Lesson illustrations are landscape and never carry text; the brief is normalised after validation so the model cannot override it.
const normaliseBrief = (brief: VisualBrief): VisualBrief => ({ ...brief, aspectRatio: "16:9", textInImage: "none", imageIntent: "instructional" });

export async function prepareVisualBrief(raw: unknown, deps: LessonVisualReader & MediaCommon & { provider: CoverTextProvider }): Promise<MediaResult<{ brief: VisualBrief }>> {
  const capability = "generate_visual_brief" as const;
  const parsed = visualBriefRequestSchema.safeParse(raw);
  if (!parsed.success) return mediaFailure(capability, "validation_error", lessonVisualMessages.invalid);
  const started = Date.now();
  let validation = "provider_error";
  try {
    const context = await deps.loadLesson(parsed.data.courseId, parsed.data.lessonId);
    if (!context) { validation = "permission_denied"; return mediaFailure(capability, "permission_denied", lessonVisualMessages.denied); }
    if (!lessonVisualContextSchema.safeParse(context).success) { validation = "validation_error"; return mediaFailure(capability, "validation_error", lessonVisualMessages.brief); }
    deps.consume();
    const brief = validateBrief(await deps.provider.generate(capability, JSON.stringify({ context, purpose: parsed.data.purpose, direction: parsed.data.direction })));
    if (!brief) { validation = "invalid_result"; return mediaFailure(capability, "invalid_result", lessonVisualMessages.brief); }
    validation = "success";
    return { capability, status: "success", summary: "Direction visuelle prête à examiner.", data: { brief: normaliseBrief(brief) } };
  } catch (error) {
    failure(capability, error);
    return mediaFailure(capability, "provider_error", lessonVisualMessages.brief);
  } finally { deps.telemetry?.({ capability, duration: Date.now() - started, validation }); }
}

export async function prepareVisualPrompt(raw: unknown, deps: LessonVisualReader & MediaCommon & { provider: CoverTextProvider }): Promise<MediaResult<{ prompt: CoverPrompt }>> {
  const capability = "generate_visual_prompt" as const;
  const parsed = visualPromptRequestSchema.safeParse(raw);
  const brief = parsed.success ? validateBrief(parsed.data.brief) : null;
  if (!parsed.success || !brief) return mediaFailure(capability, "validation_error", lessonVisualMessages.invalid);
  const started = Date.now();
  let validation = "provider_error";
  try {
    const context = await deps.loadLesson(parsed.data.courseId, parsed.data.lessonId);
    if (!context) { validation = "permission_denied"; return mediaFailure(capability, "permission_denied", lessonVisualMessages.denied); }
    deps.consume();
    const normalised = normaliseBrief(brief);
    const identity = { course: context.course.title, domain: context.course.domain, lesson: context.lessonTitle };
    const prompt = validatePrompt(await deps.provider.generate(capability, JSON.stringify({ identity, purpose: parsed.data.purpose, brief: normalised })), normalised);
    if (!prompt) { validation = "invalid_result"; return mediaFailure(capability, "invalid_result", lessonVisualMessages.brief); }
    validation = "success";
    return { capability, status: "success", summary: "Prompt prêt à examiner.", data: { prompt } };
  } catch (error) {
    failure(capability, error);
    return mediaFailure(capability, "provider_error", lessonVisualMessages.brief);
  } finally { deps.telemetry?.({ capability, duration: Date.now() - started, validation }); }
}

// One image per call, returned as a transient data URL. Nothing is stored or inserted here.
export async function generateVisualImage(raw: unknown, deps: LessonVisualReader & MediaCommon & { image: CoverImageProvider }): Promise<MediaResult<CoverImageResult>> {
  const capability = "generate_visual_image" as const;
  const parsed = visualImageRequestSchema.safeParse(raw);
  if (!parsed.success || !isCleanPrompt(parsed.data.prompt)) return mediaFailure(capability, "validation_error", lessonVisualMessages.invalid);
  const started = Date.now();
  let validation = "provider_error";
  let dimensions: { width?: number; height?: number } = {};
  try {
    if (!(await deps.loadLesson(parsed.data.courseId, parsed.data.lessonId))) { validation = "permission_denied"; return mediaFailure(capability, "permission_denied", lessonVisualMessages.denied); }
    deps.consume();
    const generated = await deps.image.generate({ prompt: parsed.data.prompt, aspectRatio: parsed.data.aspectRatio });
    const inspected = inspectImage(generated?.bytes);
    if (!inspected.ok) { validation = "invalid_" + inspected.reason; return mediaFailure(capability, "invalid_result", lessonVisualMessages.unusable); }
    dimensions = { width: inspected.width, height: inspected.height };
    validation = "success";
    return { capability, status: "success", summary: "Image prête à examiner.", data: { status: "success", mimeType: inspected.mimeType, size: inspected.size, width: inspected.width, height: inspected.height, previewUrl: `data:${inspected.mimeType};base64,${Buffer.from(generated.bytes).toString("base64")}` } };
  } catch (error) {
    failure(capability, error);
    return mediaFailure(capability, "provider_error", lessonVisualMessages.image);
  } finally { deps.telemetry?.({ capability, duration: Date.now() - started, validation, ...dimensions }); }
}

export type AcceptedLessonImage = { id: string; kind: string; title: string | null; altText: string | null; caption: string | null; status: string };
export type AcceptLessonImageDeps = LessonVisualReader & { store(formData: FormData): Promise<AcceptedLessonImage> };

// Accepting persists the media through the existing upload contract; the Markdown directive is inserted by the editor into the local draft (saved explicitly).
export async function acceptLessonImage(courseId: string, lessonId: string, input: { file: unknown; altText: unknown; caption?: unknown }, deps: AcceptLessonImageDeps): Promise<{ ok: true; resource: AcceptedLessonImage; mimeType: string } | { ok: false; message: string }> {
  if (!(await deps.loadLesson(courseId, lessonId))) return { ok: false, message: lessonVisualMessages.denied };
  if (!(input.file instanceof File)) return { ok: false, message: lessonVisualMessages.unusable };
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const inspected = inspectImage(bytes);
  if (!inspected.ok) return { ok: false, message: lessonVisualMessages.unusable };
  const altText = String(input.altText ?? "").trim().slice(0, 250);
  if (!altText) return { ok: false, message: lessonVisualMessages.alt };
  const extension = inspected.mimeType === "image/png" ? "png" : inspected.mimeType === "image/webp" ? "webp" : "jpg";
  const form = new FormData();
  form.set("kind", "image");
  form.set("file", new File([bytes], `forge-illustration.${extension}`, { type: inspected.mimeType }));
  form.set("altText", altText);
  form.set("caption", String(input.caption ?? "").trim().slice(0, 300));
  return { ok: true, resource: await deps.store(form), mimeType: inspected.mimeType };
}
