import { z } from "zod";
import { publicPreviewRequestSchema } from "../public-contracts";

export const intelligenceCapabilities = ["subject_discovery", "curriculum_analysis"] as const;
export type IntelligenceCapability = (typeof intelligenceCapabilities)[number];

export const subjectDiscoveryRequestSchema = publicPreviewRequestSchema;
export const subjectCandidateSchema = z.object({
  id: z.uuid(), slug: z.string().min(1), title: z.string().min(1),
  description: z.string().nullable(), domain: z.string().nullable(), level: z.string().nullable(),
}).strict();
export type SubjectCandidate = z.infer<typeof subjectCandidateSchema>;
export const subjectDiscoveryResultSchema = z.object({
  summary: z.string().trim().min(1).max(700),
  matches: z.array(z.object({
    courseId: z.uuid(),
    relation: z.enum(["duplicate_or_very_close", "related", "prerequisite", "continuation", "complementary"]),
    reason: z.string().trim().min(1).max(500),
    confidenceLevel: z.enum(["low", "medium", "high"]),
  }).strict()).max(8),
}).strict();
export type SubjectDiscoveryResult = z.infer<typeof subjectDiscoveryResultSchema>;

export const curriculumContextSchema = z.object({
  course: z.object({ id: z.uuid(), title: z.string(), description: z.string().nullable(), domain: z.string().nullable(), objectives: z.string().nullable() }).strict(),
  modules: z.array(z.object({ id: z.uuid(), title: z.string(), position: z.number().int(), lessons: z.array(z.object({ id: z.uuid(), title: z.string(), position: z.number().int(), objective: z.string().nullable(), summary: z.string().nullable() }).strict()) }).strict()),
}).strict();
export type CurriculumContext = z.infer<typeof curriculumContextSchema>;
export const curriculumFindingSchema = z.object({
  type: z.enum(["redundancy", "gap", "sequence_issue", "imbalance", "objective_gap", "scope_issue", "consolidation_opportunity"]),
  severity: z.enum(["info", "attention", "important"]),
  moduleIds: z.array(z.uuid()).max(8), lessonIds: z.array(z.uuid()).max(16),
  reason: z.string().trim().min(1).max(600), suggestion: z.string().trim().min(1).max(600),
}).strict();
export const curriculumResultSchema = z.object({
  summary: z.string().trim().min(1).max(900),
  findings: z.array(curriculumFindingSchema).max(5),
}).strict();
export type CurriculumResult = z.infer<typeof curriculumResultSchema>;
// The provider accepts a broad envelope so one bad finding can be discarded
// without losing otherwise useful findings. The service applies the strict schema.
export const curriculumGenerationSchema = z.object({
  summary: z.string(),
  findings: z.array(z.object({
    type: z.string(), severity: z.string(), moduleIds: z.array(z.string()),
    lessonIds: z.array(z.string()), reason: z.string(), suggestion: z.string(),
  }).strict()).max(12),
}).strict();
export type CurriculumReview = CurriculumResult & { review: { omittedFindings: number; deduplicatedFindings: number } };
export type IntelligenceFailureCategory = "malformed_output" | "invalid_reference" | "empty_result" | "output_limit" | "provider_error";
export class IntelligenceGenerationError extends Error {
  readonly code = "invalid_result";
  constructor(readonly failureCategory: "malformed_output" | "output_limit") { super("invalid_result"); }
}

export type IntelligenceError = "invalid_request" | "unauthenticated" | "forbidden" | "context_unavailable" | "not_configured" | "provider_auth" | "provider_not_found" | "provider_network" | "provider_error" | "timeout" | "rate_limited" | "invalid_result";
export type IntelligenceResponse<T> = { ok: true; result: T } | { ok: false; error: IntelligenceError };
