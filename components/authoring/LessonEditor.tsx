"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import type { CourseLesson } from "@/lib/courses/contracts";
import { createLessonDraft, lessonDraftFormData } from "@/lib/courses/lesson-draft";
import { Button } from "@/components/ui/Button";
import { ForgeSourceResources } from "@/components/forge/ForgeSourceResources";
import { useForgeProposal } from "@/components/forge/ForgeProposalContext";
import { saveLessonAction, uploadCourseMediaAction } from "@/app/app/create/actions";
import { adjacentTab } from "@/lib/courses/workspace-layout";
import { LessonEmptyContent } from "./LessonEmptyContent";
import { forgeProposalStates } from "@/lib/forge/authoring-ux";
import { LessonMarkdown } from "@/components/learning/LessonContent";
import { hasUnclosedCodeFence, insertLessonMarkdown, insertMediaResource, type LessonInsertAction } from "@/lib/courses/lesson-markdown";

type LessonTab = "info" | "content" | "resources";
type ContentView = "write" | "preview" | "source";
const editingActions: Array<{ action: LessonInsertAction; label: string }> = [
  { action: "paragraph", label: "Paragraphe" }, { action: "heading2", label: "Titre H2" }, { action: "heading3", label: "Sous-titre H3" },
  { action: "bullets", label: "Liste à puces" }, { action: "numbers", label: "Liste numérotée" }, { action: "callout", label: "À retenir" },
  { action: "quote", label: "Citation" }, { action: "code", label: "Bloc de code" }, { action: "divider", label: "Séparateur" }, { action: "link", label: "Lien" },
];
const richInsertActions: Array<{ action: LessonInsertAction; label: string }> = [
  { action: "image", label: "Image" }, { action: "audio", label: "Audio" }, { action: "video", label: "Vidéo" },
  { action: "tab", label: "Tablature" }, { action: "practice", label: "Exercice" },
];

export function LessonEditor({ courseId, courseSlug, lesson, moduleTitle, moduleNumber, lessonNumber, canManageSources, canUploadMedia }: { courseId: string; courseSlug: string; lesson: CourseLesson; moduleTitle: string; moduleNumber: number; lessonNumber: number; canManageSources: boolean; canUploadMedia: boolean }) {
  return <LessonEditorDraft key={lesson.id} courseId={courseId} courseSlug={courseSlug} lesson={lesson} moduleTitle={moduleTitle} moduleNumber={moduleNumber} lessonNumber={lessonNumber} canManageSources={canManageSources} canUploadMedia={canUploadMedia} />;
}

function LessonEditorDraft({ courseId, courseSlug, lesson, moduleTitle, moduleNumber, lessonNumber, canManageSources, canUploadMedia }: { courseId: string; courseSlug: string; lesson: CourseLesson; moduleTitle: string; moduleNumber: number; lessonNumber: number; canManageSources: boolean; canUploadMedia: boolean }) {
  const [message, setMessage] = useState(""); const [tab, setTab] = useState<LessonTab>("content"); const [contentView, setContentView] = useState<ContentView>("write"); const [draft, setDraft] = useState(createLessonDraft(lesson)); const [savedDraft, setSavedDraft] = useState(createLessonDraft(lesson)); const [pending, startTransition] = useTransition(); const { proposal, setProposal, registerLessonDraft, setLessonSelection } = useForgeProposal(); const contentRef = useRef(draft.content); const editorRef = useRef<HTMLTextAreaElement>(null); const focusObjectivesFromAnalysis = useRef(false);
  const queryInsertionDone = useRef(false);
  useEffect(() => { contentRef.current = draft.content; }, [draft.content]);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("focus") !== "objectives") return; focusObjectivesFromAnalysis.current = true; queueMicrotask(() => setTab("info")); }, []);
  useEffect(() => { if (tab !== "info" || !focusObjectivesFromAnalysis.current) return; focusObjectivesFromAnalysis.current = false; document.getElementById("lesson-objectives-editor")?.focus(); }, [tab]);
  useEffect(() => registerLessonDraft({ lessonId: lesson.id, getContent: () => contentRef.current, applyContent: (content) => { contentRef.current = content; setDraft((current) => ({ ...current, content })); } }), [lesson.id, registerLessonDraft]);
  useEffect(() => { if (!proposal || proposal.kind === "targeted" || proposal.proposal.target.lessonId !== lesson.id) return; queueMicrotask(() => { const patch = proposal.proposal.patch; setDraft((current) => ({ ...current, ...(patch.title ? { title: patch.title } : {}), ...(patch.description ? { description: patch.description } : {}), ...(patch.content ? { content: patch.content } : {}), ...(patch.objectives ? { objectives: patch.objectives.join("\n") } : {}) })); if (patch.content) setTab("content"); else setTab("info"); setMessage(`${forgeProposalStates.applied}. Sauvegardez pour enregistrer.`); setProposal(null); }); }, [lesson.id, proposal, setProposal]);
  const updateDraft = useCallback((key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value })), []);
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const save = () => startTransition(async () => { const submitted = draft; try { await saveLessonAction(courseId, lesson.id, lessonDraftFormData(submitted)); setSavedDraft(submitted); setMessage(forgeProposalStates.saved); } catch (error) { setMessage(error instanceof Error ? error.message : "La sauvegarde a échoué."); } });
  const tabs: LessonTab[] = canManageSources ? ["info", "content", "resources"] : ["info", "content"];
  const labels = { info: "Informations", content: "Contenu", resources: "Ressources" };
  const moveTab = (index: number, key: string) => { const next = adjacentTab(index, key, tabs.length); if (next === index) return; setTab(tabs[next]); requestAnimationFrame(() => document.getElementById(`lesson-tab-${tabs[next]}`)?.focus()); };
  const focusObjectives = () => { setTab("info"); requestAnimationFrame(() => document.getElementById("lesson-objectives-editor")?.focus()); };
  const objectives = draft.objectives.split("\n").map((item) => item.trim()).filter(Boolean);
  const captureSelection = useCallback((textarea: HTMLTextAreaElement) => { const { selectionStart, selectionEnd, value } = textarea; const text = value.slice(selectionStart, selectionEnd); setLessonSelection(lesson.id, text.trim() ? { text, start: selectionStart, end: selectionEnd } : null); }, [lesson.id, setLessonSelection]);
  const insert = useCallback((action: LessonInsertAction) => { const editor = editorRef.current; if (!editor) return; const next = insertLessonMarkdown(contentRef.current, editor.selectionStart, editor.selectionEnd, action); contentRef.current = next.content; updateDraft("content", next.content); setMessage(""); requestAnimationFrame(() => { editor.focus(); editor.setSelectionRange(next.selectionStart, next.selectionEnd); captureSelection(editor); }); }, [captureSelection, updateDraft]);
  const insertUploadedResource = useCallback((kind: "image" | "audio", resourceId: string, text: string, caption: string) => { const editor = editorRef.current; if (!editor) return; const next = insertMediaResource(contentRef.current, editor.selectionStart, editor.selectionEnd, kind, resourceId, text, caption); contentRef.current = next.content; updateDraft("content", next.content); setMessage("Média inséré dans le brouillon. Sauvegardez pour l’enregistrer."); requestAnimationFrame(() => { editor.focus(); editor.setSelectionRange(next.selectionStart, next.selectionEnd); }); }, [updateDraft]);
  useEffect(() => {
    if (queryInsertionDone.current) return;
    const action = new URLSearchParams(window.location.search).get("insert");
    if (!action || !["image", "audio", "video", "tab", "practice"].includes(action) || !editorRef.current) return;
    queryInsertionDone.current = true;
    queueMicrotask(() => insert(action as LessonInsertAction));
  }, [insert]);
  return <><form className="form authoring-form lesson-editor" action={save}>
    <header className="lesson-page-header lesson-editor__header"><p className="eyebrow">Module {moduleNumber} · {moduleTitle}</p><p className="lesson-page-header__position">Leçon {moduleNumber}.{lessonNumber} · Édition</p><h2>{draft.title}</h2><div className="lesson-editor__actions"><span className="lesson-editor__status">{draft.publishingStatus === "published" ? "Publié" : draft.publishingStatus === "locked" ? "Verrouillé" : "Brouillon"} · {dirty ? "Modifications non sauvegardées" : "Sauvegardée"}</span><Link className="button button--secondary" href={`/app/courses/${courseSlug}/lessons/${lesson.slug}?mode=preview`}>Aperçu apprenant</Link><Button type="submit" disabled={pending || !dirty}><Save size={17} aria-hidden="true" /> {pending ? "Sauvegarde..." : "Sauvegarder"}</Button></div>{message && <p className={message.includes("échoué") ? "form-error" : "completion-state"} role="status">{message}</p>}</header>
    <div className="editor-tabs" role="tablist" aria-label="Édition de la leçon">{tabs.map((item, index) => <button id={`lesson-tab-${item}`} key={item} type="button" role="tab" aria-selected={tab === item} tabIndex={tab === item ? 0 : -1} onKeyDown={(event) => moveTab(index, event.key)} onClick={() => setTab(item)}>{labels[item]}</button>)}</div>
    {tab === "info" && <><label>Titre<input name="title" value={draft.title} required onChange={(event) => updateDraft("title", event.target.value)} /></label><label>Résumé<textarea name="description" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} /></label><label>Type<select name="type" value={draft.type} onChange={(event) => updateDraft("type", event.target.value)}><option value="reading">Lecture</option><option value="video">Vidéo</option><option value="exercise">Exercice</option></select></label><label>Durée (minutes)<input name="durationMinutes" type="number" min="0" value={draft.durationMinutes} onChange={(event) => updateDraft("durationMinutes", event.target.value)} /></label><label>Statut<select name="publishingStatus" value={draft.publishingStatus} onChange={(event) => updateDraft("publishingStatus", event.target.value)}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="locked">Verrouillé</option></select></label><label>Objectifs, une ligne par objectif<textarea id="lesson-objectives-editor" name="objectives" value={draft.objectives} onChange={(event) => updateDraft("objectives", event.target.value)} /></label></>}
    {tab === "content" && <><section className="lesson-editor__objectives" aria-labelledby="lesson-editor-objectives-title"><div><h3 id="lesson-editor-objectives-title">Objectifs pédagogiques</h3><p className="caption">Ce que l’apprenant saura faire. Le contenu ci-dessous est la matière enseignée.</p>{objectives.length ? <ul>{objectives.map((objective, index) => <li key={`${index}:${objective}`}>{objective}</li>)}</ul> : <p className="caption">Aucun objectif renseigné.</p>}</div><button type="button" onClick={focusObjectives}>Modifier</button></section>{canUploadMedia && <MediaUpload courseId={courseId} onUploaded={insertUploadedResource} />}{!draft.content.trim() && <LessonEmptyContent />}<section className="lesson-editor__composition" aria-label="Rédaction du contenu"><div className="lesson-editor__composition-header"><div><h3>Contenu de la leçon</h3><p className="caption">Sélectionnez du texte puis choisissez sa forme, ou insérez un élément au curseur.</p></div><div className="lesson-editor__view-switch" role="group" aria-label="Mode de contenu"><button type="button" aria-pressed={contentView === "write"} onClick={() => setContentView("write")}>Rédiger</button><button type="button" aria-pressed={contentView === "preview"} onClick={() => setContentView("preview")}>Aperçu du brouillon</button><button type="button" aria-pressed={contentView === "source"} onClick={() => setContentView("source")}>Source Markdown</button></div></div>{contentView === "write" && <div className="lesson-editor__toolbar" role="toolbar" aria-label="Insérer une structure de contenu">{editingActions.map(({ action, label }) => <button key={action} type="button" title={label} aria-label={label} onMouseDown={(event) => event.preventDefault()} onClick={() => insert(action)}>{label}</button>)}<details className="lesson-editor__insert-menu"><summary>Insérer</summary><div role="menu">{richInsertActions.map(({ action, label }) => <button key={action} type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => insert(action)}>{label}</button>)}</div></details></div>}{contentView === "preview" ? <div className="lesson-editor__local-preview" aria-label="Aperçu du contenu non sauvegardé">{draft.content.trim() ?     <LessonMarkdown content={draft.content} mode="author" resources={lesson.mediaResources} /> : <p className="caption">Cette leçon n’a pas encore de contenu.</p>}</div> : <label className="lesson-editor__writing-label" htmlFor="lesson-content-editor">{contentView === "source" ? "Source Markdown" : "Rédaction"}<textarea ref={editorRef} id="lesson-content-editor" className={`content-editor ${contentView === "source" ? "content-editor--source" : "content-editor--editorial"}`} name="content" value={draft.content}     onChange={(event) => { contentRef.current = event.target.value; updateDraft("content", event.target.value); setLessonSelection(lesson.id, null); }} onSelect={(event) => captureSelection(event.currentTarget)} onMouseUp={(event) => captureSelection(event.currentTarget)} onKeyUp={(event) => captureSelection(event.currentTarget)} spellCheck={contentView === "write"} /></label>}{hasUnclosedCodeFence(draft.content) && <p className="lesson-editor__warning" role="status">Un bloc de code semble ne pas être fermé. Vérifiez l’aperçu avant de sauvegarder.</p>}</section></>}
  </form>{tab === "resources" && canManageSources && <ForgeSourceResources courseSlug={courseSlug} />}</>;
}

function MediaUpload({ courseId, onUploaded }: { courseId: string; onUploaded: (kind: "image" | "audio", id: string, text: string, caption: string) => void }) {
  const [kind, setKind] = useState<"image" | "audio">("image");
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const upload = () => {
    if (!file) { setMessage("Sélectionnez un fichier."); return; }
    const formData = new FormData();
    formData.set("kind", kind); formData.set("file", file); formData.set(kind === "image" ? "altText" : "title", text); formData.set("caption", caption);
    startTransition(async () => {
      try {
        const resource = await uploadCourseMediaAction(courseId, formData);
        onUploaded(kind, resource.id, text, caption);
        setFile(null); setText(""); setCaption(""); setMessage("Média téléversé. Il reste à sauvegarder la leçon.");
      } catch (error) { setMessage(error instanceof Error ? error.message : "Le téléversement a échoué."); }
    });
  };
  return <aside className="lesson-editor__media-upload" aria-label="Ajouter un média"><strong>Ajouter une image ou un audio</strong><div><label>Type<select value={kind} onChange={(event) => setKind(event.target.value as "image" | "audio")}><option value="image">Image</option><option value="audio">Audio</option></select></label><label>{kind === "image" ? "Texte alternatif" : "Titre"}<input value={text} required onChange={(event) => setText(event.target.value)} /></label><label>Fichier<input type="file" accept={kind === "image" ? "image/jpeg,image/png,image/webp" : "audio/mpeg,audio/mp4,audio/wav"} onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><label>Légende (facultatif)<input value={caption} onChange={(event) => setCaption(event.target.value)} /></label><button type="button" onClick={upload} disabled={pending}>{pending ? "Téléversement..." : "Téléverser et insérer"}</button></div>{message && <p role="status">{message}</p>}</aside>;
}
