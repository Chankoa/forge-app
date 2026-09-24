import { ForgeError, forgeRequestSchema, providerOutputSchema, type ForgeAvailability, type ForgeResponse, type ForgeResult } from "./contracts";
import { boundForgeContext, buildForgeContext, type ForgeReader } from "./context";
import { forgeMessages } from "./prompts";

export interface ForgeProvider {
  availability: ForgeAvailability;
  generate(messages: { system: string; prompt: string }, scope: "course" | "lesson"): Promise<{ output: unknown; finishReason: string }>;
}
export type ForgeDependencies = { userId: string; reader: ForgeReader; provider: ForgeProvider; maxInputChars: number; maxOutputTokens?: number; telemetry?(metrics: Record<string, string | number>): void; consumeRateLimit(userId: string): void };

export async function runForge(raw: unknown, deps: ForgeDependencies): Promise<ForgeResponse> {
  const started = Date.now();
  let metrics: Record<string, string | number> = {};
  try {
    const parsed = forgeRequestSchema.safeParse(raw);
    if (!parsed.success) throw new ForgeError("invalid_request");
    if (!deps.userId) throw new ForgeError("unauthenticated");
    const request = parsed.data;
    const rawContext = await buildForgeContext(deps.reader, deps.userId, request);
    const context = boundForgeContext(rawContext, deps.maxInputChars);
    if (deps.provider.availability !== "configured") throw new ForgeError("not_configured");
    const messages = forgeMessages(request, context);
    metrics = { operation: request.intent, scope: context.lesson ? "lesson" : "course", selectedSourceCount: request.sourceIds.length, sourceChars: rawContext.sources.reduce((total, source) => total + source.text.length, 0), contextChars: context.sources.reduce((total, source) => total + source.text.length, 0), inputChars: messages.system.length + messages.prompt.length, maxOutputTokens: deps.maxOutputTokens ?? 0 };
    if (messages.system.length + messages.prompt.length > deps.maxInputChars) throw new ForgeError("context_unavailable");
    deps.consumeRateLimit(deps.userId);
    const generated = await deps.provider.generate(messages, context.lesson ? "lesson" : "course");
    const output = providerOutputSchema.safeParse(generated.output);
    if (generated.finishReason !== "stop" || !output.success) {
      deps.telemetry?.({ ...metrics, stage: "provider_output", finishReason: generated.finishReason, outputValid: output.success ? 1 : 0, elapsedMs: Date.now() - started, result: "invalid_result" });
      throw new ForgeError("invalid_result");
    }
    const value = output.data;
    const patch = value.patch;
    const patchKeys = Object.entries(patch).filter(([, item]) => item !== null).map(([key]) => key).join(",");
    metrics = { ...metrics, finishReason: generated.finishReason, schemaSuccess: 1, patchKeys };
    const common = { intent: request.intent, text: value.text, sourcesUsed: context.sources.map(({ id, title }) => ({ id, title })), metadata: { warnings: context.warnings, finishReason: "stop" as const } };
    let result: ForgeResult;
    if (request.mode === "learn") {
      if (Object.values(patch).some((item) => item !== null)) throw new ForgeError("invalid_result");
      result = { ...common, mode: "learn", kind: "answer" };
    } else {
      const isLesson = Boolean(context.lesson);
      const allowed = isLesson ? ["title", "description", "content", "objectives"] : ["title", "subtitle", "description"];
      if (Object.entries(patch).some(([key, value]) => value !== null && !allowed.includes(key))) {
        deps.telemetry?.({ ...metrics, stage: "proposal_scope", elapsedMs: Date.now() - started, result: "invalid_result" });
        throw new ForgeError("invalid_result");
      }
      if (request.intent === "ask") {
        if (Object.values(patch).every((item) => item === null)) result = { ...common, mode: "edit", kind: "answer" };
        else result = { ...common, mode: "edit", kind: "proposal", proposal: { target: { courseId: context.course.id, lessonId: context.lesson?.id }, patch, application: "explicit_only" } };
        deps.telemetry?.({ ...metrics, elapsedMs: Date.now() - started, result: "ok" });
        return { ok: true, result };
      }
      const hasApplicablePatch = Object.entries(patch).some(([key, value]) => value !== null && allowed.includes(key));
      if (!hasApplicablePatch || (request.intent === "objectives" && !patch.objectives)) {
        deps.telemetry?.({ ...metrics, stage: "proposal_shape", elapsedMs: Date.now() - started, result: "invalid_result" });
        throw new ForgeError("invalid_result");
      }
      const bounded = isLesson && patch.content && patch.content.length > 1000 ? { ...patch, content: patch.content.slice(0, 1000).replace(/\s+\S*$/, "").trimEnd() } : !isLesson && patch.description && patch.description.length > 3800 ? { ...patch, description: patch.description.slice(0, 3800).replace(/\s+\S*$/, "").trimEnd() } : patch;
      result = { ...common, mode: "edit", kind: "proposal", proposal: { target: { courseId: context.course.id, lessonId: context.lesson?.id }, patch: bounded, application: "explicit_only" } };
    }
    deps.telemetry?.({ ...metrics, elapsedMs: Date.now() - started, result: "ok" });
    return { ok: true, result };
  } catch (error) {
    const code = error instanceof ForgeError ? error.code : "context_unavailable";
    deps.telemetry?.({ ...metrics, elapsedMs: Date.now() - started, result: code });
    return { ok: false, error: code };
  }
}
