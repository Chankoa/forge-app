import { resolveCapability } from "./capabilities";
import {
  curriculumContextSchema, curriculumFindingSchema, curriculumGenerationSchema,
  curriculumResultSchema, subjectDiscoveryResultSchema,
  type CurriculumContext, type CurriculumReview, type IntelligenceCapability,
  type IntelligenceError, type IntelligenceFailureCategory, type IntelligenceResponse,
  type SubjectCandidate, type SubjectDiscoveryResult,
} from "./contracts";
import { publicPreviewRequestSchema } from "../public-contracts";

export type IntelligenceProvider = { availability: "configured" | "not_configured"; generate(capability: IntelligenceCapability, messages: { system: string; prompt: string }): Promise<{ output: unknown; finishReason: string }> };
type Deps = { provider: IntelligenceProvider; maxInputChars?: number; consumeRateLimit(): void; telemetry?(data: Record<string, string | number>): void };

export function validateReferences(capability: IntelligenceCapability, result: SubjectDiscoveryResult | CurriculumReview, context: SubjectCandidate[] | CurriculumContext) {
  if (capability === "subject_discovery") {
    const allowed = new Set((context as SubjectCandidate[]).map((course) => course.id));
    const matches = (result as SubjectDiscoveryResult).matches;
    return matches.every((match) => allowed.has(match.courseId)) && new Set(matches.map((match) => match.courseId)).size === matches.length;
  }
  const course = context as CurriculumContext;
  const modules = new Set(course.modules.map((module) => module.id));
  const lessonModules = new Map(course.modules.flatMap((module) => module.lessons.map((lesson) => [lesson.id, module.id] as const)));
  return (result as CurriculumReview).findings.every((finding) => {
    if (!finding.moduleIds.length && !finding.lessonIds.length) return false;
    if (!finding.moduleIds.every((id) => modules.has(id)) || !finding.lessonIds.every((id) => lessonModules.has(id))) return false;
    return !finding.moduleIds.length || !finding.lessonIds.length || finding.lessonIds.some((id) => finding.moduleIds.includes(lessonModules.get(id)!));
  });
}

type CurriculumValidation = {
  result: CurriculumReview | null;
  failureCategory?: IntelligenceFailureCategory;
  rawFindings: number;
  validFindings: number;
  dedupeCount: number;
};

export function validateCurriculumOutput(raw: unknown, context: CurriculumContext): CurriculumValidation {
  const envelope = curriculumGenerationSchema.safeParse(raw);
  if (!envelope.success) return { result: null, failureCategory: "malformed_output", rawFindings: 0, validFindings: 0, dedupeCount: 0 };
  const summary = curriculumResultSchema.shape.summary.safeParse(envelope.data.summary);
  const rawFindings = envelope.data.findings.length;
  if (!summary.success) return { result: null, failureCategory: "malformed_output", rawFindings, validFindings: 0, dedupeCount: 0 };

  const findings: CurriculumReview["findings"] = [];
  const seen = new Set<string>();
  let omittedFindings = 0;
  let dedupeCount = 0;
  let failureCategory: IntelligenceFailureCategory | undefined;
  for (const candidate of envelope.data.findings) {
    const parsed = curriculumFindingSchema.safeParse(candidate);
    if (!parsed.success) { omittedFindings++; failureCategory ??= "malformed_output"; continue; }
    const finding = { ...parsed.data, moduleIds: [...new Set(parsed.data.moduleIds)], lessonIds: [...new Set(parsed.data.lessonIds)] };
    if (!validateReferences("curriculum_analysis", { summary: summary.data, findings: [finding], review: { omittedFindings: 0, deduplicatedFindings: 0 } }, context)) {
      omittedFindings++; failureCategory = "invalid_reference"; continue;
    }
    const cluster = ["redundancy", "consolidation_opportunity"].includes(finding.type) ? "overlap" : finding.type;
    const key = JSON.stringify([cluster, [...finding.moduleIds].sort(), [...finding.lessonIds].sort()]);
    if (seen.has(key)) { dedupeCount++; continue; }
    seen.add(key);
    if (findings.length < 5) findings.push(finding);
    else omittedFindings++;
  }
  if (rawFindings > 0 && findings.length === 0) return { result: null, failureCategory: failureCategory ?? "empty_result", rawFindings, validFindings: 0, dedupeCount };
  const result = { summary: summary.data, findings, review: { omittedFindings, deduplicatedFindings: dedupeCount } };
  return { result, failureCategory, rawFindings, validFindings: findings.length, dedupeCount };
}

export async function runIntelligence(capability: "subject_discovery", raw: unknown, context: SubjectCandidate[], deps: Deps): Promise<IntelligenceResponse<SubjectDiscoveryResult>>;
export async function runIntelligence(capability: "curriculum_analysis", raw: unknown, context: CurriculumContext, deps: Deps): Promise<IntelligenceResponse<CurriculumReview>>;
export async function runIntelligence(capability: IntelligenceCapability, raw: unknown, context: SubjectCandidate[] | CurriculumContext, deps: Deps): Promise<IntelligenceResponse<SubjectDiscoveryResult | CurriculumReview>> {
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
    if (generated.finishReason !== "stop") {
      deps.telemetry?.({ capability, result: "invalid_result", validationFailure: generated.finishReason === "length" ? "output_limit" : "malformed_output", finishReason: generated.finishReason, rawFindings: 0, validFindings: 0, dedupeCount: 0, elapsedMs: Date.now() - started });
      return { ok: false, error: "invalid_result" };
    }
    if (capability === "curriculum_analysis") {
      const checked = validateCurriculumOutput(generated.output, context as CurriculumContext);
      deps.telemetry?.({ capability, result: checked.result ? checked.result.review.omittedFindings ? "partial" : "ok" : "invalid_result", validationFailure: checked.failureCategory ?? "none", rawFindings: checked.rawFindings, validFindings: checked.validFindings, dedupeCount: checked.dedupeCount, elapsedMs: Date.now() - started });
      return checked.result ? { ok: true, result: checked.result } : { ok: false, error: "invalid_result" };
    }
    const parsed = subjectDiscoveryResultSchema.safeParse(generated.output);
    if (!parsed.success || !validateReferences(capability, parsed.data, context)) {
      deps.telemetry?.({ capability, result: "invalid_result", validationFailure: parsed.success ? "invalid_reference" : "malformed_output", finishReason: generated.finishReason, elapsedMs: Date.now() - started });
      return { ok: false, error: "invalid_result" };
    }
    deps.telemetry?.({ capability, result: "ok", elapsedMs: Date.now() - started });
    return { ok: true, result: parsed.data };
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "provider_error";
    const safe: IntelligenceError = ["provider_auth", "provider_not_found", "provider_network", "provider_error", "timeout", "rate_limited", "invalid_result"].includes(code) ? code as IntelligenceError : "provider_error";
    const category = error instanceof Error && "failureCategory" in error && ["malformed_output", "output_limit"].includes(String(error.failureCategory)) ? String(error.failureCategory) : "provider_error";
    deps.telemetry?.({ capability, result: safe, validationFailure: category, rawFindings: 0, validFindings: 0, dedupeCount: 0, elapsedMs: Date.now() - started });
    return { ok: false, error: safe };
  }
}
