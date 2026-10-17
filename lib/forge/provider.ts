import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { courseActionProviderOutputSchema, courseDescriptionProviderOutputSchema, ForgeError, lessonContentProviderOutputSchema, lessonObjectivesProviderOutputSchema, type ForgeIntent } from "./contracts";
import { parseForgeConfig } from "./config";
import { classifyProviderError } from "./provider-errors";
import type { ForgeProvider } from "./service";

export function getForgeAvailability() { return parseForgeConfig(process.env).availability; }

export function createForgeProvider(config: ReturnType<typeof parseForgeConfig>): ForgeProvider {
  return {
    availability: config.availability,
    async generate(messages, scope, intent?: ForgeIntent) {
      if (config.availability !== "configured") throw new ForgeError("not_configured");
      const started = Date.now();
      const signal = AbortSignal.timeout(config.timeoutMs);
      try {
        const provider = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
        if (scope === "course") {
          if (intent === "summarize") {
            const result = await generateText({ model: provider.chat(config.model!), ...messages, output: Output.object({ schema: courseDescriptionProviderOutputSchema }), maxOutputTokens: config.maxOutputTokens, maxRetries: 0, abortSignal: signal });
            return { output: { text: result.output.summary, patch: { title: null, subtitle: null, description: result.output.patch.description, content: null, objectives: null } }, finishReason: result.finishReason };
          }
          const result = await generateText({ model: provider.chat(config.model!), ...messages, output: Output.object({ schema: courseActionProviderOutputSchema }), maxOutputTokens: config.maxOutputTokens, maxRetries: 0, abortSignal: signal });
          return { output: { text: result.output.summary, patch: { title: result.output.patch.title, subtitle: result.output.patch.subtitle, description: result.output.patch.description, content: null, objectives: null } }, finishReason: result.finishReason };
        }
        if (intent === "objectives") {
          const result = await generateText({ model: provider.chat(config.model!), ...messages, output: Output.object({ schema: lessonObjectivesProviderOutputSchema }), maxOutputTokens: config.maxOutputTokens, maxRetries: 0, abortSignal: signal });
          return { output: { text: result.output.summary, patch: { title: null, subtitle: null, description: null, content: null, objectives: result.output.patch.objectives } }, finishReason: result.finishReason };
        }
        const result = await generateText({ model: provider.chat(config.model!), ...messages, output: Output.object({ schema: lessonContentProviderOutputSchema }), maxOutputTokens: config.maxOutputTokens, maxRetries: 0, abortSignal: signal });
        console.info("[forge] provider usage", { scope, intent, model: config.model, maxOutputTokens: config.maxOutputTokens, finishReason: result.finishReason, outputTokens: result.usage.outputTokens ?? null, reasoningTokens: result.usage.outputTokenDetails?.reasoningTokens ?? null, totalTokens: result.usage.totalTokens ?? null, contentChars: result.output.patch.content?.length ?? null });
        const patch = { title: null, subtitle: null, description: null, content: result.output.patch.content, objectives: null };
        return { output: { text: result.output.summary, patch }, finishReason: result.finishReason };
      } catch (error) {
        const classified = classifyProviderError(error, signal.aborted);
        console.error("[forge] provider request failed", { code: classified.code, scope, model: config.model, maxOutputTokens: config.maxOutputTokens, elapsedMs: Date.now() - started, signalAborted: signal.aborted, errorClass: error instanceof Error ? error.constructor.name : typeof error, noObjectGenerated: NoObjectGeneratedError.isInstance(error), noOutputGenerated: NoOutputGeneratedError.isInstance(error), finishReason: NoObjectGeneratedError.isInstance(error) ? error.finishReason ?? null : null, outputTokens: NoObjectGeneratedError.isInstance(error) ? error.usage?.outputTokens ?? null : null, totalTokens: NoObjectGeneratedError.isInstance(error) ? error.usage?.totalTokens ?? null : null, causeClass: NoObjectGeneratedError.isInstance(error) && error.cause instanceof Error ? error.cause.constructor.name : null });
        throw classified;
      }
    },
  };
}
