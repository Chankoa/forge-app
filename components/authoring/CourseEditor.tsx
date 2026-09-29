"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ChevronDown, Eye, FileText, Layers3, PenLine, Plus, Save } from "lucide-react";
import type { CourseDetail } from "@/lib/courses/contracts";
import { Button } from "@/components/ui/Button";
import { addLessonAction, addModuleAction, renameModuleAction, saveCourseMetadataAction, saveLessonAction } from "@/app/app/create/actions";
import { ForgeSourceResources } from "@/components/forge/ForgeSourceResources";
import { useForgeProposal } from "@/components/forge/ForgeProposalContext";
import { OwnerCourseOverview } from "@/components/course/OwnerCourseOverview";
import type { PublicationReadiness } from "@/lib/courses/publication";

type CockpitTab = "overview" | "information" | "structure" | "sources";

export function CourseEditor({ course, domains, readiness, showOverview = false }: { course: CourseDetail; domains: Array<{ id: string; name: string }>; readiness: PublicationReadiness; showOverview?: boolean }) {
  const [message, setMessage] = useState("");
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
      setProposal(null);
    });
  }, [course.id, proposal, setProposal]);

  const run = (action: () => Promise<void>, success: string) => startTransition(async () => {
    try { await action(); setMessage(success); } catch (error) { setMessage(error instanceof Error ? error.message : "La sauvegarde a échoué."); }
  });
  const tabs: Array<{ id: CockpitTab; label: string }> = [{ id: "information", label: "Informations" }, { id: "structure", label: "Structure" }, { id: "sources", label: "Sources" }];

  if (tab === "overview") return <OwnerCourseOverview course={course} readiness={readiness} />;

  return <div className="editor-stack course-cockpit">
    <div className="cockpit-heading"><div><p className="eyebrow">Course Cockpit</p><h2>Piloter le parcours</h2><p className="caption">Les propositions Forge modifient le brouillon local ; seule la sauvegarde écrit les informations du parcours.</p></div><span className={`cockpit-status cockpit-status--${course.status === "published" ? "published" : "draft"}`}>{course.status === "published" ? "Publié" : "Brouillon"}</span></div>
    {message && <p className={message.includes("échoué") || message.includes("pouvez") ? "form-error" : "completion-state"} role="status">{message}</p>}
    <div className="editor-tabs" role="tablist" aria-label="Cockpit du parcours">{tabs.map((item) => <button id={`course-tab-${item.id}`} key={item.id} type="button" role="tab" aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
    {tab === "information" && <form className="form authoring-form cockpit-form" onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); run(() => saveCourseMetadataAction(course.id, formData), "Modifications enregistrées."); }}>
      <label>Titre<input name="title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} required /></label>
      <label>Résumé<input name="subtitle" value={draft.subtitle} onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))} /></label>
      <label className="cockpit-form__wide">Description<textarea name="description" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} required /></label>
      <label>Domaine<select name="domainId" value={draft.domainId} onChange={(event) => setDraft((current) => ({ ...current, domainId: event.target.value }))}><option value="">Aucun domaine</option>{domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}</select></label>
      <Button type="submit" disabled={pending}><Save size={17} /> {pending ? "Sauvegarde…" : "Sauvegarder les modifications"}</Button>
    </form>}
    {tab === "structure" && <section className="cockpit-program" aria-labelledby="cockpit-program-title">
      <div className="section-heading"><div><p className="eyebrow"><Layers3 size={15} /> Programme</p><h2 id="cockpit-program-title">Modules et leçons</h2></div><form action={(data) => run(() => addModuleAction(course.id, data), "Module ajouté.")}><input name="title" aria-label="Titre du nouveau module" placeholder="Nouveau module" required /><Button type="submit" variant="secondary"><Plus size={16} /> Module</Button></form></div>
      {course.outline.map((module, moduleIndex) => <details className="cockpit-module" id={`module-${module.id}`} key={module.id} open>
        <summary><span>{moduleIndex + 1}</span><div><strong>{module.moduleTitle}</strong><small>{module.lessons.length} leçon{module.lessons.length > 1 ? "s" : ""}</small></div><ChevronDown size={17} aria-hidden="true" /></summary>
        <div className="cockpit-module__body"><form className="inline-form" action={(data) => run(() => renameModuleAction(course.id, module.id, data), "Module renommé.")}><label>Nom du module<input name="title" defaultValue={module.moduleTitle} required /></label><Button type="submit" variant="ghost">Renommer</Button></form>
          <ol className="cockpit-lessons">{module.lessons.map((lesson, lessonIndex) => <li key={lesson.id}><span>{moduleIndex + 1}.{lessonIndex + 1}</span><div><strong>{lesson.title}</strong><small>{lesson.durationMinutes ? `${lesson.durationMinutes} min · ` : ""}{lesson.publishingStatus === "published" ? "Publié" : "Brouillon"}</small></div><form className="cockpit-lesson__rename" action={(data) => run(() => saveLessonAction(course.id, lesson.id, data), "Leçon renommée.")}><label className="sr-only" htmlFor={`lesson-title-${lesson.id}`}>Renommer {lesson.title}</label><input id={`lesson-title-${lesson.id}`} name="title" defaultValue={lesson.title} required /><Button type="submit" variant="ghost">Renommer</Button></form><Link className="icon-button" href={`/app/courses/${course.slug}/lessons/${lesson.slug}?mode=preview`} aria-label={`Prévisualiser ${lesson.title}`} title="Prévisualiser comme apprenant"><Eye size={16} /></Link><Link className="icon-button" href={`/app/courses/${course.slug}/lessons/${lesson.slug}?mode=edit`} aria-label={`Modifier ${lesson.title}`} title="Modifier la leçon"><PenLine size={16} /></Link></li>)}</ol>
          <form className="inline-form" action={(data) => run(() => addLessonAction(course.id, module.id, data), "Leçon ajoutée.")}><input name="title" aria-label={`Titre d'une leçon dans ${module.moduleTitle}`} placeholder="Nouvelle leçon" required /><Button type="submit" variant="ghost"><Plus size={16} /> Leçon</Button></form>
        </div>
      </details>)}
      {course.outline.length === 0 && <p className="caption">Ajoutez un premier module pour construire le programme.</p>}
    </section>}
    {tab === "sources" && <section className="cockpit-sources" aria-labelledby="cockpit-sources-title"><div className="section-heading"><div><p className="eyebrow"><FileText size={15} /> Sources</p><h2 id="cockpit-sources-title">Sources du parcours</h2></div></div><ForgeSourceResources courseSlug={course.slug} /></section>}
  </div>;
}
