"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { analyzeLessonContentAction } from "@/app/app/forge/intelligence-actions";
import type { ForgeAvailability, ForgeResult } from "@/lib/forge/contracts";
import type { ContentReview, ContentTask } from "@/lib/forge/intelligence/contracts";
import { applyTargetedOperation } from "@/lib/forge/intelligence/content-operations";
import { fullRewriteThreshold } from "@/lib/forge/intelligence/content-policy";
import { useForgeProposal, type TargetedContentProposal } from "./ForgeProposalContext";
import { ForgeProposalDialog } from "./ForgeProposalDialog";
import { forgeErrorMessages, forgeProposalStates } from "@/lib/forge/authoring-ux";
import { forgeLessonSavedEvent } from "@/lib/forge/lesson-content-event";
import { lessonAnalysisMessages, lessonResultIsStale } from "@/lib/forge/lesson-analysis-state";

type Proposal = Extract<ForgeResult, { kind: "proposal" }>;
type ContentProposal = Proposal | TargetedContentProposal;
const labels: Record<ContentTask, string> = {
  improve: "Améliorer", clarify: "Clarifier", adapt_level: "Adapter le niveau",
  add_example: "Ajouter un exemple", suggest_activity: "Proposer une activité", coherence_review: "Vérifier la cohérence",
};
const findingLabels: Record<ContentReview["findings"][number]["type"], string> = {
  objective_not_covered: "Objectif non couvert", content_off_scope: "Contenu hors sujet", level_mismatch: "Niveau à ajuster",
  missing_example: "Exemple manquant", weak_progression: "Progression à clarifier",
  excessive_complexity: "Complexité excessive", insufficient_depth: "Approfondissement souhaitable",
};
const importanceLabels = { info: "Information", attention: "À examiner", important: "Important" };
const errorMessages: Record<string, string> = { ...forgeErrorMessages, truncated_output: "Forge n’a pas terminé son analyse. Aucun changement n’a été appliqué.", target_required: "Cette leçon est trop longue pour une réécriture complète fiable. Sélectionnez un passage à améliorer." };

export function ContentIntelligence({ courseSlug, lessonSlug, lessonId, level, hasContent, sourceIds, availability }: {
  courseSlug: string; lessonSlug: string; lessonId: string; level?: string | null; hasContent: boolean; sourceIds: string[]; availability: ForgeAvailability;
}) {
  const [pending, startTransition] = useTransition();
  const pendingRef = useRef(false);
  const applyingRef = useRef(false);
  const launcherRef = useRef<HTMLElement | null>(null);
  const [task, setTask] = useState<ContentTask | null>(null);
  const [targetLevel, setTargetLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [proposal, setCurrentProposal] = useState<ContentProposal | null>(null);
  const [review, setReview] = useState<ContentReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [applying, setApplying] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lastRequest, setLastRequest] = useState<{ task: ContentTask; targetLevel?: "beginner" | "intermediate" | "advanced"; sourceIds: string[]; input?: string } | null>(null);
  const [proposalBaseline, setProposalBaseline] = useState<string | null>(null);
  const [reviewBaseline, setReviewBaseline] = useState<string | null>(null);
  const [staleConflict, setStaleConflict] = useState(false);
  const { applyLessonProposal, lessonDraft } = useForgeProposal();
  const levelAvailable = level === "beginner" || level === "intermediate" || level === "advanced";
  const draft = lessonDraft(lessonId);
  const blockedReason = draft ? draft.blockedReason : lessonAnalysisMessages.unavailable;
  const proposalStale = staleConflict || lessonResultIsStale(proposalBaseline, draft);
  const reviewStale = lessonResultIsStale(reviewBaseline, draft);
  const savedHasContent = draft ? Boolean(draft.content.trim()) : hasContent;
  const isLong = Boolean(draft && draft.content.length > fullRewriteThreshold);
  const selection = draft?.selection ?? null;
  const selectedText = selection?.text ?? null;

  useEffect(() => {
    const onSaved = (event: Event) => {
      if ((event as CustomEvent<{ lessonId: string }>).detail.lessonId !== lessonId) return;
      setError(null);
      setConfirmation("");
    };
    window.addEventListener(forgeLessonSavedEvent, onSaved);
    return () => window.removeEventListener(forgeLessonSavedEvent, onSaved);
  }, [lessonId]);

  function run(nextTask: ContentTask, options?: { targetLevel?: "beginner" | "intermediate" | "advanced"; sourceIds?: string[]; input?: string }) {
    if (pendingRef.current || availability !== "configured") return;
    const current = lessonDraft(lessonId);
    if (!current || current.blockedReason) { setError(current?.blockedReason ?? lessonAnalysisMessages.unavailable); return; }
    const baseline = current.fingerprint;
    pendingRef.current = true;
    launcherRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setTask(nextTask); setError(null); setConfirmation("");
    const requiresTarget = isLong && (nextTask === "improve" || nextTask === "clarify" || nextTask === "adapt_level");
    if (requiresTarget && !selectedText) { pendingRef.current = false; setError(errorMessages.target_required); return; }
    const request = { courseSlug, lessonSlug, task: nextTask, sourceIds: options?.sourceIds ?? sourceIds,
      ...(nextTask === "adapt_level" ? { targetLevel: options?.targetLevel ?? targetLevel } : {}),
      ...(selection ? { targetText: selection.text, targetStart: selection.start, targetEnd: selection.end } : {}),
      ...(options?.input ? { input: options.input } : {}) };
    setLastRequest({ task: nextTask, targetLevel: nextTask === "adapt_level" ? options?.targetLevel ?? targetLevel : undefined,
      sourceIds: request.sourceIds, input: options?.input });
    startTransition(async () => {
      try {
        const response = await analyzeLessonContentAction(request);
        if (!response.ok) { setError(errorMessages[response.error]); return; }
        if (response.kind === "proposal") { setProposalBaseline(baseline); setStaleConflict(false); setCurrentProposal(response.result); setDialogOpen(true); }
        else if (response.kind === "targeted") { setProposalBaseline(baseline); setStaleConflict(false); setCurrentProposal({ kind: "targeted", ...response.result }); setDialogOpen(true); }
        else { setReviewBaseline(baseline); setReview(response.result); setDialogOpen(false); }
      } catch { setError("Forge n'a pas pu terminer la demande. Vous pouvez réessayer."); }
      finally { pendingRef.current = false; setTask(null); }
    });
  }

  function closeDialog() { setDialogOpen(false); requestAnimationFrame(() => launcherRef.current?.focus()); }
  const retry = () => { if (lastRequest) run(lastRequest.task, lastRequest); };
  return <section className="forge-content-intelligence" aria-labelledby="content-intelligence-title">
    <h3 id="content-intelligence-title">Analyse pédagogique</h3>
    <p className="caption">Analyse la leçon, ses objectifs et ses sources avant de proposer des améliorations.</p>
    <p className="caption" role="status" aria-live="polite">{blockedReason ?? (availability !== "configured" ? forgeErrorMessages.not_configured : pending ? "Analyse en cours sur la version sauvegardée." : lessonAnalysisMessages.ready)}</p>
    {proposal && proposalStale && <p className="form-error" role="status">{lessonAnalysisMessages.stale}</p>}
    {isLong && <p className="caption" role="status">Cette leçon est trop longue pour une réécriture complète fiable. {selectedText ? "Le passage sélectionné sera ciblé." : "Sélectionnez un passage à améliorer."}</p>}
    <div className="forge-intents">{(["improve", "clarify", "add_example", "suggest_activity", "coherence_review"] as const).map((item) =>
      <button key={item} type="button" disabled={Boolean(blockedReason) || pending || availability !== "configured" || (!savedHasContent && (item === "improve" || item === "clarify")) || (isLong && !selectedText && (item === "improve" || item === "clarify"))} title={blockedReason ?? (!savedHasContent && (item === "improve" || item === "clarify") ? "Ajoutez d'abord du contenu à la leçon." : isLong && !selectedText && (item === "improve" || item === "clarify") ? "Sélectionnez un passage dans l’éditeur." : undefined)} onClick={() => run(item)}>{labels[item]}</button>)}</div>
    {levelAvailable && savedHasContent && <div className="forge-content-intelligence__level"><label>Niveau cible <select value={targetLevel} onChange={(event) => setTargetLevel(event.target.value as typeof targetLevel)}>
      <option value="beginner">Débutant</option><option value="intermediate">Intermédiaire</option><option value="advanced">Avancé</option>
    </select></label><button type="button" className="button button--secondary" disabled={Boolean(blockedReason) || pending || availability !== "configured" || (isLong && !selectedText)} onClick={() => run("adapt_level")}>{labels.adapt_level}</button></div>}
    {pending && <p role="status" aria-live="polite" aria-busy="true">{task === "coherence_review" ? "Analyse de cohérence en cours…" : "Forge prépare la proposition…"}</p>}
    {error && <p className="form-error" role="alert">{error}{(proposal || review) && " Le résultat précédent reste disponible."}</p>}
    {error && lastRequest && <button type="button" className="button button--secondary" disabled={pending || Boolean(blockedReason)} onClick={retry}>Réessayer</button>}
    {confirmation && <p className="completion-state" role="status">{confirmation}</p>}
    {proposal && !dialogOpen && <button type="button" className="button button--secondary" onClick={() => setDialogOpen(true)}>Rouvrir la proposition</button>}
    {review && <section className="forge-content-intelligence__review" aria-label="Revue de cohérence"><h4>Revue de cohérence</h4>{reviewStale && <p role="status">Analyse obsolète. La leçon a changé ; sauvegardez si nécessaire, puis relancez l’analyse.</p>}<p>{review.summary}</p>{review.findings.length ? <ul>{review.findings.map((finding, index) => <li key={`${finding.type}:${index}`}><strong>{findingLabels[finding.type]} · {importanceLabels[finding.importance]}</strong><p>{finding.reason}</p><p>{finding.suggestion}</p></li>)}</ul> : <p>Aucun écart significatif relevé.</p>}</section>}
    <ForgeProposalDialog result={dialogOpen ? proposal : null} busy={pending || applying} applying={applying} error={dialogOpen ? error : null} stale={proposalStale} generationBlocked={Boolean(blockedReason)}
      onClose={closeDialog} onReject={() => { closeDialog(); setCurrentProposal(null); }}
      onApply={() => {
        if (!proposal || pendingRef.current || applyingRef.current) return;
        const latest = lessonDraft(lessonId);
        if (staleConflict || lessonResultIsStale(proposalBaseline, latest)) { setError(lessonAnalysisMessages.stale); return; }
        if (!latest || latest.blockedReason) { setError(latest?.blockedReason ?? lessonAnalysisMessages.unavailable); return; }
        applyingRef.current = true;
        setApplying(true);
        try {
          if (proposal.kind === "targeted") {
            const current = lessonDraft(lessonId);
            if (!current) throw new Error("draft_missing");
            const applied = applyTargetedOperation(current.content, proposal.operation);
            if (!applied.ok) {
              setStaleConflict(true);
              setError("Le contenu a changé depuis la génération. Régénérez la proposition.");
              return;
            }
            current.apply(applied.content);
          } else {
            const applied = applyLessonProposal(lessonId, proposal);
            if (!applied.ok) {
              if (applied.reason === "stale") setStaleConflict(true);
              setError(applied.reason === "stale" ? "Le contenu a changé depuis cette proposition. Relancez l’analyse." : "La modification n'a pas pu être appliquée.");
              return;
            }
          }
          setError(null);
          setConfirmation(`${forgeProposalStates.applied}. Sauvegardez pour enregistrer.`);
          closeDialog();
          setCurrentProposal(null);
        } catch {
          setError("La modification n'a pas pu être appliquée.");
        } finally {
          applyingRef.current = false;
          setApplying(false);
        }
      }}
      onRegenerate={retry} onAdjust={(input) => { if (lastRequest) run(lastRequest.task, { ...lastRequest, input }); }} />
  </section>;
}
