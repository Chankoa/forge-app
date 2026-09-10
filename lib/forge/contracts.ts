import { z } from "zod";

export const forgeIntents = {
  learn: ["explain", "clarify", "rephrase", "example", "quiz", "ask"],
  edit: ["structure", "improve", "rephrase", "simplify", "summarize", "objectives", "ask"],
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
]).refine((r) => Boolean(r.lessonSlug) || (r.mode === "learn" ? r.intent === "explain" : ["structure", "summarize", "objectives"].includes(r.intent)), { message: "Cette intention nécessite une leçon." });
export type ForgeRequest = z.infer<typeof forgeRequestSchema>;
export type ForgeAvailability = "configured" | "not_configured";
export type ForgeErrorCode = "invalid_request" | "unauthenticated" | "forbidden" | "context_unavailable" | "source_unavailable" | "not_configured" | "provider_auth" | "provider_not_found" | "provider_network" | "provider_error" | "timeout" | "rate_limited" | "invalid_result";
export class ForgeError extends Error {
  constructor(public readonly code: ForgeErrorCode) { super(code); }
}
// Display DTO only. Full context stays on the server.
export type ForgeRailContext = { mode: ForgeMode; courseSlug: string; lessonSlug?: string; courseTitle: string; lessonTitle?: string };
export type ForgeSource = { id: string; title: string; text: string };
export type ForgeWarning = { code: "truncated" | "not_ready" | "unsupported_type" | "extraction_unavailable"; target: string };
export type ForgeContext = {
  course: { id: string; title: string; summary: string };
  module?: { id: string; title: string };
  lesson?: { id: string; title: string; summary: string; content: string; objectives: string[] };
  outline: Array<{ title: string; lessons: string[] }>;
  sources: ForgeSource[];
  warnings: ForgeWarning[];
};
export const providerOutputSchema = z.object({
  text: z.string().trim().min(1).max(12000),
  suggestedContent: z.string().trim().min(1).max(20000).nullable(),
  objectives: z.array(z.string().trim().min(1).max(300)).max(8).nullable(),
}).strict();
export type ForgeProviderOutput = z.infer<typeof providerOutputSchema>;
type ResultBase = { intent: ForgeIntent; text: string; sourcesUsed: Array<Pick<ForgeSource, "id" | "title">>; metadata: { warnings: ForgeWarning[]; finishReason: "stop" } };
type EditProposal = { target: { courseId: string; lessonId?: string }; field: "content" | "description" | "objectives" | "outline"; suggestedContent: string | null; objectives: string[] | null; application: "explicit_only" };
export type ForgeResult =
  | (ResultBase & { mode: "learn"; kind: "answer" })
  | (ResultBase & { mode: "edit"; kind: "answer" })
  | (ResultBase & { mode: "edit"; kind: "proposal"; proposal: EditProposal })
  | (ResultBase & { mode: "edit"; kind: "answer_with_proposal"; proposal: EditProposal });
export type ForgeResponse = { ok: true; result: ForgeResult } | { ok: false; error: ForgeErrorCode };
