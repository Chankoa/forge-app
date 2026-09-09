"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { manualProposalFromIntent } from "@/lib/forge/authoring-contracts";
import { createCourseAction } from "@/app/app/create/actions";

export function CreateCourseForm({ domains }: { domains: Array<{ id: string; name: string }> }) {
  const [brief, setBrief] = useState(""); const [proposal, setProposal] = useState<ReturnType<typeof manualProposalFromIntent> | null>(null);
  if (domains.length === 0) return <p className="env-note">Aucun domaine disponible. Vérifiez la configuration Supabase avant de créer un parcours.</p>;
  return <form className="form authoring-form" action={createCourseAction}><label>Votre intention<textarea name="brief" value={brief} onChange={(event) => setBrief(event.target.value)} minLength={12} maxLength={360} placeholder="Je veux créer un parcours pour..." required /></label><label>Public visé <input name="audience" placeholder="Facultatif" /></label><label>Objectif <input name="objective" placeholder="Facultatif" /></label><Button type="button" variant="secondary" onClick={() => setProposal(brief.trim().length >= 12 ? manualProposalFromIntent({ brief }) : null)}>Préparer une preview locale</Button>{proposal && <section className="proposal-preview"><p className="eyebrow">PREVIEW LOCALE</p><h2>{proposal.title}</h2><p>{proposal.description}</p><p className="caption">Cette structure provient de votre intention, pas d&apos;une génération IA. Vous pouvez la modifier avant création.</p></section>}<label>Titre du parcours <input name="title" defaultValue={proposal?.title} required /></label><label>Description <textarea name="description" defaultValue={proposal?.description} required /></label><label>Domaine <select name="domainId" required defaultValue=""><option value="" disabled>Choisir un domaine</option>{domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}</select></label><label>Résumé <input name="subtitle" placeholder="Facultatif" /></label><Button type="submit">Créer ce parcours</Button><p className="caption">Forge AI non configuré localement. La création manuelle reste disponible.</p></form>;
}