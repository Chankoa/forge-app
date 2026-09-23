import { z } from "zod";

export const publicCourseFormats = ["full_course", "practical_workshop", "exam_prep", "thematic_module"] as const;
export type PublicCourseFormat = (typeof publicCourseFormats)[number];

export const publicCourseFormatLabels: Record<PublicCourseFormat, string> = {
  full_course: "Cours complet",
  practical_workshop: "Atelier pratique",
  exam_prep: "Préparation examen",
  thematic_module: "Module thématique",
};

export const publicPreviewRequestSchema = z.object({
  intent: z.string().trim().min(12).max(500),
  format: z.enum(publicCourseFormats).optional(),
  domain: z.string().trim().max(120).optional(),
  audience: z.string().trim().max(240).optional(),
  objective: z.string().trim().max(300).optional(),
}).strict();

export const modulePreviewSchema = z.object({
  title: z.string().trim().min(2).max(160),
  summary: z.string().trim().min(2).max(500),
  estimatedDuration: z.string().trim().min(1).max(60).nullable(),
  outcomes: z.array(z.string().trim().min(2).max(220)).min(1).max(4),
}).strict();

export const publicCoursePreviewSchema = z.object({
  title: z.string().trim().min(3).max(180),
  summary: z.string().trim().min(10).max(1000),
  suggestedDomain: z.string().trim().min(2).max(120),
  // OpenAI strict structured output requires every schema property to be
  // required. `null` carries the same absence semantics at the UI boundary.
  suggestedDomainLabel: z.string().trim().min(2).max(120).nullable(),
  format: z.enum(publicCourseFormats),
  level: z.string().trim().min(2).max(60).nullable(),
  estimatedDuration: z.string().trim().min(1).max(60).nullable(),
  learningOutcomes: z.array(z.string().trim().min(2).max(220)).min(2).max(6),
  modules: z.array(modulePreviewSchema).min(2).max(6),
}).strict();
export type PublicCoursePreview = z.infer<typeof publicCoursePreviewSchema>;
export type PublicPreviewRequest = z.infer<typeof publicPreviewRequestSchema>;
export type PublicPreviewResponse = { ok: true; preview: PublicCoursePreview } | { ok: false; error: "invalid_request" | "not_configured" | "provider_auth" | "provider_not_found" | "provider_network" | "provider_error" | "timeout" | "rate_limited" | "invalid_result" };

export const PUBLIC_DRAFT_KEY = "forge.publicDraft.v1";
export const PUBLIC_DRAFT_VERSION = 1 as const;
export const PUBLIC_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
export const publicDraftLifecycles = ["CREATED", "PREVIEWED", "AUTH_PENDING", "RESTORED_IN_CREATE", "CONSUMED"] as const;
export type PublicDraftLifecycle = (typeof publicDraftLifecycles)[number];
export const publicDraftSchema = z.object({
  version: z.literal(PUBLIC_DRAFT_VERSION),
  createdAt: z.number().int().positive(),
  intent: z.string().trim().min(12).max(500),
  format: z.enum(publicCourseFormats).optional(),
  domain: z.string().trim().max(120).optional(),
  preview: publicCoursePreviewSchema.optional(),
  lifecycle: z.enum(publicDraftLifecycles).default("PREVIEWED"),
}).strict();
export type PublicDraft = z.infer<typeof publicDraftSchema>;

export function serializePublicDraft(draft: Omit<PublicDraft, "version" | "createdAt" | "lifecycle"> & { lifecycle?: PublicDraftLifecycle }, now = Date.now()) {
  return JSON.stringify(publicDraftSchema.parse({ lifecycle: draft.preview ? "PREVIEWED" : "CREATED", ...draft, version: PUBLIC_DRAFT_VERSION, createdAt: now }));
}
export function transitionPublicDraft(value: string | null, lifecycle: PublicDraftLifecycle, now = Date.now()) {
  const draft = deserializePublicDraft(value, now);
  return draft ? JSON.stringify({ ...draft, lifecycle }) : null;
}
export function deserializePublicDraft(value: string | null, now = Date.now()): PublicDraft | null {
  if (!value) return null;
  try {
    const parsed = publicDraftSchema.safeParse(JSON.parse(value));
    return parsed.success && now - parsed.data.createdAt <= PUBLIC_DRAFT_TTL_MS ? parsed.data : null;
  } catch { return null; }
}
