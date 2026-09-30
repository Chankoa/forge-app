"use client";

import { useEffect, useState, useTransition } from "react";
import { FileText, Save } from "lucide-react";
import type { CourseDetail } from "@/lib/courses/contracts";
import { Button } from "@/components/ui/Button";
import { saveCourseMetadataAction } from "@/app/app/create/actions";
import { CourseStructureEditor } from "./CourseStructureEditor";
import { ForgeSourceResources } from "@/components/forge/ForgeSourceResources";
import { useForgeProposal } from "@/components/forge/ForgeProposalContext";
import { OwnerCourseOverview } from "@/components/course/OwnerCourseOverview";
import type { PublicationReadiness } from "@/lib/courses/publication";

type CockpitTab = "overview" | "information" | "structure" | "sources";

export function CourseEditor({ course, domains, readiness, showOverview = false }: { course: CourseDetail; domains: Array<{ id: string; name: string }>; readiness: PublicationReadiness; showOverview?: boolean }) {
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const [tab, setTab] = useState<CockpitTab>(showOverview ? "overview" : "information");
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({ title: course.title, subtitle: course.subtitle ?? "", description: course.description ?? "", domainId: course.domainId ?? "" });
  const { proposal, setProposal } = useForgeProposal();

  useEffect(() => {
    queueMicrotask(() => setTab(showOverview ? "overview" : window.location.hash.startsWith("#module-") || window.location.hash === "#cockpit-program-title" ? "structure" : "information"));
  }, [showOverview]);

  useEffect(() => {
    if (!proposal || proposal.proposal.target.courseId !== course.id || proposal.proposal.target.lessonId) return;
    const patch = proposal.proposal.patch;
    if (!patch.title && !patch.subtitle && !patch.description) return;
    queueMicrotask(() => {
      setDraft((current) => ({ ...current, ...(patch.title ? { title: patch.title } : {}), ...(patch.subtitle ? { subtitle: patch.subtitle } : {}), ...(patch.description ? { description: patch.description } : {}) }));
      setTab("information");
      setMessage("Proposition appliquée au brouillon. Sauvegardez pour conserver ces modifications.");
      setMessageError(false);
      setProposal(null);
    });
  }, [course.id, proposal, setProposal]);

  const run = (action: () => Promise<void>, success: string) => startTransition(async () => {
    try { await action(); setMessage(success); setMessageError(false); } catch (error) { setMessage(error instanceof Error ? error.message : "La sauvegarde a échoué."); setMessageError(true); }
  });
  const tabs: Array<{ id: CockpitTab; label: string }> = [{ id: "information", label: "Informations" }, { id: "structure", label: "Structure" }, { id: "sources", label: "Sources" }];

  if (tab === "overview") return <OwnerCourseOverview course={course} readiness={readiness} />;

  return <div className="editor-stack course-cockpit">
    <div className="cockpit-heading"><div><p className="eyebrow">Cockpit du parcours</p><h2>Piloter le parcours</h2><p className="caption">Structure, informations et sources du parcours. Les propositions Forge modifient le brouillon local ; seule la sauvegarde enregistre les informations.</p></div><span className={`cockpit-status cockpit-status--${course.status === "published" ? "published" : "draft"}`}>{course.status === "published" ? "Publié" : "Brouillon"}</span></div>
    {message && <p className={messageError ? "form-error" : "completion-state"} role="status">{message}</p>}
    <div className="editor-tabs" role="tablist" aria-label="Cockpit du parcours">{tabs.map((item) => <button id={`course-tab-${item.id}`} key={item.id} type="button" role="tab" aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
    {tab === "information" && <form className="form authoring-form cockpit-form" onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); run(() => saveCourseMetadataAction(course.id, formData), "Modifications enregistrées."); }}>
      <label>Titre du parcours<input name="title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} required /></label>
      <label>Résumé court<input name="subtitle" value={draft.subtitle} onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))} /></label>
      <label className="cockpit-form__wide">Description<textarea name="description" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} required /></label>
      <label>Domaine<select name="domainId" value={draft.domainId} onChange={(event) => setDraft((current) => ({ ...current, domainId: event.target.value }))}><option value="">Aucun domaine</option>{domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}</select></label>
      <Button type="submit" disabled={pending}><Save size={17} /> {pending ? "Sauvegarde…" : "Sauvegarder les modifications"}</Button>
    </form>}
    {tab === "structure" && <CourseStructureEditor course={course} onFeedback={(text, error = false) => { setMessage(text); setMessageError(error); }} />}
    {tab === "sources" && <section className="cockpit-sources" aria-labelledby="cockpit-sources-title"><div className="section-heading"><div><p className="eyebrow"><FileText size={15} /> Sources</p><h2 id="cockpit-sources-title">Sources du parcours</h2></div></div><ForgeSourceResources courseSlug={course.slug} /></section>}
  </div>;
}
