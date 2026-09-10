import { ForgeError, forgeRequestSchema, providerOutputSchema, type ForgeAvailability, type ForgeResponse, type ForgeResult } from "./contracts";
import { boundForgeContext, buildForgeContext, type ForgeReader } from "./context";
import { forgeMessages } from "./prompts";

export interface ForgeProvider {
  availability: ForgeAvailability;
  generate(messages: { system: string; prompt: string }): Promise<{ output: unknown; finishReason: string }>;
}
export type ForgeDependencies = { userId: string; reader: ForgeReader; provider: ForgeProvider; maxInputChars: number; consumeRateLimit(userId: string): void };

export async function runForge(raw: unknown, deps: ForgeDependencies): Promise<ForgeResponse> {
  try {
    const parsed = forgeRequestSchema.safeParse(raw);
    if (!parsed.success) throw new ForgeError("invalid_request");
    if (!deps.userId) throw new ForgeError("unauthenticated");
    const request = parsed.data;
    const context = boundForgeContext(await buildForgeContext(deps.reader, deps.userId, request), deps.maxInputChars);
    if (deps.provider.availability !== "configured") throw new ForgeError("not_configured");
    const messages = forgeMessages(request, context);
    if (messages.system.length + messages.prompt.length > deps.maxInputChars) throw new ForgeError("context_unavailable");
    deps.consumeRateLimit(deps.userId);
    const generated = await deps.provider.generate(messages);
    const output = providerOutputSchema.safeParse(generated.output);
    if (generated.finishReason !== "stop" || !output.success) throw new ForgeError("invalid_result");
    const value = output.data;
    const common = { intent: request.intent, text: value.text, sourcesUsed: context.sources.map(({ id, title }) => ({ id, title })), metadata: { warnings: context.warnings, finishReason: "stop" as const } };
    let result: ForgeResult;
    if (request.mode === "learn") {
      if (value.suggestedContent !== null || value.objectives !== null) throw new ForgeError("invalid_result");
      result = { ...common, mode: "learn", kind: "answer" };
    } else {
      const field = request.intent === "objectives" ? "objectives" : request.intent === "structure" ? "outline" : request.intent === "summarize" ? "description" : "content";
      if (field === "objectives" ? !value.objectives?.length || value.suggestedContent !== null : !value.suggestedContent || value.objectives !== null) throw new ForgeError("invalid_result");
      if (field === "description" && value.suggestedContent!.length > (context.lesson ? 1000 : 4000)) throw new ForgeError("invalid_result");
      result = { ...common, mode: "edit", kind: "proposal", proposal: { target: { courseId: context.course.id, lessonId: context.lesson?.id }, field, suggestedContent: value.suggestedContent, objectives: value.objectives, application: "explicit_only" } };
    }
    return { ok: true, result };
  } catch (error) {
    return { ok: false, error: error instanceof ForgeError ? error.code : "context_unavailable" };
  }
}
