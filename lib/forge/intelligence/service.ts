import { resolveCapability } from "./capabilities";
import { curriculumContextSchema, type CurriculumContext, type CurriculumResult, type IntelligenceCapability, type IntelligenceError, type IntelligenceResponse, type SubjectCandidate, type SubjectDiscoveryResult } from "./contracts";
import { publicPreviewRequestSchema } from "../public-contracts";

export type IntelligenceProvider = { availability: "configured" | "not_configured"; generate(capability: IntelligenceCapability, messages: { system: string; prompt: string }): Promise<{ output: unknown; finishReason: string }> };
type Deps = { provider: IntelligenceProvider; maxInputChars?: number; consumeRateLimit(): void; telemetry?(data: Record<string, string | number>): void };

export function validateReferences(capability: IntelligenceCapability, result: SubjectDiscoveryResult | CurriculumResult, context: SubjectCandidate[] | CurriculumContext) {
  if (capability === "subject_discovery") {
    const allowed = new Set((context as SubjectCandidate[]).map((course) => course.id));
    const matches = (result as SubjectDiscoveryResult).matches;
    return matches.every((match) => allowed.has(match.courseId)) && new Set(matches.map((match) => match.courseId)).size === matches.length;
  }
  const course = context as CurriculumContext;
  const modules = new Set(course.modules.map((module) => module.id));
  const lessons = new Set(course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)));
  return (result as CurriculumResult).findings.every((finding) => finding.moduleIds.every((id) => modules.has(id)) && finding.lessonIds.every((id) => lessons.has(id)));
}

export async function runIntelligence(capability: "subject_discovery", raw: unknown, context: SubjectCandidate[], deps: Deps): Promise<IntelligenceResponse<SubjectDiscoveryResult>>;
export async function runIntelligence(capability: "curriculum_analysis", raw: unknown, context: CurriculumContext, deps: Deps): Promise<IntelligenceResponse<CurriculumResult>>;
export async function runIntelligence(capability: IntelligenceCapability, raw: unknown, context: SubjectCandidate[] | CurriculumContext, deps: Deps): Promise<IntelligenceResponse<SubjectDiscoveryResult | CurriculumResult>> {
  const started = Date.now();
  const definition = resolveCapability(capability);
  if (!definition) return { ok: false, error: "invalid_request" };
  const request = capability === "subject_discovery" ? publicPreviewRequestSchema.safeParse(raw) : curriculumContextSchema.safeParse(context);
  if (!request.success) return { ok: false, error: "invalid_request" };
  if (deps.provider.availability !== "configured") return { ok: false, error: "not_configured" };
  try {
    const messages = { system: definition.system, prompt: JSON.stringify({ input: capability === "subject_discovery" ? request.data : null, knowledge: context }) };
    if (messages.system.length + messages.prompt.length > (deps.maxInputChars ?? 30000)) return { ok: false, error: "context_unavailable" };
    deps.consumeRateLimit();
    const generated = await deps.provider.generate(capability, messages);
    const parsed = definition.schema.safeParse(generated.output);
    if (generated.finishReason !== "stop" || !parsed.success || !validateReferences(capability, parsed.data, context)) {
      deps.telemetry?.({ capability, result: "invalid_result", finishReason: generated.finishReason, elapsedMs: Date.now() - started });
      return { ok: false, error: "invalid_result" };
    }
    deps.telemetry?.({ capability, result: "ok", elapsedMs: Date.now() - started });
    return { ok: true, result: parsed.data };
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "provider_error";
    const safe: IntelligenceError = ["provider_auth", "provider_not_found", "provider_network", "provider_error", "timeout", "rate_limited", "invalid_result"].includes(code) ? code as IntelligenceError : "provider_error";
    deps.telemetry?.({ capability, result: safe, elapsedMs: Date.now() - started });
    return { ok: false, error: safe };
  }
}
