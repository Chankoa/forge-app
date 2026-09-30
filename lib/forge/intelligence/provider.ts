import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { parseForgeConfig } from "../config";
import { classifyProviderError } from "../provider-errors";
import { capabilityDefinitions, capabilityModel } from "./capabilities";
import { IntelligenceGenerationError } from "./contracts";
import type { IntelligenceCapability } from "./contracts";
import type { IntelligenceProvider } from "./service";

export function createIntelligenceProvider(config: ReturnType<typeof parseForgeConfig>, env: Record<string, string | undefined>): IntelligenceProvider {
  return {
    availability: config.availability,
    async generate(capability: IntelligenceCapability, messages) {
      const model = capabilityModel(capability, env, config.model);
      if (config.availability !== "configured" || !model) throw Object.assign(new Error("not_configured"), { code: "not_configured" });
      const signal = AbortSignal.timeout(config.timeoutMs);
      try {
        const provider = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
        const common = { model: provider.chat(model), ...messages, maxOutputTokens: Math.min(config.maxOutputTokens, capability === "curriculum_analysis" ? 4000 : 1800), maxRetries: 0, abortSignal: signal };
        const result = capability === "subject_discovery"
          ? await generateText({ ...common, output: Output.object({ schema: capabilityDefinitions.subject_discovery.schema }) })
          : await generateText({ ...common, output: Output.object({ schema: capabilityDefinitions.curriculum_analysis.schema }) });
        return { output: result.finishReason === "stop" ? result.output : null, finishReason: result.finishReason };
      } catch (error) {
        if (NoObjectGeneratedError.isInstance(error)) throw new IntelligenceGenerationError(error.finishReason === "length" ? "output_limit" : "malformed_output");
        if (NoOutputGeneratedError.isInstance(error)) throw new IntelligenceGenerationError("malformed_output");
        throw classifyProviderError(error, signal.aborted);
      }
    },
  };
}
