import { forgeTransformContracts, validateForgePatch, type ForgeIntent } from "./contracts";
import type { LessonDraft } from "@/lib/courses/lesson-draft";

export type LessonProposalApplication =
  | { ok: true; draft: LessonDraft; field: "content" | "objectives" }
  | { ok: false; reason: "invalid_patch" | "unsupported_patch" };

export function applyLessonProposalToDraft(draft: LessonDraft, intent: ForgeIntent, patch: unknown): LessonProposalApplication {
  const validation = validateForgePatch(intent, "lesson", patch);
  if (!validation.success) return { ok: false, reason: "invalid_patch" };

  if (intent === "objectives" && validation.patch.objectives?.length) {
    return { ok: true, field: "objectives", draft: { ...draft, objectives: validation.patch.objectives.join("\n") } };
  }

  if (forgeTransformContracts[intent]?.required === "content" && validation.patch.content) {
    return { ok: true, field: "content", draft: { ...draft, content: validation.patch.content } };
  }

  return { ok: false, reason: "unsupported_patch" };
}
