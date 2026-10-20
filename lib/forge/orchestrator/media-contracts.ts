import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);

export const coverAspectRatios = ["3:2", "16:9"] as const;
export type CoverAspectRatio = (typeof coverAspectRatios)[number];
export const mediaCapabilityIds = ["generate_cover_brief", "generate_cover_prompt", "generate_cover_image", "generate_visual_brief", "generate_visual_prompt", "generate_visual_image"] as const;
export type MediaCapability = (typeof mediaCapabilityIds)[number];

// Bounded, identity-level context. No discussions, emails, profile data, storage URLs or lesson bodies.
export const coverContextSchema = z.object({
  title: text(260), subtitle: z.string().max(300).nullable(), description: z.string().max(1200).nullable(), domain: z.string().max(120).nullable(), level: z.string().max(60).nullable(),
  objectives: z.array(z.string().max(240)).max(12), moduleTitles: z.array(z.string().max(240)).max(12),
}).strict();
export type CoverContext = z.infer<typeof coverContextSchema>;

export const visualBriefSchema = z.object({
  subject: text(200), educationalIntent: text(300), audience: text(200), visualDirection: text(400), mood: text(120), composition: text(300),
  keyConcepts: z.array(text(120)).min(1).max(6), preferredMetaphors: z.array(text(160)).max(4), avoid: z.array(text(120)).max(8),
  paletteDirection: text(200), imageStyle: text(160), textInImage: z.enum(["none", "minimal"]), aspectRatio: z.enum(coverAspectRatios),
  accessibilityIntent: text(300), imageIntent: z.enum(["decorative", "instructional"]),
}).strict();
export type VisualBrief = z.infer<typeof visualBriefSchema>;

export const coverPromptSchema = z.object({
  prompt: z.string().trim().min(20).max(1500), avoid: z.array(text(120)).max(10), aspectRatio: z.enum(coverAspectRatios),
  styleNotes: text(300), accessibilityNotes: text(300), altText: text(250),
}).strict();
export type CoverPrompt = z.infer<typeof coverPromptSchema>;

export const coverBriefRequestSchema = z.object({ courseId: z.uuid(), previous: visualBriefSchema.optional(), instruction: z.string().trim().min(1).max(500).optional() })
  .strict().refine((value) => Boolean(value.previous) === Boolean(value.instruction), { message: "previous and instruction go together" });
export const coverPromptRequestSchema = z.object({ courseId: z.uuid(), brief: visualBriefSchema }).strict();
// The image capability receives only the validated prompt and the aspect ratio.
export const coverImageRequestSchema = z.object({ courseId: z.uuid(), prompt: z.string().trim().min(20).max(1500), aspectRatio: z.enum(coverAspectRatios) }).strict();

export const coverImageResultSchema = z.object({
  status: z.literal("success"), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), size: z.number().int().positive(), width: z.number().int().positive(), height: z.number().int().positive(), previewUrl: z.string().startsWith("data:image/"),
}).strict();
export type CoverImageResult = z.infer<typeof coverImageResultSchema>;

// Lesson illustrations reuse the cover brief/prompt/image schemas; only the target (a lesson) and the purpose differ.
export const lessonVisualPurposes = ["figurative", "conceptual"] as const;
export type LessonVisualPurpose = (typeof lessonVisualPurposes)[number];
// Bounded lesson context: course identity, module/lesson titles, objectives and a short body excerpt. No discussions, learners, emails or storage URLs.
export const lessonVisualContextSchema = z.object({
  course: z.object({ title: text(260), subtitle: z.string().max(300).nullable(), domain: z.string().max(120).nullable(), level: z.string().max(60).nullable() }).strict(),
  moduleTitle: z.string().max(240), lessonTitle: text(260), description: z.string().max(600).nullable(), objectives: z.array(z.string().max(240)).max(8), excerpt: z.string().max(1500),
}).strict();
export type LessonVisualContext = z.infer<typeof lessonVisualContextSchema>;

const lessonTarget = { courseId: z.uuid(), lessonId: z.uuid() };
export const visualBriefRequestSchema = z.object({ ...lessonTarget, purpose: z.enum(lessonVisualPurposes), direction: z.string().trim().min(1).max(600).optional() }).strict();
export const visualPromptRequestSchema = z.object({ ...lessonTarget, purpose: z.enum(lessonVisualPurposes), brief: visualBriefSchema }).strict();
export const visualImageRequestSchema = z.object({ ...lessonTarget, prompt: z.string().trim().min(20).max(1500), aspectRatio: z.enum(coverAspectRatios) }).strict();

export type MediaResult<T> = { capability: MediaCapability; status: "success" | "invalid_result" | "permission_denied" | "provider_error" | "validation_error"; summary: string; data: T | null };
export type CoverImageBytes = { bytes: Uint8Array };

export const coverMessages = {
  brief: "Forge n’a pas pu préparer la direction visuelle.",
  image: "Forge n’a pas pu générer cette image.",
  unusable: "Cette image ne peut pas être utilisée comme couverture.",
  save: "L’enregistrement de la couverture a échoué.",
  denied: "Vous ne pouvez pas créer de couverture pour ce parcours.",
  invalid: "La demande est invalide.",
} as const;

export const lessonVisualMessages = {
  brief: "Forge n’a pas pu préparer la direction visuelle.",
  image: "Cette image n’a pas pu être générée.",
  unusable: "Cette image ne peut pas être utilisée.",
  denied: "Vous ne pouvez pas créer d’image pour cette leçon.",
  invalid: "La demande est invalide.",
  save: "L’image n’a pas pu être enregistrée.",
  alt: "Ajoutez un texte alternatif pour l’image.",
} as const;
