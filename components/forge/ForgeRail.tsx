"use client";

import { WorkspaceRail } from "@/components/course/WorkspacePanels";
import { useEffect, useRef, useState, useTransition } from "react";
import { generateForgeAction } from "@/app/app/forge/actions";
import { listForgeSourcesAction, type ForgeSourceOption } from "@/app/app/forge/source-actions";
import type { ForgeAvailability, ForgeIntent, ForgeRailContext, ForgeResponse, ForgeResult } from "@/lib/forge/contracts";
import { forgeResultAfterResponse } from "@/lib/forge/result-state";
import { useForgeProposal } from "./ForgeProposalContext";
import { ForgeProposalDialog } from "./ForgeProposalDialog";
import { ContentIntelligence } from "./ContentIntelligence";
import { forgeLessonContentEvent } from "@/lib/forge/lesson-content-event";

const intents: Record<"learn" | "edit", Array<{ label: string; value: ForgeIntent }>> = {
  learn: [{ label: "Expliquer", value: "explain" }, { label: "Clarifier", value: "clarify" }, { label: "Reformuler", value: "rephrase" }, { label: "Donner un exemple", value: "example" }, { label: "Me questionner", value: "quiz" }],
  edit: [{ label: "Structurer", value: "structure" }, { label: "Reformuler", value: "rephrase" }, { label: "Simplifier", value: "simplify" }, { label: "Résumer", value: "summarize" }, { label: "Proposer des objectifs", value: "objectives" }],
};
const errors: Record<string, string> = { invalid_request: "La demande Forge est invalide.", unauthenticated: "Votre session a expiré.", forbidden: "Forge n'est pas disponible dans ce contexte.", context_unavailable: "Le contexte de la leçon est indisponible.", source_unavailable: "Une source sélectionnée n'est plus disponible.", not_configured: "La configuration Forge est incomplète.", provider_auth: "L'authentification du provider IA a été refusée.", provider_not_found: "Le modèle ou l'endpoint IA est introuvable.", provider_network: "Le provider IA est inaccessible.", provider_error: "Le provider IA a rencontré une erreur non classée.", timeout: "Forge a dépassé le délai de réponse.", rate_limited: "La limite de générations est atteinte. Réessayez plus tard.", invalid_result: "Forge a reçu une réponse provider invalide." };

export function ForgeRail({ context, availability }: { context: ForgeRailContext; availability: ForgeAvailability }) {

  const [pending, startTransition] = useTransition();
  const [activeIntent, setActiveIntent] = useState<ForgeIntent | null>(null);
  const [result, setResult] = useState<ForgeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sources, setSources] = useState<ForgeSourceOption[]>([]);
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const applyingRef = useRef(false);
  const [confirmation, setConfirmation] = useState("");
  const [lastRequest, setLastRequest] = useState<{ intent: ForgeIntent; input?: string; sourceIds: string[] } | null>(null);
  const { setProposal } = useForgeProposal();

  useEffect(() => {
    let active = true;
    const load = () => listForgeSourcesAction({ courseSlug: context.courseSlug, mode: context.mode }).then((options) => { if (active) setSources(options); });
    load();
    window.addEventListener("forge-sources-changed", load);
    return () => { active = false; window.removeEventListener("forge-sources-changed", load); };
  }, [context.courseSlug, context.mode]);


  const run = (intent: ForgeIntent, freeInput?: string, keepCurrent = false, requestedSourceIds = sourceIds) => startTransition(async () => {
    setActiveIntent(intent); setError(null); setConfirmation(""); if (!keepCurrent) { setResult(null); setProposal(null); }
    try {
      const response: ForgeResponse = await generateForgeAction({ mode: context.mode, intent, courseSlug: context.courseSlug, lessonSlug: context.lessonSlug, sourceIds: requestedSourceIds, input: freeInput });
      setResult((current) => forgeResultAfterResponse(current, response));
      if (!response.ok) { setError(response.error === "invalid_result" ? "La proposition n’a pas pu être générée complètement. Vous pouvez réessayer." : errors[response.error]); return; }
      setLastRequest({ intent, input: freeInput, sourceIds: requestedSourceIds }); if (response.result.mode === "edit" && "proposal" in response.result) setDialogOpen(true);
    } catch {
      setError("Forge n’a pas pu terminer la demande. Vous pouvez réessayer.");
    } finally { setActiveIntent(null); }
  });
  useEffect(() => {
    const generate = () => {
      if (context.mode !== "edit" || !context.lessonSlug || pending) return;
      run("generate_content", undefined, false, sourceIds.length ? sourceIds : sources.filter((source) => source.usable).slice(0, 4).map((source) => source.id));
    };
    window.addEventListener(forgeLessonContentEvent, generate);
    return () => window.removeEventListener(forgeLessonContentEvent, generate);
  });
  const proposal = result?.mode === "edit" && "proposal" in result ? result : null;
  const toggleSource = (id: string) => setSourceIds((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);

  return <WorkspaceRail panel="forge">
      <h2>{context.mode === "learn" ? "Comprendre avec Forge" : context.lessonSlug ? "Forge pour cette leçon" : "Forge pour ce parcours"}</h2><p className="caption">Contexte enregistré : {context.lessonTitle ?? context.courseTitle}</p>
      {context.mode === "edit" && context.lessonSlug && <section className="forge-action-group" aria-labelledby="forge-lesson-actions-title"><h3 id="forge-lesson-actions-title">Actions sur la leçon</h3><p className="caption">Transformations directes proposées pour le contenu de cette leçon.</p><div className="forge-intents"><button type="button" aria-pressed={activeIntent === "generate_content"} disabled={Boolean(pending || availability === "not_configured")} onClick={() => run("generate_content", undefined, false, sourceIds.length ? sourceIds : sources.filter((source) => source.usable).slice(0, 4).map((source) => source.id))}>{activeIntent === "generate_content" ? "Forge prépare..." : "Générer le contenu"}</button>{intents.edit.map((intent) => <button type="button" aria-pressed={activeIntent === intent.value} className={activeIntent === intent.value ? "is-active" : undefined} disabled={Boolean(pending || availability === "not_configured")} key={intent.value} onClick={() => run(intent.value)}>{activeIntent === intent.value ? "Forge prépare..." : intent.label}</button>)}</div><p className="caption">{context.hasLessonContent ? "Le contenu généré sera proposé comme remplacement à examiner." : "La proposition utilise jusqu’à quatre sources disponibles du parcours."}</p></section>}
      {context.mode === "edit" && !context.lessonSlug && <section className="forge-action-group" aria-labelledby="forge-course-actions-title"><h3 id="forge-course-actions-title">Actions sur le parcours</h3><div className="forge-intents"><button type="button" aria-pressed={activeIntent === "improve"} disabled={Boolean(pending || availability === "not_configured")} onClick={() => run("improve")}>{activeIntent === "improve" ? "Forge prépare..." : "Améliorer le parcours"}</button><button type="button" aria-pressed={activeIntent === "summarize"} disabled={Boolean(pending || availability === "not_configured")} onClick={() => run("summarize")}>Résumer</button></div><p className="caption">Titre, résumé court et description : chaque proposition est à examiner avant sauvegarde.</p></section>}
      {context.mode === "learn" && <div className="forge-intents">{intents.learn.map((intent) => <button type="button" aria-pressed={activeIntent === intent.value} className={activeIntent === intent.value ? "is-active" : undefined} disabled={Boolean(pending || availability === "not_configured")} key={intent.value} onClick={() => run(intent.value)}>{activeIntent === intent.value ? "Forge prépare..." : intent.label}</button>)}</div>}
      {context.mode === "edit" && context.lessonSlug && context.lessonId && <ContentIntelligence courseSlug={context.courseSlug} lessonSlug={context.lessonSlug} lessonId={context.lessonId} level={context.level} hasContent={context.hasLessonContent ?? false} sourceIds={sourceIds} availability={availability} />}
      <label className="forge-question">Question libre<span className="caption">Une demande ouverte, distincte des actions ci-dessus.</span><textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} placeholder="Posez une question sur cette leçon..." /><button type="button" aria-pressed={activeIntent === "ask"} className={activeIntent === "ask" ? "is-active" : undefined} disabled={Boolean(pending || availability === "not_configured" || !input.trim())} onClick={() => run("ask", input)}>{activeIntent === "ask" ? "Forge prépare..." : "Envoyer"}</button></label>
      {sources.length > 0 && <section className="forge-sources"><h3>Sources à transmettre</h3><p className="caption">Les sources cochées sont demandées. Pour « Générer le contenu », jusqu’à quatre sources disponibles sont utilisées si aucune n’est cochée. Le résultat indique celles réellement envoyées à Forge.</p>{sources.map((source) => <label key={source.id}><input type="checkbox" checked={sourceIds.includes(source.id)} disabled={!source.usable || pending} onChange={() => toggleSource(source.id)} /> <span>{source.title} - {source.type} - {source.usable ? "disponible pour Forge" : source.reason === "not_ready" ? "préparation en cours" : "contenu non exploitable par Forge"}</span></label>)}</section>}
      {pending && <p className="forge-pending" role="status" aria-live="polite" aria-busy="true"><span aria-hidden="true" />{activeIntent === "improve" ? context.lessonSlug ? "Forge améliore la leçon…" : "Forge améliore le parcours…" : sourceIds.length ? "Forge analyse la source…" : activeIntent === "ask" ? "Forge prépare une réponse…" : "Forge prépare une proposition…"}</p>}{error && !dialogOpen && <p className="form-error" role="alert">{error}</p>}{confirmation && <p className="completion-state" role="status">{confirmation}</p>}
      {result && <section className="forge-result"><p className="eyebrow">{proposal ? "Proposition Forge" : "Réponse Forge"}</p><div className="forge-result__text" tabIndex={0}>{result.text}</div><button type="button" className="button button--secondary" onClick={() => setDialogOpen(true)}>{proposal ? "Ouvrir la proposition" : "Ouvrir la réponse"}</button>{result.sourcesUsed.length > 0 && <p className="caption">Sources utilisées par Forge : {result.sourcesUsed.map((source) => source.title).join(", ")}</p>}</section>}
      <p className="caption">{availability === "not_configured" ? "Forge AI non configuré localement." : "Forge ne modifie jamais le contenu sans votre application et sauvegarde explicites."}</p>
      <ForgeProposalDialog result={dialogOpen ? result : null} busy={pending || applying} applying={applying} error={dialogOpen ? error : null} onClose={() => { if (!applyingRef.current) setDialogOpen(false); }} onReject={() => { setDialogOpen(false); setResult(null); setProposal(null); }} onApply={() => { if (!proposal || applyingRef.current) return; applyingRef.current = true; setApplying(true); window.setTimeout(() => { try { setProposal(proposal); setConfirmation("Proposition appliquée au brouillon. Sauvegardez pour rendre la modification persistante."); setDialogOpen(false); setResult(null); } catch { setError("La proposition n’a pas pu être appliquée. Réessayez."); } finally { applyingRef.current = false; setApplying(false); } }, 80); }} onRegenerate={() => { if (lastRequest) run(lastRequest.intent, lastRequest.input, true, lastRequest.sourceIds); }} onAdjust={(adjustment) => { if (!lastRequest || !proposal) return; run(lastRequest.intent, `${lastRequest.input ?? ""}\n\nAjustement demandé : ${adjustment}\n\nProposition à améliorer :\n${proposal.proposal.patch.content ?? proposal.proposal.patch.description ?? proposal.text}`, true, lastRequest.sourceIds); }} />
  </WorkspaceRail>;
}
