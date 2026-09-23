import { ForgeError, forgeRequestSchema, providerOutputSchema, type ForgeAvailability, type ForgeResponse, type ForgeResult } from "./contracts";
import { boundForgeContext, buildForgeContext, type ForgeReader } from "./context";
import { forgeMessages } from "./prompts";

export interface ForgeProvider {
  availability: ForgeAvailability;
  generate(messages: { system: string; prompt: string }): Promise<{ output: unknown; finishReason: string }>;
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
    const generated = await deps.provider.generate(messages);
    const output = providerOutputSchema.safeParse(generated.output);
    if (generated.finishReason !== "stop" || !output.success) {
      deps.telemetry?.({ ...metrics, stage: "provider_output", finishReason: generated.finishReason, outputValid: output.success ? 1 : 0, elapsedMs: Date.now() - started, result: "invalid_result" });
      throw new ForgeError("invalid_result");
    }
    const value = output.data;
    const common = { intent: request.intent, text: value.text, sourcesUsed: context.sources.map(({ id, title }) => ({ id, title })), metadata: { warnings: context.warnings, finishReason: "stop" as const } };
    let result: ForgeResult;
    if (request.mode === "learn") {
      if (value.suggestedContent !== null || value.objectives !== null) throw new ForgeError("invalid_result");
      result = { ...common, mode: "learn", kind: "answer" };
    } else {
      const field = request.intent === "objectives" ? "objectives" : request.intent === "structure" ? "outline" : request.intent === "summarize" || (request.intent === "improve" && !context.lesson) ? "description" : "content";
      if (request.intent === "ask") {
        if (value.suggestedContent !== null && value.objectives !== null) throw new ForgeError("invalid_result");
        if (value.suggestedContent === null && value.objectives === null) result = { ...common, mode: "edit", kind: "answer" };
        else result = { ...common, mode: "edit", kind: "answer_with_proposal", proposal: { target: { courseId: context.course.id, lessonId: context.lesson?.id }, field: value.objectives ? "objectives" : "content", suggestedContent: value.suggestedContent, objectives: value.objectives, application: "explicit_only" } };
        deps.telemetry?.({ ...metrics, elapsedMs: Date.now() - started, result: "ok" });
        return { ok: true, result };
      }
      if (field === "objectives" ? !value.objectives?.length || value.suggestedContent !== null : !value.suggestedContent || value.objectives !== null) {
        deps.telemetry?.({ ...metrics, stage: "proposal_shape", suggestedChars: value.suggestedContent?.length ?? 0, objectivesCount: value.objectives?.length ?? 0, elapsedMs: Date.now() - started, result: "invalid_result" });
        throw new ForgeError("invalid_result");
      }
      const limit = context.lesson ? 1000 : 4000;
      const suggestedContent = field === "description" && value.suggestedContent!.length > limit
        ? value.suggestedContent!.slice(0, limit).replace(/\s+\S*$/, "").trimEnd()
        : value.suggestedContent;
      if (field === "description" && suggestedContent !== value.suggestedContent) deps.telemetry?.({ ...metrics, stage: "description_bounded", suggestedChars: value.suggestedContent!.length, contextCharsUsed: suggestedContent?.length ?? 0, elapsedMs: Date.now() - started, result: "bounded" });
      result = { ...common, mode: "edit", kind: "proposal", proposal: { target: { courseId: context.course.id, lessonId: context.lesson?.id }, field, suggestedContent, objectives: value.objectives, application: "explicit_only" } };
    }
    deps.telemetry?.({ ...metrics, elapsedMs: Date.now() - started, result: "ok" });
    return { ok: true, result };
  } catch (error) {
    const code = error instanceof ForgeError ? error.code : "context_unavailable";
    deps.telemetry?.({ ...metrics, elapsedMs: Date.now() - started, result: code });
    return { ok: false, error: code };
  }
}
