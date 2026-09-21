import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { publicCoursePreviewSchema } from "./public-contracts";
import { ForgeError } from "./contracts";
import { classifyProviderError } from "./provider-errors";
import type { parseForgeConfig } from "./config";
import type { PublicForgeProvider } from "./public-service";

export function createPublicForgeProvider(config: ReturnType<typeof parseForgeConfig>): PublicForgeProvider {
  return { availability: config.availability, async generatePublic(messages) {
    if (config.availability !== "configured") throw new ForgeError("not_configured");
    const signal = AbortSignal.timeout(Math.min(config.timeoutMs, 30000));
    try {
      const provider = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
      const result = await generateText({ model: provider.chat(config.model!), ...messages, output: Output.object({ schema: publicCoursePreviewSchema }), maxOutputTokens: Math.min(config.maxOutputTokens, 1800), maxRetries: 0, abortSignal: signal });
      return { output: result.output, finishReason: result.finishReason };
    } catch (error) { throw classifyProviderError(error, signal.aborted); }
  } };
}
