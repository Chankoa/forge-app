"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Eye, PenLine, Plus, Trash2, X, Check } from "lucide-react";
import type { CourseDetail } from "@/lib/courses/contracts";
import { Button } from "@/components/ui/Button";
import { addLessonAction, addModuleAction, deleteEmptyModuleAction, moveLessonAction, moveModuleAction, renameLessonTitleAction, renameModuleAction } from "@/app/app/create/actions";
import { inlineRenameKey } from "@/lib/courses/structure-operations";

type Feedback = (message: string, error?: boolean) => void;

export function InlineRename({ title, label, onSave, onFeedback }: { title: string; label: string; onSave: (value: string) => Promise<void>; onFeedback: Feedback }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const inputId = useId();
  useEffect(() => { if (editing) input.current?.focus(); }, [editing]);
  function cancel() { setValue(title); setEditing(false); requestAnimationFrame(() => launcher.current?.focus()); }
  function submit() {
    if (!value.trim() || pending) return;
    if (value.trim() === title) { cancel(); return; }
    startTransition(async () => {
      try { await onSave(value.trim()); onFeedback(`${label} renommé${label === "Leçon" ? "e" : ""}.`); setEditing(false); requestAnimationFrame(() => launcher.current?.focus()); }
      catch { onFeedback(`Le renommage ${label === "Leçon" ? "de la leçon" : "du module"} a échoué.`, true); }
    });
  }
  return <div className="structure-inline-title">
    <button ref={launcher} type="button" className="structure-inline-title__launcher" aria-label={`Renommer ${label === "Leçon" ? "la leçon" : "le module"} ${title}`} onClick={() => { setValue(title); setEditing(true); }} hidden={editing}><strong>{title}</strong><PenLine size={15} aria-hidden="true" /></button>
    {editing && <form className="structure-inline-title__form" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <label className="sr-only" htmlFor={inputId}>Nouveau titre {label === "Leçon" ? "de la leçon" : "du module"}</label>
      <input ref={input} id={inputId} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (inlineRenameKey(event.key) === "cancel") { event.preventDefault(); event.stopPropagation(); cancel(); } }} disabled={pending} required />
      <button type="submit" className="icon-button" aria-label={`Valider le renommage de ${title}`} disabled={pending}><Check size={17} /></button>
      <button type="button" className="icon-button" aria-label={`Annuler le renommage de ${title}`} onClick={cancel} disabled={pending}><X size={17} /></button>
    </form>}
  </div>;
}

export function CourseStructureEditor({ course, onFeedback }: { course: CourseDetail; onFeedback: Feedback }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const act = (action: () => Promise<void>, success: string) => startTransition(async () => {
    try { await action(); onFeedback(success); }
    catch (error) { onFeedback(error instanceof Error ? error.message : "L’opération a échoué.", true); }
  });
  const toggle = (id: string) => setCollapsed((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return <section className="cockpit-program" aria-labelledby="cockpit-program-title">
    <div className="section-heading"><div><p className="eyebrow">Programme</p><h2 id="cockpit-program-title">Modules et leçons</h2></div><form action={(data) => act(() => addModuleAction(course.id, data), "Module ajouté.")}><input name="title" aria-label="Titre du nouveau module" placeholder="Nouveau module" required /><Button type="submit" variant="secondary" disabled={pending}><Plus size={16} /> Module</Button></form></div>
    {course.outline.map((module, moduleIndex) => {
      const isCollapsed = collapsed.has(module.id);
      return <section className="cockpit-module" id={`module-${module.id}`} key={module.id} aria-label={`Module ${moduleIndex + 1} : ${module.moduleTitle}`}>
        <div className="cockpit-module__header"><span className="cockpit-module__index">{String(moduleIndex + 1).padStart(2, "0")}</span><div className="cockpit-module__identity"><InlineRename title={module.moduleTitle} label="Module" onSave={(title) => { const data = new FormData(); data.set("title", title); return renameModuleAction(course.id, module.id, data); }} onFeedback={onFeedback} /><small>{module.lessons.length} leçon{module.lessons.length === 1 ? "" : "s"}</small></div><div className="cockpit-module__controls">
          <button type="button" className="icon-button" aria-label={`Monter le module ${module.moduleTitle}`} disabled={pending || moduleIndex === 0} onClick={() => act(() => moveModuleAction(course.id, module.id, "up"), "Module déplacé.")}><ArrowUp size={17} /></button>
          <button type="button" className="icon-button" aria-label={`Descendre le module ${module.moduleTitle}`} disabled={pending || moduleIndex === course.outline.length - 1} onClick={() => act(() => moveModuleAction(course.id, module.id, "down"), "Module déplacé.")}><ArrowDown size={17} /></button>
          {module.lessons.length === 0 ? <button type="button" className="icon-button structure-delete" aria-label={`Supprimer le module vide ${module.moduleTitle}`} disabled={pending} onClick={() => { if (window.confirm(`Supprimer le module vide « ${module.moduleTitle} » ? Cette action est définitive.`)) act(() => deleteEmptyModuleAction(course.id, module.id), "Module supprimé."); }}><Trash2 size={17} /></button> : null}
          <button type="button" className="icon-button cockpit-module__toggle" aria-label={`${isCollapsed ? "Développer" : "Réduire"} le module ${module.moduleTitle}`} aria-expanded={!isCollapsed} aria-controls={`module-content-${module.id}`} onClick={() => toggle(module.id)}><ChevronDown size={17} /></button>
        </div></div>
        {!isCollapsed && <div className="cockpit-module__body" id={`module-content-${module.id}`}>
          <ol className="cockpit-lessons">{module.lessons.map((lesson, lessonIndex) => <li key={lesson.id}><span className="cockpit-lesson__index">{moduleIndex + 1}.{lessonIndex + 1}</span><div className="cockpit-lesson__identity"><InlineRename title={lesson.title} label="Leçon" onSave={(title) => { const data = new FormData(); data.set("title", title); return renameLessonTitleAction(course.id, lesson.id, data); }} onFeedback={onFeedback} /><small>{lesson.durationMinutes ? `${lesson.durationMinutes} min · ` : ""}{lesson.publishingStatus === "published" ? "Publié" : "Brouillon"}</small></div><div className="cockpit-lesson__controls">
            <button type="button" className="icon-button" aria-label={`Monter la leçon ${lesson.title}`} disabled={pending || lessonIndex === 0} onClick={() => act(() => moveLessonAction(course.id, module.id, lesson.id, "up"), "Leçon déplacée.")}><ArrowUp size={16} /></button>
            <button type="button" className="icon-button" aria-label={`Descendre la leçon ${lesson.title}`} disabled={pending || lessonIndex === module.lessons.length - 1} onClick={() => act(() => moveLessonAction(course.id, module.id, lesson.id, "down"), "Leçon déplacée.")}><ArrowDown size={16} /></button>
            <Link className="icon-button" href={`/app/courses/${course.slug}/lessons/${lesson.slug}?mode=preview`} aria-label={`Prévisualiser ${lesson.title}`}><Eye size={16} /></Link>
            <Link className="icon-button" href={`/app/courses/${course.slug}/lessons/${lesson.slug}?mode=edit`} aria-label={`Modifier ${lesson.title}`}><PenLine size={16} /></Link>
          </div></li>)}</ol>
          <form className="inline-form cockpit-module__add" action={(data) => act(() => addLessonAction(course.id, module.id, data), "Leçon ajoutée.")}><input name="title" aria-label={`Titre d'une leçon dans ${module.moduleTitle}`} placeholder="Nouvelle leçon" required /><Button type="submit" variant="ghost" disabled={pending}><Plus size={16} /> Leçon</Button></form>
          {module.lessons.length > 0 && <p className="cockpit-module__delete-note">Déplacez d’abord les leçons de ce module pour pouvoir le supprimer.</p>}
        </div>}
      </section>;
    })}
    {course.outline.length === 0 && <p className="caption">Ajoutez un premier module pour construire le programme.</p>}
  </section>;
}
