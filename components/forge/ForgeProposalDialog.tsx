"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { ForgeResult } from "@/lib/forge/contracts";

type Proposal = Extract<ForgeResult, { proposal: unknown }>;
export function ForgeProposalDialog({ proposal, busy, onClose, onApply, onReject, onRegenerate, onAdjust }: { proposal: Proposal | null; busy: boolean; onClose(): void; onApply(): void; onReject(): void; onRegenerate(): void; onAdjust(instruction: string): void }) {
  const dialog = useRef<HTMLDialogElement>(null); const [adjusting, setAdjusting] = useState(false); const [instruction, setInstruction] = useState("");
  useEffect(() => { const node = dialog.current; if (!node) return; if (proposal && !node.open) node.showModal(); if (!proposal && node.open) node.close(); }, [proposal]);
  if (!proposal) return null;
  const content = proposal.proposal.suggestedContent ?? proposal.proposal.objectives?.map((item) => `- ${item}`).join("\n") ?? proposal.text;
  const applyAvailable = proposal.proposal.field !== "outline";
  return <dialog ref={dialog} className="forge-proposal-dialog" aria-labelledby="forge-proposal-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={onClose}>
    <header><div><p className="eyebrow">Proposition Forge</p><h2 id="forge-proposal-title">{proposal.proposal.field === "objectives" ? "Objectifs proposés" : proposal.proposal.field === "description" ? "Résumé proposé" : "Proposition de contenu"}</h2></div><button type="button" className="icon-button" aria-label="Fermer la proposition" onClick={onClose}><X size={18} /></button></header>
    <div className="forge-proposal-dialog__body"><p className="forge-proposal-summary">{proposal.text}</p><pre>{content}</pre>{proposal.sourcesUsed.length > 0 && <p className="caption">Sources fournies à Forge : {proposal.sourcesUsed.map((source) => source.title).join(", ")}</p>}{adjusting && <label className="forge-adjust">Demander un ajustement<textarea autoFocus value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={2000} placeholder="Ex. Rends cette proposition plus concise et adaptée à un public débutant…" /></label>}</div>
    <footer><button type="button" className="button button--secondary" onClick={onReject} disabled={busy}>Rejeter</button><button type="button" className="button button--secondary" onClick={onRegenerate} disabled={busy}>{busy ? "Forge régénère…" : "Régénérer"}</button>{adjusting ? <button type="button" className="button button--secondary" onClick={() => onAdjust(instruction)} disabled={busy || !instruction.trim()}>Mettre à jour la proposition</button> : <button type="button" className="button button--secondary" onClick={() => setAdjusting(true)} disabled={busy}>Demander un ajustement</button>}{applyAvailable && <button type="button" className="button" onClick={onApply} disabled={busy}>Appliquer</button>}</footer>
  </dialog>;
}
