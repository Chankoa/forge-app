"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseForgeConfig } from "@/lib/forge/config";
import { createForgeRateLimiter } from "@/lib/forge/rate-limit";
import { createCourseWorkflowProvider } from "@/lib/forge/intelligence/provider";
import { courseCapabilityDefinitions } from "@/lib/forge/intelligence/capabilities";
import { createCoursePlanRepository } from "@/lib/forge/orchestrator/repository";
import { applyCoursePlan, failure, orchestrateCourse } from "@/lib/forge/orchestrator/service";
import { applyRequestSchema, planRequestSchema, type ApplyReport, type CourseWorkflowData, type WorkflowResult } from "@/lib/forge/orchestrator/contracts";

const consume = createForgeRateLimiter();
export async function generateCoursePlanAction(raw: unknown): Promise<WorkflowResult<CourseWorkflowData>> {
  if (!planRequestSchema.safeParse(raw).success) return failure("analyze_course", "validation_error", "La demande est invalide.");
  try {
    const client = await createServerSupabaseClient();
    const user = client ? (await client.auth.getUser()).data.user : null;
    if (!client || !user) return failure("analyze_course", "permission_denied", "Connectez-vous pour analyser ce parcours.");
    const config = parseForgeConfig(process.env);
    return await orchestrateCourse(raw, { ...createCoursePlanRepository(client, user.id), provider: createCourseWorkflowProvider(config, process.env), maxInputChars: config.maxInputChars, consume: () => consume(user.id, config.rateLimitPerHour), telemetry: (data) => console.info("[forge] orchestrator", { ...data, provider: process.env.AI_PROVIDER || "openai-compatible", model: courseCapabilityDefinitions.analyze_course.resolveModel(process.env, config.model) }) });
  } catch { return failure("analyze_course", "provider_error", "Forge est indisponible pour le moment."); }
}
export async function applyCoursePlanAction(raw: unknown): Promise<WorkflowResult<ApplyReport>> {
  if (!applyRequestSchema.safeParse(raw).success) return failure("apply_course_changes", "validation_error", "La sélection est invalide.");
  try {
    const client = await createServerSupabaseClient();
    const user = client ? (await client.auth.getUser()).data.user : null;
    if (!client || !user) return failure("apply_course_changes", "permission_denied", "Connectez-vous pour modifier ce parcours.");
    const result = await applyCoursePlan(raw, createCoursePlanRepository(client, user.id));
    if (result.data?.results.some((item) => item.status === "success" || item.status === "failed")) {
      try {
        revalidatePath("/app/courses/[courseSlug]", "layout");
        revalidatePath("/app/courses");
        revalidatePath("/app");
        revalidatePath("/app/explore");
      } catch (error) {
        console.error("[forge] course plan revalidation failed", error);
        return {
          ...result,
          summary: `${result.summary} Le rechargement automatique a échoué ; rechargez le parcours pour voir les modifications.`,
          warnings: [...result.warnings, "Les résultats d’application restent valides. Rechargez le parcours pour actualiser les données affichées."],
        };
      }
    }
    return result;
  } catch { return failure("apply_course_changes", "validation_error", "Impossible de confirmer l’enregistrement. Rechargez le parcours avant de réessayer."); }
}
