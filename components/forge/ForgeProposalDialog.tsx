"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { ForgeResult } from "@/lib/forge/contracts";
import type { TargetedContentProposal } from "./ForgeProposalContext";

type Proposal = Extract<ForgeResult, { proposal: unknown }>;
type DialogResult = ForgeResult | TargetedContentProposal;
export function ForgeProposalDialog({ result, busy, applying, error, onClose, onApply, onReject, onRegenerate, onAdjust }: { result: DialogResult | null; busy: boolean; applying: boolean; error: string | null; onClose(): void; onApply(): void; onReject(): void; onRegenerate(): void; onAdjust(instruction: string): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [instruction, setInstruction] = useState("");
  useEffect(() => { const node = dialog.current; if (!node) return; if (result && !node.open) node.showModal(); if (!result && node.open) node.close(); }, [result]);
  useEffect(() => {
    if (!result) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !dialog.current?.open) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); onClose();
    };
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, [result, onClose]);
  if (!result) return null;
  const targeted = result.kind === "targeted" ? result : null;
  const proposal: Proposal | null = "proposal" in result ? result : null;
  const content = proposal?.proposal.patch.content ?? proposal?.proposal.patch.description ?? proposal?.proposal.patch.objectives?.map((item) => `- ${item}`).join("\n");
  const applyAvailable = Boolean(proposal || targeted);
  return <dialog ref={dialog} className="forge-proposal-dialog" aria-labelledby="forge-proposal-title" onKeyDown={(event) => event.stopPropagation()} onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }} onClose={onClose}>
    <header><div><p className="eyebrow">{proposal || targeted ? "Proposition Forge" : "Réponse Forge"}</p><h2 id="forge-proposal-title">{proposal || targeted ? "Proposition structurée" : "Réponse complète"}</h2></div><button type="button" className="icon-button" aria-label={proposal || targeted ? "Fermer la proposition" : "Fermer la réponse"} onClick={onClose}><X size={18} /></button></header>
    <div className="forge-proposal-dialog__body">{busy && <p className="forge-pending" role="status" aria-live="polite" aria-busy="true">{applying ? "Application au brouillon…" : "Forge prépare la proposition…"}</p>}{error && <p className="form-error" role="alert">{error} La proposition précédente reste disponible.</p>}<p className="forge-proposal-summary">{result.text}</p>{targeted && <p className="caption">Cette proposition cible uniquement {targeted.operation.operation === "append" ? "la fin de la leçon" : "le passage sélectionné"}.</p>}{proposal?.proposal.patch.title && <p><strong>Titre proposé</strong><br />{proposal.proposal.patch.title}</p>}{proposal?.proposal.patch.subtitle && <p><strong>Résumé proposé</strong><br />{proposal.proposal.patch.subtitle}</p>}{content && <pre>{content}</pre>}{targeted && <pre>{targeted.operation.replacement}</pre>}{result.sourcesUsed.length > 0 && <p className="caption">Sources utilisées par Forge : {result.sourcesUsed.map((source) => source.title).join(", ")}</p>}{adjusting && <label className="forge-adjust">{proposal || targeted ? "Demander un ajustement" : "Demander une précision"}<textarea autoFocus value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={2000} placeholder={proposal || targeted ? "Ex. Rends cette proposition plus concise et adaptée à un public débutant…" : "Ex. Donne un exemple concret ou précise ce point…"} /></label>}</div>
    <footer>{proposal || targeted ? <><button type="button" className="button button--secondary" onClick={onReject} disabled={busy}>Rejeter</button><button type="button" className="button button--secondary" onClick={onRegenerate} disabled={busy}>{busy && !applying ? "Forge régénère…" : "Régénérer"}</button>{adjusting ? <button type="button" className="button button--secondary" onClick={() => onAdjust(instruction)} disabled={busy || !instruction.trim()}>Mettre à jour la proposition</button> : <button type="button" className="button button--secondary" onClick={() => setAdjusting(true)} disabled={busy}>Demander un ajustement</button>}{applyAvailable && <button type="button" className="button" onClick={onApply} disabled={busy}>{applying ? "Application…" : "Appliquer au brouillon"}</button>}</> : <>{adjusting ? <button type="button" className="button button--secondary" onClick={() => onAdjust(instruction)} disabled={busy || !instruction.trim()}>Envoyer la précision</button> : <button type="button" className="button button--secondary" onClick={() => setAdjusting(true)} disabled={busy}>Demander une précision</button>}<button type="button" className="button button--secondary" onClick={onRegenerate} disabled={busy}>Régénérer</button><button type="button" className="button" onClick={onClose}>Fermer</button></>}</footer>
  </dialog>;
}
