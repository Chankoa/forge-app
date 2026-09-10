import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { ForgeError, providerOutputSchema } from "./contracts";
import { parseForgeConfig } from "./config";
import { classifyProviderError } from "./provider-errors";
import type { ForgeProvider } from "./service";

export function getForgeAvailability() { return parseForgeConfig(process.env).availability; }

export function createForgeProvider(config: ReturnType<typeof parseForgeConfig>): ForgeProvider {
  return {
    availability: config.availability,
    async generate(messages) {
      if (config.availability !== "configured") throw new ForgeError("not_configured");
      const signal = AbortSignal.timeout(config.timeoutMs);
      try {
        const provider = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
        const result = await generateText({ model: provider.chat(config.model!), ...messages, output: Output.object({ schema: providerOutputSchema }), maxOutputTokens: config.maxOutputTokens, maxRetries: 0, abortSignal: signal });
        return { output: result.output, finishReason: result.finishReason };
      } catch (error) {
        const classified = classifyProviderError(error, signal.aborted);
        console.error("[forge] provider request failed", { code: classified.code });
        throw classified;
      }
    },
  };
}
