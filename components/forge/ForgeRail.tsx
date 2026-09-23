"use client";

import { WorkspaceRail } from "@/components/course/WorkspacePanels";
import { useEffect, useState, useTransition } from "react";
import { generateForgeAction } from "@/app/app/forge/actions";
import { listForgeSourcesAction, type ForgeSourceOption } from "@/app/app/forge/source-actions";
import type { ForgeAvailability, ForgeIntent, ForgeRailContext, ForgeResponse, ForgeResult } from "@/lib/forge/contracts";
import { useForgeProposal } from "./ForgeProposalContext";
import { ForgeProposalDialog } from "./ForgeProposalDialog";

const intents: Record<"learn" | "edit", Array<{ label: string; value: ForgeIntent }>> = {
  learn: [{ label: "Expliquer", value: "explain" }, { label: "Clarifier", value: "clarify" }, { label: "Reformuler", value: "rephrase" }, { label: "Donner un exemple", value: "example" }, { label: "Me questionner", value: "quiz" }],
  edit: [{ label: "Structurer", value: "structure" }, { label: "Améliorer", value: "improve" }, { label: "Reformuler", value: "rephrase" }, { label: "Simplifier", value: "simplify" }, { label: "Résumer", value: "summarize" }, { label: "Proposer des objectifs", value: "objectives" }],
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
    setActiveIntent(intent); setError(null); if (!keepCurrent) { setResult(null); setProposal(null); }
    const response: ForgeResponse = await generateForgeAction({ mode: context.mode, intent, courseSlug: context.courseSlug, lessonSlug: context.lessonSlug, sourceIds: requestedSourceIds, input: freeInput });
    setActiveIntent(null);
    if (!response.ok) { setError(errors[response.error]); return; }
    setResult(response.result); setLastRequest({ intent, input: freeInput, sourceIds: requestedSourceIds }); if (response.result.mode === "edit" && "proposal" in response.result) setDialogOpen(true);
  });
  const proposal = result?.mode === "edit" && "proposal" in result ? result : null;
  const toggleSource = (id: string) => setSourceIds((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);

  return <WorkspaceRail panel="forge">
      <h2>Vous aider à {context.mode === "learn" ? "comprendre" : "créer et améliorer"}</h2><p className="caption">Contexte enregistré : {context.lessonTitle ?? context.courseTitle}</p>
      <div className="forge-intents">{intents[context.mode].filter((intent) => context.mode !== "edit" || context.lessonSlug || ["structure", "improve", "summarize", "objectives"].includes(intent.value)).map((intent) => <button type="button" aria-pressed={activeIntent === intent.value} className={activeIntent === intent.value ? "is-active" : undefined} disabled={Boolean(pending || availability === "not_configured")} key={intent.value} onClick={() => run(intent.value)}>{activeIntent === intent.value ? "Forge prépare..." : intent.value === "improve" && !context.lessonSlug ? "Améliorer le parcours" : intent.label}</button>)}</div>
      <label className="forge-question">Question libre<textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} placeholder="Posez une question sur cette leçon..." /><button type="button" aria-pressed={activeIntent === "ask"} className={activeIntent === "ask" ? "is-active" : undefined} disabled={Boolean(pending || availability === "not_configured" || !input.trim())} onClick={() => run("ask", input)}>{activeIntent === "ask" ? "Forge prépare..." : "Envoyer"}</button></label>
      {sources.length > 0 && <section className="forge-sources"><h3>Sources à transmettre</h3><p className="caption">Une source cochée est demandée. Le résultat indique celles réellement envoyées à Forge.</p>{sources.map((source) => <label key={source.id}><input type="checkbox" checked={sourceIds.includes(source.id)} disabled={!source.usable || pending} onChange={() => toggleSource(source.id)} /> <span>{source.title} - {source.type} - {source.usable ? "disponible pour Forge" : source.reason === "not_ready" ? "préparation en cours" : "contenu non exploitable par Forge"}</span></label>)}</section>}
      {pending && <p className="forge-pending" role="status" aria-live="polite" aria-busy="true"><span aria-hidden="true" />{activeIntent === "improve" ? context.lessonSlug ? "Forge améliore la leçon…" : "Forge améliore le parcours…" : sourceIds.length ? "Forge analyse la source…" : activeIntent === "ask" ? "Forge prépare une réponse…" : "Forge prépare une proposition…"}</p>}{error && <p className="form-error" role="alert">{error}</p>}
      {result && <section className="forge-result"><p className="eyebrow">{proposal ? "Proposition Forge" : "Réponse Forge"}</p><div className="forge-result__text" tabIndex={0}>{result.text}</div><button type="button" className="button button--secondary" onClick={() => setDialogOpen(true)}>{proposal ? "Ouvrir la proposition" : "Ouvrir la réponse"}</button>{result.sourcesUsed.length > 0 && <p className="caption">Sources utilisées par Forge : {result.sourcesUsed.map((source) => source.title).join(", ")}</p>}</section>}
      <p className="caption">{availability === "not_configured" ? "Forge AI non configuré localement." : "Forge ne modifie jamais le contenu sans votre application et sauvegarde explicites."}</p>
      <ForgeProposalDialog result={dialogOpen ? result : null} busy={pending} onClose={() => setDialogOpen(false)} onReject={() => { setDialogOpen(false); setResult(null); setProposal(null); }} onApply={() => { if (!proposal) return; setProposal(proposal); setDialogOpen(false); setResult(null); }} onRegenerate={() => { if (lastRequest) run(lastRequest.intent, lastRequest.input, true, lastRequest.sourceIds); }} onAdjust={(adjustment) => { if (!lastRequest || !proposal) return; run(lastRequest.intent, `${lastRequest.input ?? ""}\n\nAjustement demandé : ${adjustment}\n\nProposition à améliorer :\n${proposal.proposal.patch.content ?? proposal.proposal.patch.description ?? proposal.text}`, true, lastRequest.sourceIds); }} />
  </WorkspaceRail>;
}
