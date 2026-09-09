import { z } from "zod";

export const createIntentSchema = z.object({ brief: z.string().trim().min(12).max(360), audience: z.string().trim().max(260).optional(), objective: z.string().trim().max(260).optional(), constraints: z.string().trim().max(500).optional() });
export type CreateIntent = z.infer<typeof createIntentSchema>;
export type CourseProposal = { title: string; description: string; modules: Array<{ title: string; lessons: Array<{ title: string; description: string }> }> };
export const courseMetadataSchema = z.object({ title: z.string().trim().min(3).max(260), description: z.string().trim().min(3).max(4000), subtitle: z.string().trim().max(500).optional() });
export const moduleSchema = z.object({ title: z.string().trim().min(2).max(220) });
export const lessonSchema = z.object({ title: z.string().trim().min(2).max(220), description: z.string().trim().max(1000).optional(), content: z.string().max(20000).optional(), objectives: z.array(z.string().trim().min(1).max(300)).max(8).optional(), type: z.enum(["reading", "video", "exercise"]).optional(), durationMinutes: z.coerce.number().int().min(0).max(1440).nullable().optional(), publishingStatus: z.enum(["draft", "published", "locked"]).optional() });

export function manualProposalFromIntent(intent: CreateIntent): CourseProposal { return { title: intent.brief.slice(0, 90), description: intent.objective || intent.brief, modules: [{ title: "Fondations", lessons: [{ title: "Introduction", description: intent.audience ? `Pour ${intent.audience}.` : "Poser les bases du parcours." }] }] }; }