import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { courseProviderOutputSchema, ForgeError, lessonProviderOutputSchema } from "./contracts";
import { parseForgeConfig } from "./config";
import { classifyProviderError } from "./provider-errors";
import type { ForgeProvider } from "./service";

export function getForgeAvailability() { return parseForgeConfig(process.env).availability; }

export function createForgeProvider(config: ReturnType<typeof parseForgeConfig>): ForgeProvider {
  return {
    availability: config.availability,
    async generate(messages, scope) {
      if (config.availability !== "configured") throw new ForgeError("not_configured");
      const started = Date.now();
      const signal = AbortSignal.timeout(config.timeoutMs);
      try {
        const provider = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
        const result = scope === "course"
          ? await generateText({ model: provider.chat(config.model!), ...messages, output: Output.object({ schema: courseProviderOutputSchema }), maxOutputTokens: config.maxOutputTokens, maxRetries: 0, abortSignal: signal })
          : await generateText({ model: provider.chat(config.model!), ...messages, output: Output.object({ schema: lessonProviderOutputSchema }), maxOutputTokens: config.maxOutputTokens, maxRetries: 0, abortSignal: signal });
        const patch = scope === "course" ? { ...result.output.patch, content: null, objectives: null } : { ...result.output.patch, subtitle: null };
        return { output: { text: result.output.text, patch }, finishReason: result.finishReason };
      } catch (error) {
        const classified = classifyProviderError(error, signal.aborted);
        console.error("[forge] provider request failed", { code: classified.code, scope, model: config.model, maxOutputTokens: config.maxOutputTokens, elapsedMs: Date.now() - started, signalAborted: signal.aborted, errorClass: error instanceof Error ? error.constructor.name : typeof error, noObjectGenerated: NoObjectGeneratedError.isInstance(error), noOutputGenerated: NoOutputGeneratedError.isInstance(error), causeClass: NoObjectGeneratedError.isInstance(error) && error.cause instanceof Error ? error.cause.constructor.name : null });
        throw classified;
      }
    },
  };
}
