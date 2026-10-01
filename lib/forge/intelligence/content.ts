import { boundForgeContext, buildForgeContext, type ForgeReader } from "../context";
import { ForgeError, type ForgeErrorCode, type ForgeResult } from "../contracts";
import { capabilityDefinitions } from "./capabilities";
import { contentRequestSchema, contentReviewSchema, contentTransformSchema, targetedOperationGenerationSchema, type ContentReview, type ContentTask, type TargetedOperation } from "./contracts";
import { applyTargetedOperation, resolveTarget } from "./content-operations";
import { completeContentText, contentTaskPolicy, fullRewriteThreshold, reviewTextLength } from "./content-policy";

export type ContentResponse =
  | { ok: true; kind: "proposal"; result: Extract<ForgeResult, { kind: "proposal" }> }
  | { ok: true; kind: "targeted"; result: { target: { courseId: string; lessonId: string }; operation: TargetedOperation; text: string; sourcesUsed: Array<{ id: string; title: string }> } }
  | { ok: true; kind: "review"; result: ContentReview; sourcesUsed: Array<{ id: string; title: string }> }
  | { ok: false; error: ForgeErrorCode | "target_required" };

export type ContentProvider = {
  availability: "configured" | "not_configured";
  generate(task: ContentTask, targeted: boolean, messages: { system: string; prompt: string }): Promise<{ output: unknown; finishReason: string }>;
};
export type ContentDeps = {
  userId: string; reader: ForgeReader; provider: ContentProvider; maxInputChars: number;
  consumeRateLimit(userId: string): void;
  telemetry?(data: Record<string, string | number>): void;
};

const taskInstructions: Record<ContentTask, string> = {
  improve: "Améliore la clarté, les transitions et la progression de la leçon sans changer son sens. Retourne le contenu complet modifié dans content ; addition doit être null.",
  clarify: "Clarifie les passages difficiles sans abaisser le niveau demandé ni toucher aux sections sans rapport. Retourne le contenu complet modifié dans content ; addition doit être null.",
  adapt_level: "Adapte explicitement la leçon au targetLevel fourni, sans perdre son objectif ni inventer de faits. Retourne le contenu complet modifié dans content ; addition doit être null.",
  add_example: "Propose UN exemple concret lié à l'objectif et au domaine. Les chiffres éventuels doivent être explicitement hypothétiques. Termine par une phrase complète. Retourne uniquement le nouveau passage dans addition ; content et title doivent être null. Il sera ajouté au brouillon existant.",
  suggest_activity: "Propose UNE activité concise et complète liée à l'objectif, avec une consigne, des étapes et un résultat attendu, sans moteur d'évaluation ni champ nouveau. Termine par une phrase complète et ne commence pas d'étape que tu ne peux pas achever. Retourne uniquement le nouveau passage dans addition ; content et title doivent être null. Il sera ajouté au brouillon existant.",
  coherence_review: "Examine seulement l'alignement du titre, des objectifs, du contenu, du module et du niveau. Retourne summary et au plus quatre findings distincts ; zéro finding est valide si la leçon est cohérente. Aucun patch ni réécriture.",
};

const additiveTasks = new Set<ContentTask>(["add_example", "suggest_activity"]);
const fullRewriteTasks = new Set<ContentTask>(["improve", "clarify", "adapt_level"]);

function failureCode(error: unknown): ForgeErrorCode {
  if (error instanceof ForgeError) return error.code;
  if (error instanceof Error && "code" in error) {
    const code = String(error.code);
    if (["provider_auth", "provider_not_found", "provider_network", "provider_error", "timeout", "rate_limited", "invalid_result", "not_configured"].includes(code)) return code as ForgeErrorCode;
  }
  return "provider_error";
}

export async function runContentIntelligence(raw: unknown, deps: ContentDeps): Promise<ContentResponse> {
  const started = Date.now();
  const parsed = contentRequestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid_request" };
  const request = parsed.data;
  let validationFailure = "none";
  let targeted = false;
  const report = (result: string, validationFailure = "none", targeted = false) => deps.telemetry?.({ capability: "content_intelligence", task: request.task, result, validationFailure, targeted: String(targeted), sourceAware: String(request.sourceIds.length > 0), elapsedMs: Date.now() - started });
  try {
    if (!deps.userId) throw new ForgeError("unauthenticated");
    const rawContext = await buildForgeContext(deps.reader, deps.userId, {
      mode: "edit", intent: "improve", courseSlug: request.courseSlug, lessonSlug: request.lessonSlug,
      sourceIds: request.sourceIds, input: request.input,
    });
    const lessonContent = rawContext.lesson?.content ?? "";
    const isLong = lessonContent.length > fullRewriteThreshold;
    targeted = additiveTasks.has(request.task) || (isLong && fullRewriteTasks.has(request.task));
    if (isLong && fullRewriteTasks.has(request.task) && !request.targetText) return { ok: false, error: "target_required" };
    if (targeted && request.targetText && request.targetStart === undefined) {
      const resolved = resolveTarget(lessonContent, request.targetText);
      if (resolved.count !== 1) throw new ForgeError("invalid_result");
    }
    if (targeted && request.targetStart !== undefined && lessonContent.slice(request.targetStart, request.targetEnd) !== request.targetText) throw new ForgeError("invalid_result");
    const context = targeted
      ? rawContext
      : boundForgeContext(rawContext, deps.maxInputChars);
    if (!context.lesson) throw new ForgeError("context_unavailable");
    if (!targeted && request.task !== "coherence_review" && context.warnings.some((warning) => warning.target === "lesson.content" || warning.target === "lesson.objectives")) throw new ForgeError("context_unavailable");
    if (request.task === "adapt_level" && !["beginner", "intermediate", "advanced"].includes(context.course.level ?? "")) throw new ForgeError("invalid_request");
    if (["improve", "clarify", "adapt_level"].includes(request.task) && !context.lesson.content.trim()) throw new ForgeError("invalid_request");
    if (deps.provider.availability !== "configured") throw new ForgeError("not_configured");
    const targetIndex = request.targetText ? lessonContent.indexOf(request.targetText) : -1;
    const targetContext = targetIndex < 0 ? null : {
      targetText: request.targetText,
      before: lessonContent.slice(Math.max(0, targetIndex - 600), targetIndex),
      after: lessonContent.slice(targetIndex + request.targetText!.length, targetIndex + request.targetText!.length + 600),
    };
    const knowledge = targeted
      ? { course: context.course, module: context.module, lesson: { ...context.lesson, content: undefined }, target: targetContext, sources: context.sources.map((source) => ({ ...source, text: source.text.slice(0, 1800) })) }
      : { course: context.course, module: context.module, lesson: request.task === "coherence_review" && isLong ? { ...context.lesson, content: lessonContent.slice(0, 3000), contentPartial: true } : context.lesson, sources: context.sources };
    const messages = {
      system: `${capabilityDefinitions.content_intelligence.system}\n${taskInstructions[request.task]}\nPour ${request.task}, vise ${contentTaskPolicy[request.task].target}. La limite stricte est ${contentTaskPolicy[request.task].maxChars} caractères pour ${request.task === "coherence_review" ? "l'ensemble du texte de la revue" : request.task === "add_example" || request.task === "suggest_activity" ? "addition ou remplacement" : "content"}. ${targeted ? "Retourne uniquement replacement et rationale pour le passage ciblé. N'écris jamais une réécriture complète de la leçon." : "Retourne une proposition complète de contenu."} Pour une transformation, rationale doit être une ou deux phrases complètes et brèves (idéalement moins de 350 caractères). Ne tronque jamais une phrase, un paragraphe ou une liste pour tenir dans la limite. Ne retourne que le résultat structuré, sans prose hors schéma.`,
      prompt: JSON.stringify({ task: request.task, targetLevel: request.targetLevel ?? null, input: request.input ?? "", knowledge }),
    };
    if (messages.system.length + messages.prompt.length > deps.maxInputChars) throw new ForgeError("context_unavailable");
    deps.consumeRateLimit(deps.userId);
    const generated = await deps.provider.generate(request.task, targeted, messages);
    if (generated.finishReason !== "stop") { validationFailure = generated.finishReason === "length" ? "output_limit" : "malformed_output"; throw new ForgeError("invalid_result"); }
    const sourcesUsed = context.sources.map(({ id, title }) => ({ id, title }));
    if (request.task === "coherence_review") {
      const checked = contentReviewSchema.safeParse(generated.output);
      if (!checked.success) throw new ForgeError("invalid_result");
      if (reviewTextLength(checked.data) > contentTaskPolicy.coherence_review.maxChars || !completeContentText(checked.data.summary, "coherence_review") || checked.data.findings.some((finding) => !completeContentText(finding.suggestion, "coherence_review") || !completeContentText(finding.reason, "coherence_review"))) throw new ForgeError("invalid_result");
      const seen = new Set<string>();
      const findings = checked.data.findings.filter((finding) => {
        const key = `${finding.type}:${finding.reason.toLocaleLowerCase("fr").replace(/\s+/g, " ").trim()}`;
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });
      report("ok", "none", targeted);
      return { ok: true, kind: "review", result: { ...checked.data, findings }, sourcesUsed };
    }
    if (targeted) {
      const checked = targetedOperationGenerationSchema.safeParse(generated.output);
      if (!checked.success) { validationFailure = "target_operation_schema"; throw new ForgeError("invalid_result"); }
      const expectedOperation: TargetedOperation["operation"] = additiveTasks.has(request.task) ? request.targetText ? "insert_after" : "append" : "replace_section";
      const operation = { ...checked.data, operation: expectedOperation, targetText: request.targetText ?? null, targetStart: request.targetStart ?? null, targetEnd: request.targetEnd ?? null };
      if (!completeContentText(operation.rationale, "improve") || !completeContentText(operation.replacement, request.task)) { validationFailure = "target_operation_incomplete"; throw new ForgeError("invalid_result"); }
      const virtual = applyTargetedOperation(lessonContent, operation);
      if (!virtual.ok) { validationFailure = "target_operation_apply"; throw new ForgeError("invalid_result"); }
      report("ok", "none", targeted);
      return { ok: true, kind: "targeted", result: { target: { courseId: context.course.id, lessonId: context.lesson.id }, operation, text: operation.rationale, sourcesUsed } };
    }
    const checked = contentTransformSchema.safeParse(generated.output);
    if (!checked.success) throw new ForgeError("invalid_result");
    const { title, content, addition, rationale } = checked.data;
    if (!completeContentText(rationale, "improve")) throw new ForgeError("invalid_result");
    const additive = additiveTasks.has(request.task);
    if (additive ? !addition || content !== null || title !== null : !content || addition !== null) {
      validationFailure = "proposal_shape"; throw new ForgeError("invalid_result");
    }
    const generatedText = additive ? addition! : content!;
    if (!completeContentText(generatedText, request.task)) throw new ForgeError("invalid_result");
    const nextContent = additive ? [context.lesson.content.trimEnd(), addition].filter(Boolean).join("\n\n") : content!;
    if (nextContent.length > contentTaskPolicy.improve.maxChars) throw new ForgeError("invalid_result");
    const result: Extract<ForgeResult, { kind: "proposal" }> = {
      mode: "edit", kind: "proposal", intent: "improve", text: rationale, sourcesUsed,
      metadata: { warnings: context.warnings, finishReason: "stop" },
      proposal: { target: { courseId: context.course.id, lessonId: context.lesson.id },
        patch: { title, subtitle: null, description: null, content: nextContent, objectives: null }, application: "explicit_only" },
    };
    report("ok", "none", targeted);
    return { ok: true, kind: "proposal", result };
  } catch (error) {
    const code = failureCode(error);
    report(code, code === "invalid_result" ? (validationFailure === "none" ? "malformed_output" : validationFailure) : "none", targeted);
    return { ok: false, error: code };
  }
}
