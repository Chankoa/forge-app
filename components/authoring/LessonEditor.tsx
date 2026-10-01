"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import type { CourseLesson } from "@/lib/courses/contracts";
import { createLessonDraft, lessonDraftFormData } from "@/lib/courses/lesson-draft";
import { Button } from "@/components/ui/Button";
import { ForgeSourceResources } from "@/components/forge/ForgeSourceResources";
import { useForgeProposal } from "@/components/forge/ForgeProposalContext";
import { saveLessonAction } from "@/app/app/create/actions";
import { adjacentTab } from "@/lib/courses/workspace-layout";

type LessonTab = "info" | "content" | "resources";

export function LessonEditor({ courseId, courseSlug, lesson, moduleTitle, moduleNumber, lessonNumber, canManageSources }: { courseId: string; courseSlug: string; lesson: CourseLesson; moduleTitle: string; moduleNumber: number; lessonNumber: number; canManageSources: boolean }) {
  return <LessonEditorDraft key={lesson.id} courseId={courseId} courseSlug={courseSlug} lesson={lesson} moduleTitle={moduleTitle} moduleNumber={moduleNumber} lessonNumber={lessonNumber} canManageSources={canManageSources} />;
}

function LessonEditorDraft({ courseId, courseSlug, lesson, moduleTitle, moduleNumber, lessonNumber, canManageSources }: { courseId: string; courseSlug: string; lesson: CourseLesson; moduleTitle: string; moduleNumber: number; lessonNumber: number; canManageSources: boolean }) {
  const [message, setMessage] = useState(""); const [tab, setTab] = useState<LessonTab>("content"); const [draft, setDraft] = useState(createLessonDraft(lesson)); const [pending, startTransition] = useTransition(); const { proposal, setProposal, registerLessonDraft, setLessonSelection } = useForgeProposal(); const contentRef = useRef(draft.content);
  useEffect(() => { contentRef.current = draft.content; }, [draft.content]);
  useEffect(() => registerLessonDraft({ lessonId: lesson.id, getContent: () => contentRef.current, applyContent: (content) => { contentRef.current = content; setDraft((current) => ({ ...current, content })); } }), [lesson.id, registerLessonDraft]);
  useEffect(() => { if (!proposal || proposal.kind === "targeted" || proposal.proposal.target.lessonId !== lesson.id) return; queueMicrotask(() => { const patch = proposal.proposal.patch; setDraft((current) => ({ ...current, ...(patch.title ? { title: patch.title } : {}), ...(patch.description ? { description: patch.description } : {}), ...(patch.content ? { content: patch.content } : {}), ...(patch.objectives ? { objectives: patch.objectives.join("\n") } : {}) })); if (patch.content) setTab("content"); else setTab("info"); setMessage("Proposition Forge appliquée au brouillon. Sauvegardez pour la rendre persistante."); setProposal(null); }); }, [lesson.id, proposal, setProposal]);
  const updateDraft = <Key extends keyof typeof draft>(key: Key, value: typeof draft[Key]) => setDraft((current) => ({ ...current, [key]: value }));
  const save = () => startTransition(async () => { try { await saveLessonAction(courseId, lesson.id, lessonDraftFormData(draft)); setMessage("Leçon sauvegardée."); } catch (error) { setMessage(error instanceof Error ? error.message : "La sauvegarde a échoué."); } });
  const tabs: LessonTab[] = canManageSources ? ["info", "content", "resources"] : ["info", "content"];
  const labels = { info: "Informations", content: "Contenu", resources: "Ressources" };
  const moveTab = (index: number, key: string) => { const next = adjacentTab(index, key, tabs.length); if (next === index) return; setTab(tabs[next]); requestAnimationFrame(() => document.getElementById(`lesson-tab-${tabs[next]}`)?.focus()); };
  const focusObjectives = () => { setTab("info"); requestAnimationFrame(() => document.getElementById("lesson-objectives-editor")?.focus()); };
  const objectives = draft.objectives.split("\n").map((item) => item.trim()).filter(Boolean);
  const captureSelection = (textarea: HTMLTextAreaElement) => { const { selectionStart, selectionEnd, value } = textarea; const text = value.slice(selectionStart, selectionEnd); setLessonSelection(lesson.id, text.trim() ? { text, start: selectionStart, end: selectionEnd } : null); };
  return <><form className="form authoring-form lesson-editor" action={save}>
    <header className="lesson-page-header lesson-editor__header"><p className="eyebrow">Module {moduleNumber} · {moduleTitle}</p><p className="lesson-page-header__position">Leçon {moduleNumber}.{lessonNumber} · Édition</p><h2>{draft.title}</h2><div className="lesson-editor__actions"><span className="lesson-editor__status">{draft.publishingStatus === "published" ? "Publié" : draft.publishingStatus === "locked" ? "Verrouillé" : "Brouillon"}</span><Link className="button button--secondary" href={`/app/courses/${courseSlug}/lessons/${lesson.slug}?mode=preview`}>Aperçu</Link><Button type="submit" disabled={pending}><Save size={17} aria-hidden="true" /> {pending ? "Sauvegarde..." : "Sauvegarder"}</Button></div>{message && <p className={message.includes("échoué") ? "form-error" : "completion-state"} role="status">{message}</p>}</header>
    <div className="editor-tabs" role="tablist" aria-label="Édition de la leçon">{tabs.map((item, index) => <button id={`lesson-tab-${item}`} key={item} type="button" role="tab" aria-selected={tab === item} tabIndex={tab === item ? 0 : -1} onKeyDown={(event) => moveTab(index, event.key)} onClick={() => setTab(item)}>{labels[item]}</button>)}</div>
    {tab === "info" && <><label>Titre<input name="title" value={draft.title} required onChange={(event) => updateDraft("title", event.target.value)} /></label><label>Résumé<textarea name="description" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} /></label><label>Type<select name="type" value={draft.type} onChange={(event) => updateDraft("type", event.target.value)}><option value="reading">Lecture</option><option value="video">Vidéo</option><option value="exercise">Exercice</option></select></label><label>Durée (minutes)<input name="durationMinutes" type="number" min="0" value={draft.durationMinutes} onChange={(event) => updateDraft("durationMinutes", event.target.value)} /></label><label>Statut<select name="publishingStatus" value={draft.publishingStatus} onChange={(event) => updateDraft("publishingStatus", event.target.value)}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="locked">Verrouillé</option></select></label><label>Objectifs, une ligne par objectif<textarea id="lesson-objectives-editor" name="objectives" value={draft.objectives} onChange={(event) => updateDraft("objectives", event.target.value)} /></label></>}
    {tab === "content" && <><section className="lesson-editor__objectives" aria-labelledby="lesson-editor-objectives-title"><div><h3 id="lesson-editor-objectives-title">Objectif pédagogique</h3>{objectives.length ? <ul>{objectives.map((objective, index) => <li key={`${index}:${objective}`}>{objective}</li>)}</ul> : <p className="caption">Aucun objectif renseigné.</p>}</div><button type="button" onClick={focusObjectives}>Modifier</button></section><label>{draft.type === "exercise" ? "Activité d’apprentissage · contenu Markdown" : "Contenu Markdown"}<textarea className="content-editor" name="content" value={draft.content} onChange={(event) => { contentRef.current = event.target.value; updateDraft("content", event.target.value); setLessonSelection(lesson.id, null); }} onSelect={(event) => captureSelection(event.currentTarget)} onMouseUp={(event) => captureSelection(event.currentTarget)} onKeyUp={(event) => captureSelection(event.currentTarget)} /></label></>}
  </form>{tab === "resources" && canManageSources && <ForgeSourceResources courseSlug={courseSlug} />}</>;
}
