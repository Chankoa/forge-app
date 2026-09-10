import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { ForgeError, providerOutputSchema } from "./contracts";
import { parseForgeConfig } from "./config";
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
        if (signal.aborted) throw new ForgeError("timeout");
        if (APICallError.isInstance(error) && error.statusCode === 429) throw new ForgeError("rate_limited");
        if (NoObjectGeneratedError.isInstance(error)) throw new ForgeError("invalid_result");
        throw new ForgeError("provider_error");
      }
    },
  };
}
