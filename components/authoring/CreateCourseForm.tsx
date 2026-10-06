"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Layers3, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createCourseAction } from "@/app/app/create/actions";
import { generatePublicPreviewAction } from "@/app/actions/public-preview";
import { FormatSelector } from "@/components/forge/FormatSelector";
import { GeneratedPath } from "@/components/forge/GeneratedPath";
import { deserializePublicDraft, PUBLIC_DRAFT_KEY, transitionPublicDraft, type PublicCourseFormat, type PublicCoursePreview } from "@/lib/forge/public-contracts";
import { SubjectDiscovery } from "@/components/forge/SubjectDiscovery";
import { canCreateCourseFromProposal, canGenerateCourseProposal, canStartCourseCreation, selectedCreationDomain, type CreationProposalState } from "@/lib/forge/creation-flow";

export function CreateCourseForm({ domains }: { domains: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [intent, setIntent] = useState("");
  const [audience, setAudience] = useState("");
  const [objective, setObjective] = useState("");
  const [format, setFormat] = useState<PublicCourseFormat>();
  const [domainId, setDomainId] = useState("");
  const [proposal, setProposal] = useState<PublicCoursePreview>();
  const [proposalState, setProposalState] = useState<CreationProposalState>("generated");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busyAction, setBusyAction] = useState<"generate" | "update" | "create" | null>(null);
  const [, startTransition] = useTransition();
  const creating = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = localStorage.getItem(PUBLIC_DRAFT_KEY);
      const draft = deserializePublicDraft(stored);
      if (!draft) { localStorage.removeItem(PUBLIC_DRAFT_KEY); return; }
      const restored = transitionPublicDraft(stored, "RESTORED_IN_CREATE");
      if (restored) localStorage.setItem(PUBLIC_DRAFT_KEY, restored);
      setIntent(draft.intent);
      setFormat(draft.format);
      setProposal(draft.preview);
    }, 0);
    return () => clearTimeout(timer);
  }, [domains]);

  const selectedDomain = selectedCreationDomain(domains, domainId);
  function generate(regenerating = false) {
    if (!canGenerateCourseProposal(intent, domains, domainId)) { setError("Décrivez votre intention et choisissez un domaine avant de générer une proposition."); return; }
    const updating = Boolean(proposal);
    setError(""); setFeedback(""); setBusyAction(updating ? "update" : "generate");
    startTransition(async () => {
      try {
        const result = await generatePublicPreviewAction({ intent, audience: audience || undefined, objective: objective || undefined, format, domain: selectedDomain?.name });
        if (!result.ok) { setError(result.error === "not_configured" ? "Forge IA est indisponible. Réessayez plus tard." : "La proposition n'a pas pu être générée. Réessayez."); return; }
        const changed = JSON.stringify(proposal) !== JSON.stringify(result.preview);
        setProposal(result.preview);
        setFormat(result.preview.format);
        setProposalState("generated");
        if (updating) setFeedback(changed ? regenerating ? "Proposition générée à nouveau · À examiner." : "Proposition générée · À examiner." : "La proposition est déjà à jour.");
      } catch { setError("La proposition n'a pas pu être générée. Réessayez."); }
      finally { setBusyAction(null); }
    });
  }
  async function accept(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!canStartCourseCreation(creating.current, proposal, domains, domainId)) { setError("Choisissez un domaine valide avant de créer le parcours."); return; } creating.current = true; setError(""); setFeedback("");
    const form = new FormData(event.currentTarget);
    setBusyAction("create");
    startTransition(async () => {
      let created = false;
      try {
        const result = await createCourseAction(form);
        const consumed = transitionPublicDraft(localStorage.getItem(PUBLIC_DRAFT_KEY), "CONSUMED");
        if (consumed) localStorage.setItem(PUBLIC_DRAFT_KEY, consumed);
        localStorage.removeItem(PUBLIC_DRAFT_KEY);
        created = true; setProposalState("confirmed"); setFeedback("Création confirmée"); router.push(result.redirectTo);
      } catch (reason) { setError(reason instanceof Error ? reason.message : "Le parcours n'a pas pu être créé."); }
      finally { if (!created) { creating.current = false; setBusyAction(null); } }
    });
  }

  return <div className={`create-intent-flow${proposal ? " create-intent-flow--proposal" : ""}`}>
    <section className="create-intent-panel" id="create-intent" aria-labelledby="create-intent-heading">
      <div className="create-intent-panel__heading"><p className="eyebrow"><Sparkles size={15} aria-hidden="true" /> Étape 1 · Décrire l’intention</p><h2 id="create-intent-heading">Qu’allez-vous construire aujourd’hui ?</h2><p>Décrivez le sujet et le besoin des apprenants, puis choisissez le domaine du parcours.</p></div>
      <label>Votre intention<textarea value={intent} onChange={(event) => setIntent(event.target.value)} minLength={12} maxLength={500} placeholder="Ex. Créer une initiation aux fondamentaux de l’intelligence artificielle pour adultes débutants, en 6 modules." /></label>
      <div className="create-guidance"><label>Public visé <span className="caption">Optionnel</span><input value={audience} onChange={(event) => setAudience(event.target.value)} maxLength={240} placeholder="Ex. Adultes débutants" /></label><label>Objectif <span className="caption">Optionnel</span><input value={objective} onChange={(event) => setObjective(event.target.value)} maxLength={300} placeholder="Ex. Comprendre les notions essentielles" /></label><label>Étape 2 · Domaine<select value={domainId} onChange={(event) => setDomainId(event.target.value)} required><option value="">Sélectionnez un domaine</option>{domains.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      <FormatSelector value={format} onChange={setFormat} />
      <SubjectDiscovery request={{ intent, audience: audience || undefined, objective: objective || undefined, format, domain: selectedDomain?.name }} />
      <div className="create-intent-panel__footer"><p>Étape 3 · Forge prépare une proposition. Aucun parcours n’est créé avant votre validation.</p><Button type="button" onClick={() => generate()} disabled={Boolean(busyAction) || !canGenerateCourseProposal(intent, domains, domainId)} aria-busy={busyAction === "generate" || busyAction === "update"}>{busyAction === "generate" || busyAction === "update" ? <LoaderCircle className="create-spinner" size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}{busyAction === "generate" || busyAction === "update" ? "Forge prépare une proposition…" : "Générer une proposition"}</Button></div>
      {feedback && <p className="completion-state" role="status">{feedback}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    </section>
    {proposal ? <form className="create-proposal" onSubmit={accept}><input type="hidden" name="intent" value={intent} /><input type="hidden" name="domainId" value={domainId} /><input type="hidden" name="proposal" value={JSON.stringify(proposal)} /><GeneratedPath preview={proposal} domain={selectedDomain?.name ?? ""} domainId={domainId} onDomainChange={setDomainId} onAdjust={(patch) => { setProposal((current) => current ? { ...current, ...patch } : current); setProposalState("adjusted"); setFeedback("Proposition ajustée · À examiner."); }} domains={domains} onRegenerate={() => { if (proposalState !== "adjusted" || window.confirm("Regénérer la proposition remplacera vos ajustements locaux. Continuer ?")) generate(true); }} onAccept={() => document.querySelector<HTMLButtonElement>("#accept-generated-course")?.click()} busy={Boolean(busyAction)} busyLabel={busyAction === "create" ? "Création confirmée…" : undefined} canAccept={canCreateCourseFromProposal(proposal, domains, domainId)} proposalState={proposalState} /><button id="accept-generated-course" className="sr-only" type="submit" disabled={Boolean(busyAction)}>Créer le parcours</button></form>
      : <aside className="create-intent-aside" aria-label="Ce que Forge préparera"><Sparkles size={23} aria-hidden="true" /><h2>Une proposition à relire</h2><p>Forge prépare une base de parcours à partir de votre intention. Vous décidez ensuite de la créer.</p><div><Layers3 size={18} aria-hidden="true" /><span>Une structure de modules</span></div><div><BookOpen size={18} aria-hidden="true" /><span>Des objectifs qui deviendront les leçons lors de la création</span></div></aside>}
  </div>;
}
