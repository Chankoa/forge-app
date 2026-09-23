"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { ForgeResult } from "@/lib/forge/contracts";

type Proposal = Extract<ForgeResult, { proposal: unknown }>;
export function ForgeProposalDialog({ result, busy, onClose, onApply, onReject, onRegenerate, onAdjust }: { result: ForgeResult | null; busy: boolean; onClose(): void; onApply(): void; onReject(): void; onRegenerate(): void; onAdjust(instruction: string): void }) {
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
  const proposal: Proposal | null = "proposal" in result ? result : null;
  const content = proposal?.proposal.suggestedContent ?? proposal?.proposal.objectives?.map((item) => `- ${item}`).join("\n");
  const applyAvailable = proposal && proposal.proposal.field !== "outline";
  return <dialog ref={dialog} className="forge-proposal-dialog" aria-labelledby="forge-proposal-title" onKeyDown={(event) => event.stopPropagation()} onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }} onClose={onClose}>
    <header><div><p className="eyebrow">{proposal ? "Proposition Forge" : "Réponse Forge"}</p><h2 id="forge-proposal-title">{proposal ? proposal.proposal.field === "objectives" ? "Objectifs proposés" : proposal.proposal.field === "description" ? "Résumé proposé" : "Proposition de contenu" : "Réponse complète"}</h2></div><button type="button" className="icon-button" aria-label={proposal ? "Fermer la proposition" : "Fermer la réponse"} onClick={onClose}><X size={18} /></button></header>
    <div className="forge-proposal-dialog__body"><p className="forge-proposal-summary">{result.text}</p>{content && <pre>{content}</pre>}{result.sourcesUsed.length > 0 && <p className="caption">Sources utilisées par Forge : {result.sourcesUsed.map((source) => source.title).join(", ")}</p>}{adjusting && proposal && <label className="forge-adjust">Demander un ajustement<textarea autoFocus value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={2000} placeholder="Ex. Rends cette proposition plus concise et adaptée à un public débutant…" /></label>}</div>
    <footer>{proposal ? <><button type="button" className="button button--secondary" onClick={onReject} disabled={busy}>Rejeter</button><button type="button" className="button button--secondary" onClick={onRegenerate} disabled={busy}>{busy ? "Forge régénère…" : "Régénérer"}</button>{adjusting ? <button type="button" className="button button--secondary" onClick={() => onAdjust(instruction)} disabled={busy || !instruction.trim()}>Mettre à jour la proposition</button> : <button type="button" className="button button--secondary" onClick={() => setAdjusting(true)} disabled={busy}>Demander un ajustement</button>}{applyAvailable && <button type="button" className="button" onClick={onApply} disabled={busy}>Appliquer</button>}</> : <button type="button" className="button" onClick={onClose}>Fermer</button>}</footer>
  </dialog>;
}
