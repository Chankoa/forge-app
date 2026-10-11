import { z } from "zod";
import { validateRichContent } from "@/lib/courses/lesson-rich-content";

export const forgeIntents = {
  learn: ["explain", "clarify", "rephrase", "example", "quiz", "ask"],
  edit: ["structure", "improve", "generate_content", "rephrase", "simplify", "summarize", "objectives", "ask"],
} as const;
export type ForgeMode = keyof typeof forgeIntents;
export type ForgeIntent = (typeof forgeIntents)[ForgeMode][number];
const identifier = z.string().trim().min(1).max(180).regex(/^[a-zA-Z0-9_-]+$/);
const fields = {
  courseSlug: identifier,
  lessonSlug: identifier.optional(),
  input: z.string().max(2000).transform((s) => s.replace(/\r\n?/g, "\n").replace(/\u0000/g, "").trim()).optional(),
  sourceIds: z.array(z.uuid()).max(4).refine((ids) => new Set(ids).size === ids.length).default([]),
};
export const forgeRequestSchema = z.discriminatedUnion("mode", [
  z.object({ ...fields, mode: z.literal("learn"), intent: z.enum(forgeIntents.learn) }).strict(),
  z.object({ ...fields, mode: z.literal("edit"), intent: z.enum(forgeIntents.edit) }).strict(),
]).refine((r) => Boolean(r.lessonSlug) || (r.mode === "learn" ? ["explain", "ask"].includes(r.intent) : ["improve", "summarize", "ask"].includes(r.intent)), { message: "Cette intention nécessite une leçon." });
export type ForgeRequest = z.infer<typeof forgeRequestSchema>;
export type ForgeAvailability = "configured" | "not_configured";
export type ForgeErrorCode = "invalid_request" | "unauthenticated" | "forbidden" | "context_unavailable" | "source_unavailable" | "not_configured" | "provider_auth" | "provider_not_found" | "provider_network" | "provider_error" | "timeout" | "rate_limited" | "invalid_result";
export class ForgeError extends Error {
  constructor(public readonly code: ForgeErrorCode) { super(code); }
}
// Display DTO only. Full context stays on the server.
export type ForgeRailContext = { mode: ForgeMode; courseSlug: string; lessonSlug?: string; lessonId?: string; courseTitle: string; lessonTitle?: string; level?: string | null; hasLessonContent?: boolean };
export type ForgeSource = { id: string; title: string; text: string };
export type ForgeWarning = { code: "truncated" | "not_ready" | "unsupported_type" | "extraction_unavailable"; target: string };
export type ForgeContext = {
  course: { id: string; title: string; subtitle?: string | null; summary: string; domain?: string | null; level?: string | null };
  module?: { id: string; title: string };
  lesson?: { id: string; title: string; summary: string; content: string; objectives: string[] };
  outline: Array<{ title: string; lessons: string[] }>;
  sources: ForgeSource[];
  warnings: ForgeWarning[];
};
export const forgePatchSchema = z.object({
  title: z.string().trim().min(2).max(220).nullable(), subtitle: z.string().trim().max(500).nullable(),
  description: z.string().trim().min(1).max(4000).nullable(), content: z.string().trim().min(1).max(20000).nullable(),
  objectives: z.array(z.string().trim().min(1).max(300)).max(8).nullable(),
}).strict();
export const providerOutputSchema = z.object({ text: z.string().trim().min(1).max(12000), patch: forgePatchSchema }).strict();
const providerSummary = z.string().trim().min(1).max(12000);
const contentProviderPatchSchema = z.object({ content: z.string().trim().min(1).max(20000) }).strict();
const objectivesProviderPatchSchema = z.object({ objectives: z.array(z.string().trim().min(1).max(300)).min(1).max(8) }).strict();
const courseProviderPatchSchema = z.object({ title: z.string().trim().min(2).max(220), subtitle: z.string().trim().max(500), description: z.string().trim().min(1).max(4000) }).strict();

// Provider schemas expose only fields that the selected action can change.
export const lessonContentProviderOutputSchema = z.object({ summary: providerSummary, patch: contentProviderPatchSchema }).strict();
export const lessonObjectivesProviderOutputSchema = z.object({ summary: providerSummary, patch: objectivesProviderPatchSchema }).strict();
export const courseActionProviderOutputSchema = z.object({ summary: providerSummary, patch: courseProviderPatchSchema }).strict();
export const courseDescriptionProviderOutputSchema = z.object({ summary: providerSummary, patch: z.object({ description: z.string().trim().min(1).max(4000) }).strict() }).strict();
// Compatibility exports for callers that inspect the scope envelope. The live
// provider uses the action-specific schemas above.
export const courseProviderOutputSchema = z.object({ text: z.string().trim().min(1).max(12000), patch: forgePatchSchema.pick({ title: true, subtitle: true, description: true }) }).strict();
export const lessonProviderOutputSchema = z.object({ text: z.string().trim().min(1).max(12000), patch: forgePatchSchema.pick({ title: true, description: true, content: true, objectives: true }) }).strict();
export type ForgeProviderOutput = z.infer<typeof providerOutputSchema>;
export type ForgeTransformField = "content" | "objectives" | "title" | "subtitle" | "description";
export type ForgeTransformContract = { allowed: readonly ForgeTransformField[]; required: ForgeTransformField | null };
export const forgeTransformContracts: Record<string, ForgeTransformContract> = {
  generate_content: { allowed: ["content"], required: "content" },
  structure: { allowed: ["content"], required: "content" },
  rephrase: { allowed: ["content"], required: "content" },
  improve: { allowed: ["content"], required: "content" },
  simplify: { allowed: ["content"], required: "content" },
  summarize: { allowed: ["content"], required: "content" },
  objectives: { allowed: ["objectives"], required: "objectives" },
};
export function providerOutputForIntent(intent: ForgeIntent, scope: "course" | "lesson") {
  if (scope === "course") return intent === "summarize" ? courseDescriptionProviderOutputSchema : courseActionProviderOutputSchema;
  return intent === "objectives" ? lessonObjectivesProviderOutputSchema : lessonContentProviderOutputSchema;
}
function isAuthorCommentaryOnly(content: string) {
  return /^(je propose|j['’]ai conservé|informations absentes|voici une proposition|je recommande)\b/i.test(content.trim()) &&
    !/^#{1,6}\s|^\s*[-*]\s|^\s*\d+[.)]\s/m.test(content);
}
export function validateForgePatch(intent: ForgeIntent, scope: "course" | "lesson", patch: unknown, richContent?: { allowResourceIds?: readonly string[]; trustedUrls?: readonly string[] }) {
  const contract = scope === "course"
    ? intent === "improve"
      ? { allowed: ["title", "subtitle", "description"] as const, required: "description" as const, requireAll: true }
      : intent === "summarize"
        ? { allowed: ["description"] as const, required: "description" as const, requireAll: false }
      : { allowed: ["title", "subtitle", "description"] as const, required: null, requireAll: false }
    : scope === "lesson" && intent === "objectives"
      ? { ...forgeTransformContracts.objectives, requireAll: false }
      : scope === "lesson" && forgeTransformContracts[intent]
        ? { ...forgeTransformContracts[intent], requireAll: false }
        : intent === "ask"
          ? { allowed: ["title", "description", "content", "objectives"] as const, required: null, requireAll: false }
          : null;
  const parsed = forgePatchSchema.safeParse(patch);
  if (!parsed.success || !contract) {
    if (!parsed.success) return { success: false as const };
    return { success: true as const, patch: parsed.data };
  }
  const populated = Object.entries(parsed.data).filter(([, value]) => value !== null).map(([key]) => key as ForgeTransformField);
  if (populated.some((field) => !contract.allowed.includes(field)) || (contract.required && !populated.includes(contract.required))) return { success: false as const };
  if ("requireAll" in contract && contract.requireAll && populated.length !== contract.allowed.length) return { success: false as const };
  if (contract.required === null && populated.length === 0) return { success: true as const, patch: parsed.data };
  if (contract.required === "content") {
    if (typeof parsed.data.content !== "string" || isAuthorCommentaryOnly(parsed.data.content)) return { success: false as const };
    if (!validateRichContent(parsed.data.content, richContent)) return { success: false as const };
  }
  if (contract.required !== "content" && typeof parsed.data.content === "string" && (!validateRichContent(parsed.data.content, richContent) || isAuthorCommentaryOnly(parsed.data.content))) return { success: false as const };
  if (contract.required === "objectives" && (!Array.isArray(parsed.data.objectives) || parsed.data.objectives.length === 0)) return { success: false as const };
  return { success: true as const, patch: parsed.data };
}
type ResultBase = { intent: ForgeIntent; text: string; sourcesUsed: Array<Pick<ForgeSource, "id" | "title">>; metadata: { warnings: ForgeWarning[]; finishReason: "stop" } };
type EditProposal = { target: { courseId: string; lessonId?: string }; patch: z.infer<typeof forgePatchSchema>; application: "explicit_only" };
export type ForgeResult =
  | (ResultBase & { mode: "learn"; kind: "answer" })
  | (ResultBase & { mode: "edit"; kind: "answer" })
  | (ResultBase & { mode: "edit"; kind: "proposal"; proposal: EditProposal });
export type ForgeResponse = { ok: true; result: ForgeResult } | { ok: false; error: ForgeErrorCode };
