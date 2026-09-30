"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseForgeConfig } from "@/lib/forge/config";
import { createForgeRateLimiter } from "@/lib/forge/rate-limit";
import { publicPreviewRequestSchema } from "@/lib/forge/public-contracts";
import { createIntelligenceProvider } from "@/lib/forge/intelligence/provider";
import { getOwnedCurriculumContext, getPublicCandidates } from "@/lib/forge/intelligence/repository";
import { runIntelligence } from "@/lib/forge/intelligence/service";
import type { CurriculumResult, IntelligenceResponse, SubjectDiscoveryResult } from "@/lib/forge/intelligence/contracts";

const consume = createForgeRateLimiter();

export async function discoverSubjectAction(raw: unknown): Promise<IntelligenceResponse<{ summary: string; matches: Array<SubjectDiscoveryResult["matches"][number] & { course: { slug: string; title: string; description: string | null; domain: string | null } }> }>> {
  const parsed = publicPreviewRequestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid_request" };
  const client = await createServerSupabaseClient();
  if (!client) return { ok: false, error: "context_unavailable" };
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  try {
    const candidates = await getPublicCandidates(client, `${parsed.data.intent} ${parsed.data.domain ?? ""} ${parsed.data.objective ?? ""}`);
    if (!candidates.length) return { ok: true, result: { summary: "Aucun parcours public proche n’a été trouvé dans les métadonnées disponibles.", matches: [] } };
    const config = parseForgeConfig(process.env);
    const response = await runIntelligence("subject_discovery", parsed.data, candidates, { provider: createIntelligenceProvider(config, process.env), maxInputChars: config.maxInputChars, consumeRateLimit: () => consume(user.id, config.rateLimitPerHour), telemetry: (data) => console.info("[forge] intelligence", { ...data, model: process.env.FORGE_SUBJECT_DISCOVERY_MODEL || config.model }) });
    if (!response.ok) return response;
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    return { ok: true, result: { summary: response.result.summary, matches: response.result.matches.map((match) => { const course = byId.get(match.courseId)!; return { ...match, course: { slug: course.slug, title: course.title, description: course.description, domain: course.domain } }; }) } };
  } catch { return { ok: false, error: "context_unavailable" }; }
}

export async function analyzeCurriculumAction(courseId: string): Promise<IntelligenceResponse<CurriculumResult>> {
  if (typeof courseId !== "string" || !/^[0-9a-f-]{36}$/i.test(courseId)) return { ok: false, error: "invalid_request" };
  const client = await createServerSupabaseClient();
  if (!client) return { ok: false, error: "context_unavailable" };
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  try {
    const context = await getOwnedCurriculumContext(client, courseId, user.id);
    if (!context) return { ok: false, error: "forbidden" };
    const config = parseForgeConfig(process.env);
    return await runIntelligence("curriculum_analysis", null, context, { provider: createIntelligenceProvider(config, process.env), maxInputChars: config.maxInputChars, consumeRateLimit: () => consume(user.id, config.rateLimitPerHour), telemetry: (data) => console.info("[forge] intelligence", { ...data, model: process.env.FORGE_CURRICULUM_ANALYSIS_MODEL || config.model }) });
  } catch { return { ok: false, error: "context_unavailable" }; }
}
