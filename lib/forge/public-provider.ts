import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { APICallError } from "@ai-sdk/provider";
import { NoObjectGeneratedError } from "ai";
import { publicCoursePreviewSchema } from "./public-contracts";
import { ForgeError } from "./contracts";
import { classifyProviderError } from "./provider-errors";
import type { parseForgeConfig } from "./config";
import type { PublicForgeProvider } from "./public-service";

export function createPublicForgeProvider(config: ReturnType<typeof parseForgeConfig>): PublicForgeProvider {
  return { availability: config.availability, async generatePublic(messages) {
    if (config.availability !== "configured") throw new ForgeError("not_configured");
    const started = Date.now();
    const maxOutputTokens = Math.min(config.maxOutputTokens, 1800);
    const signal = AbortSignal.timeout(Math.min(config.timeoutMs, 60000));
    try {
      const provider = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
      const result = await generateText({ model: provider.chat(config.model!), ...messages, output: Output.object({ schema: publicCoursePreviewSchema }), maxOutputTokens, maxRetries: 0, abortSignal: signal });
      return { output: result.output, finishReason: result.finishReason };
    } catch (error) {
      const classified = classifyProviderError(error, signal.aborted);
      const objectError = NoObjectGeneratedError.isInstance(error) ? error : null;
      const apiError = APICallError.isInstance(error) ? error : null;
      const apiData = apiError?.data && typeof apiError.data === "object" && "error" in apiError.data && apiError.data.error && typeof apiError.data.error === "object" ? apiError.data.error as Record<string, unknown> : null;
      console.info("[forge] public provider", {
        elapsedMs: Date.now() - started,
        signalAborted: signal.aborted,
        errorName: error instanceof Error ? error.constructor.name : typeof error,
        aiSdkError: objectError ? "NoObjectGeneratedError" : apiError ? "APICallError" : null,
        statusCode: apiError?.statusCode ?? null,
        apiErrorType: typeof apiData?.type === "string" ? apiData.type : null,
        apiErrorCode: typeof apiData?.code === "string" ? apiData.code : null,
        apiErrorParam: typeof apiData?.param === "string" ? apiData.param : null,
        finishReason: objectError?.finishReason ?? null,
        hasOutput: false,
        schemaValid: false,
        maxOutputTokens,
        model: config.model,
        result: classified.code,
      });
      throw classified;
    }
  } };
}
