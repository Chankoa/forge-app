"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Layers3, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createCourseAction } from "@/app/app/create/actions";
import { generatePublicPreviewAction } from "@/app/actions/public-preview";
import { FormatSelector } from "@/components/forge/FormatSelector";
import { GeneratedPath } from "@/components/forge/GeneratedPath";
import { deserializePublicDraft, PUBLIC_DRAFT_KEY, transitionPublicDraft, type PublicCourseFormat, type PublicCoursePreview } from "@/lib/forge/public-contracts";
import { matchExistingDomain } from "@/lib/forge/domain-mapping";

export function CreateCourseForm({ domains }: { domains: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [intent, setIntent] = useState("");
  const [audience, setAudience] = useState("");
  const [objective, setObjective] = useState("");
  const [format, setFormat] = useState<PublicCourseFormat>();
  const [domain, setDomain] = useState("");
  const [proposal, setProposal] = useState<PublicCoursePreview>();
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busyAction, setBusyAction] = useState<"generate" | "update" | "create" | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = localStorage.getItem(PUBLIC_DRAFT_KEY);
      const draft = deserializePublicDraft(stored);
      if (!draft) { localStorage.removeItem(PUBLIC_DRAFT_KEY); return; }
      const restored = transitionPublicDraft(stored, "RESTORED_IN_CREATE");
      if (restored) localStorage.setItem(PUBLIC_DRAFT_KEY, restored);
      setIntent(draft.intent);
      setFormat(draft.format);
      const suggested = draft.preview?.suggestedDomainLabel ?? "";
      setDomain(domains.find((item) => item.id === matchExistingDomain(draft.domain ?? suggested, domains))?.name ?? "");
      setProposal(draft.preview);
    }, 0);
    return () => clearTimeout(timer);
  }, [domains]);

  const selectedDomainId = useMemo(() => matchExistingDomain(domain, domains), [domains, domain]);
  function generate() {
    const updating = Boolean(proposal);
    setError(""); setFeedback(""); setBusyAction(updating ? "update" : "generate");
    startTransition(async () => {
      try {
        const result = await generatePublicPreviewAction({ intent, audience: audience || undefined, objective: objective || undefined, format, domain: domain || undefined });
        if (!result.ok) { setError(result.error === "not_configured" ? "Forge IA est indisponible. Réessayez plus tard." : "La proposition n'a pas pu être générée. Réessayez."); return; }
        const changed = JSON.stringify(proposal) !== JSON.stringify(result.preview);
        setProposal(result.preview);
        setFormat(result.preview.format);
        setDomain(domains.find((item) => item.id === matchExistingDomain(result.preview.suggestedDomainLabel ?? "", domains))?.name ?? "");
        if (updating) setFeedback(changed ? "Proposition mise à jour." : "La proposition est déjà à jour.");
      } catch { setError("La proposition n'a pas pu être générée. Réessayez."); }
      finally { setBusyAction(null); }
    });
  }
  async function accept(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setFeedback("");
    const form = new FormData(event.currentTarget);
    setBusyAction("create");
    startTransition(async () => {
      try {
        const result = await createCourseAction(form);
        const consumed = transitionPublicDraft(localStorage.getItem(PUBLIC_DRAFT_KEY), "CONSUMED");
        if (consumed) localStorage.setItem(PUBLIC_DRAFT_KEY, consumed);
        localStorage.removeItem(PUBLIC_DRAFT_KEY);
        router.push(result.redirectTo);
      } catch (reason) { setError(reason instanceof Error ? reason.message : "Le parcours n'a pas pu être créé."); }
      finally { setBusyAction(null); }
    });
  }

  return <div className={`create-intent-flow${proposal ? " create-intent-flow--proposal" : ""}`}>
    <section className="create-intent-panel" id="create-intent" aria-labelledby="create-intent-heading">
      <div className="create-intent-panel__heading"><p className="eyebrow"><Sparkles size={15} aria-hidden="true" /> Étape 1 · Votre intention</p><h2 id="create-intent-heading">Quel parcours voulez-vous construire ?</h2><p>Précisez le sujet et le besoin des apprenants. Les paramètres ci-dessous affinent la proposition.</p></div>
      <label>Votre intention<textarea value={intent} onChange={(event) => setIntent(event.target.value)} minLength={12} maxLength={500} placeholder="Ex. Créer un parcours pour apprendre le design system en 2 semaines" /></label>
      <div className="create-guidance"><label>Public visé<input value={audience} onChange={(event) => setAudience(event.target.value)} maxLength={240} placeholder="Ex. Designers débutants" /></label><label>Objectif<input value={objective} onChange={(event) => setObjective(event.target.value)} maxLength={300} placeholder="Ex. Construire un premier système cohérent" /></label><label>Domaine<select value={domain} onChange={(event) => setDomain(event.target.value)}><option value="">Laisser Forge suggérer</option>{domains.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label></div>
      <FormatSelector value={format} onChange={setFormat} />
      <div className="create-intent-panel__footer"><p>Forge prépare une proposition. Aucun parcours n’est créé avant votre validation.</p><Button type="button" onClick={generate} disabled={Boolean(busyAction) || intent.trim().length < 12} aria-busy={busyAction === "generate" || busyAction === "update"}>{busyAction === "generate" || busyAction === "update" ? <LoaderCircle className="create-spinner" size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}{busyAction === "generate" ? "Forge prépare une proposition…" : busyAction === "update" ? "Forge met à jour la proposition…" : proposal ? "Mettre à jour la proposition" : "Générer le parcours"}</Button></div>
      {feedback && <p className="completion-state" role="status">{feedback}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    </section>
    {proposal ? <form className="create-proposal" onSubmit={accept}><input type="hidden" name="intent" value={intent} /><input type="hidden" name="domainId" value={selectedDomainId} /><input type="hidden" name="proposal" value={JSON.stringify(proposal)} /><GeneratedPath preview={proposal} domain={domain} onDomainChange={setDomain} domains={domains} onRegenerate={generate} onAccept={() => document.querySelector<HTMLButtonElement>("#accept-generated-course")?.click()} busy={Boolean(busyAction)} busyLabel={busyAction === "create" ? "Création du parcours…" : undefined} /><button id="accept-generated-course" className="sr-only" type="submit">Créer ce parcours</button></form>
      : <aside className="create-intent-aside" aria-label="Ce que Forge préparera"><Sparkles size={23} aria-hidden="true" /><h2>Une proposition à relire</h2><p>Forge prépare une base de parcours à partir de votre intention. Vous décidez ensuite de la créer.</p><div><Layers3 size={18} aria-hidden="true" /><span>Une structure de modules</span></div><div><BookOpen size={18} aria-hidden="true" /><span>Des objectifs qui deviendront les leçons lors de la création</span></div></aside>}
  </div>;
}
