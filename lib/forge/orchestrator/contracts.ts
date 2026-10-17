import { z } from "zod";
import { courseMetadataSchema, lessonSchema, moduleSchema } from "../authoring-contracts";

const text = z.string().trim().min(1).max(900);
export const targetSchema = z.object({ kind: z.enum(["course", "module", "lesson"]), id: z.uuid(), moduleId: z.uuid().nullable() }).strict();
export type CourseTarget = z.infer<typeof targetSchema>;
export const courseContextSchema = z.object({
  course: z.object({ id: z.uuid(), title: z.string(), subtitle: z.string().nullable(), description: z.string().nullable(), domain: z.string().nullable(), level: z.string().nullable(), durationMinutes: z.number().nullable(), sourceCount: z.number().int().nonnegative() }).strict(),
  modules: z.array(z.object({ id: z.uuid(), title: z.string(), position: z.number().int(), lessons: z.array(z.object({ id: z.uuid(), moduleId: z.uuid(), title: z.string(), position: z.number().int(), objectives: z.array(z.string()).nullable(), durationMinutes: z.number().nullable(), contentLength: z.number().int().nonnegative(), hasMedia: z.boolean() }).strict()) }).strict()),
}).strict();
export type CoursePlanContext = z.infer<typeof courseContextSchema>;
export const operationTypes = ["rename_course", "update_course_summary", "rename_module", "rename_lesson", "update_lesson_objective"] as const;
export const operationLabels: Record<typeof operationTypes[number], string> = {
  rename_course: "Renommer le parcours", update_course_summary: "Modifier la description", rename_module: "Renommer le module", rename_lesson: "Renommer la leçon", update_lesson_objective: "Modifier les objectifs",
};
export const evidenceSchema = z.object({ target: targetSchema, field: z.enum(["title", "description", "objectives", "lessonCount", "contentLength", "durationMinutes", "sourceCount"]), value: z.string().max(4000) }).strict();
export const courseAnalysisSchema = z.object({ summary: text, observations: z.array(z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/), category: z.enum(["structure", "progression", "balance", "objectives", "content", "practice", "assessment", "resources", "clarity", "redundancy"]), severity: z.enum(["info", "attention", "important"]), target: targetSchema,
  title: text, explanation: text, evidence: z.array(evidenceSchema).min(1).max(4), possibleActions: z.array(text).max(4),
}).strict()).max(5) }).strict();
export type CourseAnalysis = z.infer<typeof courseAnalysisSchema>;
export const operationSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/), type: z.enum(operationTypes), target: targetSchema, reason: text,
  before: z.string().max(4000).nullable(), after: z.string().trim().min(1).max(4000),
  selected: z.boolean(), editable: z.literal(true), dependencies: z.array(z.string().max(64)).max(5),
}).strict();
export type CourseOperation = z.infer<typeof operationSchema>;
export const changePlanSchema = z.object({ planId: z.uuid(), summary: text, analysisReferences: z.array(z.string().max(64)).max(5), operations: z.array(operationSchema).max(8), warnings: z.array(text).max(5) }).strict();
export type ForgeChangePlan = z.infer<typeof changePlanSchema>;
export const planRequestSchema = z.object({ courseId: z.uuid(), capability: z.enum(["analyze_course", "propose_course_changes"]), previous: changePlanSchema.optional(), instruction: z.string().trim().min(1).max(2000).optional() }).strict();
export const applyRequestSchema = z.object({ courseId: z.uuid(), plan: changePlanSchema, selectedIds: z.array(z.string().max(64)).min(1).max(8) }).strict();
export const applyReportSchema = z.object({ results: z.array(z.object({ id: z.string(), status: z.enum(["success", "failed", "stale", "skipped"]) }).strict()), verified: z.boolean() }).strict();
export type ApplyReport = z.infer<typeof applyReportSchema>;
export type CourseWorkflowData = { analysis: CourseAnalysis; plan: ForgeChangePlan; changedIds: string[] };
export type CourseCapability = "analyze_course" | "propose_course_changes" | "apply_course_changes";
export type WorkflowResult<T> = { capability: CourseCapability; status: "success" | "invalid_result" | "permission_denied" | "provider_error" | "validation_error"; summary: string; data: T | null; warnings: string[]; applicationMode: "review" | "persisted" };

export function validateProposedValue(operation: CourseOperation) {
  switch (operation.type) {
    case "rename_course": return courseMetadataSchema.shape.title.safeParse(operation.after).success;
    case "update_course_summary": return courseMetadataSchema.shape.description.safeParse(operation.after).success;
    case "rename_module": return moduleSchema.shape.title.safeParse(operation.after).success;
    case "rename_lesson": return lessonSchema.shape.title.safeParse(operation.after).success;
    case "update_lesson_objective": return lessonSchema.shape.objectives.unwrap().safeParse(operation.after.split("\n")).success;
  }
}
