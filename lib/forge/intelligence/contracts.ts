import { z } from "zod";
import { publicPreviewRequestSchema } from "../public-contracts";

export const intelligenceCapabilities = ["subject_discovery", "curriculum_analysis", "content_intelligence"] as const;
export type IntelligenceCapability = (typeof intelligenceCapabilities)[number];
export type AnalysisCapability = Exclude<IntelligenceCapability, "content_intelligence">;

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

export const contentTasks = ["improve", "clarify", "adapt_level", "add_example", "suggest_activity", "coherence_review"] as const;
export type ContentTask = (typeof contentTasks)[number];
export const contentRequestSchema = z.object({
  courseSlug: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(180),
  lessonSlug: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(180),
  task: z.enum(contentTasks),
  targetLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  input: z.string().trim().max(2000).optional(),
  sourceIds: z.array(z.uuid()).max(4).refine((ids) => new Set(ids).size === ids.length).default([]),
}).strict().superRefine((value, ctx) => {
  if (value.task === "adapt_level" && !value.targetLevel) ctx.addIssue({ code: "custom", message: "targetLevel required" });
  if (value.task !== "adapt_level" && value.targetLevel) ctx.addIssue({ code: "custom", message: "targetLevel not applicable" });
});
export type ContentRequest = z.infer<typeof contentRequestSchema>;
export const contentTransformSchema = z.object({
  rationale: z.string().trim().min(1).max(700),
  title: z.string().trim().min(2).max(220).nullable(),
  content: z.string().trim().min(1).max(3800).nullable(),
  addition: z.string().trim().min(1).max(2500).nullable(),
}).strict();
export const contentFindingSchema = z.object({
  type: z.enum(["objective_not_covered", "content_off_scope", "level_mismatch", "missing_example", "weak_progression", "excessive_complexity", "insufficient_depth"]),
  importance: z.enum(["info", "attention", "important"]),
  reason: z.string().trim().min(1).max(400),
  suggestion: z.string().trim().min(1).max(400),
}).strict();
export const contentReviewSchema = z.object({
  summary: z.string().trim().min(1).max(600),
  findings: z.array(contentFindingSchema).max(4),
}).strict();
export type ContentReview = z.infer<typeof contentReviewSchema>;
