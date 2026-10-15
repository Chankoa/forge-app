"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bold, Code2, Image as ImageIcon, Italic, Link2, List, ListOrdered, MoreHorizontal, Music2, Plus, Quote, Rows3, Save, Type, Video, X } from "lucide-react";
import type { CourseLesson } from "@/lib/courses/contracts";
import { createLessonDraft, lessonDraftFormData } from "@/lib/courses/lesson-draft";
import { Button } from "@/components/ui/Button";
import { ForgeSourceResources } from "@/components/forge/ForgeSourceResources";
import { useForgeProposal } from "@/components/forge/ForgeProposalContext";
import { saveLessonAction, uploadCourseMediaAction } from "@/app/app/create/actions";
import { adjacentTab } from "@/lib/courses/workspace-layout";
import { LessonEmptyContent } from "./LessonEmptyContent";
import { forgeProposalStates } from "@/lib/forge/authoring-ux";
import { applyLessonProposalToDraft } from "@/lib/forge/lesson-proposal-application";
import { forgeLessonSavedEvent } from "@/lib/forge/lesson-content-event";
import { LessonMarkdown } from "@/components/learning/LessonContent";
import { hasUnclosedCodeFence, insertLessonMarkdown, insertMediaResource, type LessonInsertAction } from "@/lib/courses/lesson-markdown";
import { validateMediaUpload, type MediaPresentation } from "@/lib/courses/media-contracts";
import { uploadOperationError } from "@/lib/uploads/upload-feedback";
import { dispatchToast } from "@/lib/ui/toast";

type LessonTab = "info" | "content" | "resources";
type ContentView = "write" | "preview" | "source";
const blockStyleActions: Array<{ action: LessonInsertAction; label: string }> = [
  { action: "paragraph", label: "Paragraphe" }, { action: "heading2", label: "Titre H2" }, { action: "heading3", label: "Sous-titre H3" },
  { action: "callout", label: "À retenir" }, { action: "quote", label: "Citation" }, { action: "code", label: "Bloc de code" },
];
const richInsertActions: Array<{ action: LessonInsertAction; label: string }> = [
  { action: "video", label: "Vidéo" }, { action: "tab", label: "Tablature" },
  { action: "practice", label: "Exercice" }, { action: "divider", label: "Séparateur" }, { action: "link", label: "Lien" },
];

export function LessonEditor({ courseId, courseSlug, lesson, moduleTitle, moduleNumber, lessonNumber, canManageSources, canUploadMedia }: { courseId: string; courseSlug: string; lesson: CourseLesson; moduleTitle: string; moduleNumber: number; lessonNumber: number; canManageSources: boolean; canUploadMedia: boolean }) {
  return <LessonEditorDraft key={lesson.id} courseId={courseId} courseSlug={courseSlug} lesson={lesson} moduleTitle={moduleTitle} moduleNumber={moduleNumber} lessonNumber={lessonNumber} canManageSources={canManageSources} canUploadMedia={canUploadMedia} />;
}

function LessonEditorDraft({ courseId, courseSlug, lesson, moduleTitle, moduleNumber, lessonNumber, canManageSources, canUploadMedia }: { courseId: string; courseSlug: string; lesson: CourseLesson; moduleTitle: string; moduleNumber: number; lessonNumber: number; canManageSources: boolean; canUploadMedia: boolean }) {
  const [message, setMessage] = useState(""); const [tab, setTab] = useState<LessonTab>("content"); const [contentView, setContentView] = useState<ContentView>("write"); const [draft, setDraft] = useState(createLessonDraft(lesson)); const [savedDraft, setSavedDraft] = useState(createLessonDraft(lesson)); const [localResources, setLocalResources] = useState(lesson.mediaResources ?? {}); const [pending, startTransition] = useTransition(); const { registerLessonDraft, setLessonSelection } = useForgeProposal(); const contentRef = useRef(draft.content); const draftRef = useRef(draft); const editorRef = useRef<HTMLTextAreaElement>(null); const focusObjectivesFromAnalysis = useRef(false);
  const [writingStarted, setWritingStarted] = useState(Boolean(lesson.content?.trim()));
  const [mediaPanelOpen, setMediaPanelOpen] = useState(false);
  const [mediaKind, setMediaKind] = useState<"image" | "audio">("image");
  const insertMenuRef = useRef<HTMLDetailsElement>(null);
  const localObjectUrls = useRef<string[]>([]);
  const queryInsertionDone = useRef(false);
  useEffect(() => { contentRef.current = draft.content; }, [draft.content]);
  useEffect(() => () => { localObjectUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("focus") !== "objectives") return; focusObjectivesFromAnalysis.current = true; queueMicrotask(() => setTab("info")); }, []);
  useEffect(() => { if (tab !== "info" || !focusObjectivesFromAnalysis.current) return; focusObjectivesFromAnalysis.current = false; document.getElementById("lesson-objectives-editor")?.focus(); }, [tab]);
  useEffect(() => registerLessonDraft({
    lessonId: lesson.id,
    getContent: () => contentRef.current,
    applyContent: (content) => {
      contentRef.current = content;
      const next = { ...draftRef.current, content };
      draftRef.current = next;
      setDraft(next);
    },
    applyProposal: (intent, patch) => {
      const applied = applyLessonProposalToDraft(draftRef.current, intent, patch);
      if (!applied.ok) return false;
      draftRef.current = applied.draft;
      contentRef.current = applied.draft.content;
      setDraft(applied.draft);
      setTab(applied.field === "content" ? "content" : "info");
      dispatchToast("Modification appliquée au brouillon.");
      return true;
    },
  }), [lesson.id, registerLessonDraft]);
  const updateDraft = useCallback((key: keyof typeof draft, value: string) => {
    const next = { ...draftRef.current, [key]: value };
    draftRef.current = next;
    setDraft(next);
  }, []);
  const closeMediaPanel = useCallback(() => setMediaPanelOpen(false), []);
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const save = () => startTransition(async () => { const submitted = draft; try { await saveLessonAction(courseId, lesson.id, lessonDraftFormData(submitted)); setSavedDraft(submitted); setMessage(""); dispatchToast(forgeProposalStates.saved); window.dispatchEvent(new CustomEvent(forgeLessonSavedEvent, { detail: { lessonId: lesson.id } })); } catch (error) { setMessage(error instanceof Error ? error.message : "La sauvegarde a échoué."); } });
  const tabs: LessonTab[] = canManageSources ? ["info", "content", "resources"] : ["info", "content"];
  const labels = { info: "Informations", content: "Contenu", resources: "Ressources" };
  const moveTab = (index: number, key: string) => { const next = adjacentTab(index, key, tabs.length); if (next === index) return; setTab(tabs[next]); requestAnimationFrame(() => document.getElementById(`lesson-tab-${tabs[next]}`)?.focus()); };
  const focusObjectives = () => { setTab("info"); requestAnimationFrame(() => document.getElementById("lesson-objectives-editor")?.focus()); };
  const objectives = draft.objectives.split("\n").map((item) => item.trim()).filter(Boolean);
  const captureSelection = useCallback((textarea: HTMLTextAreaElement) => { const { selectionStart, selectionEnd, value } = textarea; const text = value.slice(selectionStart, selectionEnd); setLessonSelection(lesson.id, text.trim() ? { text, start: selectionStart, end: selectionEnd } : null); }, [lesson.id, setLessonSelection]);
  const insert = useCallback((action: LessonInsertAction) => { const editor = editorRef.current; if (!editor) return; const next = insertLessonMarkdown(contentRef.current, editor.selectionStart, editor.selectionEnd, action); contentRef.current = next.content; updateDraft("content", next.content); setMessage(""); requestAnimationFrame(() => { editor.focus(); editor.setSelectionRange(next.selectionStart, next.selectionEnd); captureSelection(editor); }); }, [captureSelection, updateDraft]);
  const insertUploadedResource = useCallback((resource: Omit<MediaPresentation, "url" | "durationSeconds">, kind: "image" | "audio", text: string, caption: string, file: File) => { const editor = editorRef.current; const position = editor?.selectionStart ?? contentRef.current.length; const next = insertMediaResource(contentRef.current, position, editor?.selectionEnd ?? position, kind, resource.id, text, caption); const previewUrl = URL.createObjectURL(file); localObjectUrls.current.push(previewUrl); contentRef.current = next.content; updateDraft("content", next.content); setLocalResources((current) => ({ ...current, [resource.id]: { ...resource, url: previewUrl, durationSeconds: null } })); setWritingStarted(true); setMessage(""); dispatchToast(`${kind === "image" ? "Image" : "Audio"} ajouté au brouillon.`); if (editor) requestAnimationFrame(() => { editor.focus(); editor.setSelectionRange(next.selectionStart, next.selectionEnd); }); }, [updateDraft]);
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
    {tab === "content" && <><section className="lesson-editor__objectives" aria-labelledby="lesson-editor-objectives-title"><div><h3 id="lesson-editor-objectives-title">Objectifs pédagogiques</h3><p className="caption">Ce que l’apprenant saura faire. Le contenu ci-dessous est la matière enseignée.</p>{objectives.length ? <ul>{objectives.map((objective, index) => <li key={`${index}:${objective}`}>{objective}</li>)}</ul> : <p className="caption">Aucun objectif renseigné.</p>}</div><button type="button" onClick={focusObjectives}>Modifier</button></section>{!draft.content.trim() && !writingStarted ? <LessonEmptyContent onStartWriting={() => { setWritingStarted(true); requestAnimationFrame(() => editorRef.current?.focus()); }} /> : <section className="lesson-editor__composition" aria-label="Rédaction du contenu"><div className="lesson-editor__composition-header"><div><h3>Contenu de la leçon</h3><p className="caption">Sélectionnez du texte puis choisissez sa forme, ou insérez un élément au curseur.</p></div><div className="lesson-editor__view-switch" role="group" aria-label="Mode de contenu"><button type="button" aria-pressed={contentView === "write"} onClick={() => setContentView("write")}>Rédiger</button><button type="button" aria-pressed={contentView === "preview"} onClick={() => setContentView("preview")}>Aperçu</button><button type="button" aria-pressed={contentView === "source"} onClick={() => setContentView("source")}>Source Markdown</button></div></div>{contentView === "write" && <div className="lesson-editor__toolbar" role="toolbar" aria-label="Mise en forme du contenu">
      <details className="lesson-editor__insert-menu" onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}><summary aria-label="Style du bloc"><Type size={16} aria-hidden="true" />Style du bloc</summary><div role="menu">{blockStyleActions.map(({ action, label }) => <button key={action} type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); insert(action); }}>{label}</button>)}</div></details>
      <button type="button" title="Gras" aria-label="Gras" onMouseDown={(event) => event.preventDefault()} onClick={() => insert("bold")}><Bold size={16} aria-hidden="true" /></button>
      <button type="button" title="Italique" aria-label="Italique" onMouseDown={(event) => event.preventDefault()} onClick={() => insert("italic")}><Italic size={16} aria-hidden="true" /></button>
      <button type="button" title="Liste à puces" aria-label="Liste à puces" onMouseDown={(event) => event.preventDefault()} onClick={() => insert("bullets")}><List size={16} aria-hidden="true" /></button>
      <button type="button" title="Liste numérotée" aria-label="Liste numérotée" onMouseDown={(event) => event.preventDefault()} onClick={() => insert("numbers")}><ListOrdered size={16} aria-hidden="true" /></button>
      <button type="button" title="Lien" aria-label="Lien" onMouseDown={(event) => event.preventDefault()} onClick={() => insert("link")}><Link2 size={16} aria-hidden="true" /></button>
      <button type="button" title="Citation" aria-label="Citation" onMouseDown={(event) => event.preventDefault()} onClick={() => insert("quote")}><Quote size={16} aria-hidden="true" /></button>
      <button type="button" title="Bloc de code" aria-label="Bloc de code" onMouseDown={(event) => event.preventDefault()} onClick={() => insert("code")}><Code2 size={16} aria-hidden="true" /></button>
      <details ref={insertMenuRef} className="lesson-editor__insert-menu" onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}><summary><Plus size={16} aria-hidden="true" />Insérer</summary><div role="menu">
        <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => { setMediaKind("image"); insertMenuRef.current?.removeAttribute("open"); setMediaPanelOpen(true); }}><ImageIcon size={15} aria-hidden="true" />Image</button>
        <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => { setMediaKind("audio"); insertMenuRef.current?.removeAttribute("open"); setMediaPanelOpen(true); }}><Music2 size={15} aria-hidden="true" />Audio</button>
        {richInsertActions.map(({ action, label }) => <button key={action} type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); insert(action); }}>{action === "video" ? <Video size={15} aria-hidden="true" /> : action === "tab" ? <Rows3 size={15} aria-hidden="true" /> : null}{label}</button>)}
      </div></details>
      <details className="lesson-editor__insert-menu" onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}><summary><MoreHorizontal size={16} aria-hidden="true" />Plus</summary><div role="menu"><button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); insert("divider"); }}>Séparateur</button></div></details>
      {mediaPanelOpen && canUploadMedia && <MediaUpload courseId={courseId} initialKind={mediaKind} onClose={closeMediaPanel} onUploaded={insertUploadedResource} />}
    </div>}{contentView === "preview" ? <div className="lesson-editor__local-preview" aria-label="Aperçu du contenu non sauvegardé">{draft.content.trim() ? <LessonMarkdown content={draft.content} mode="author" resources={localResources} /> : <p className="caption">Cette leçon n’a pas encore de contenu.</p>}</div> : <label className={`lesson-editor__writing-label${contentView === "source" ? " lesson-editor__writing-label--source" : ""}`} htmlFor="lesson-content-editor">{contentView === "source" ? "Source Markdown" : "Rédaction"}<textarea ref={editorRef} id="lesson-content-editor" className={`content-editor ${contentView === "source" ? "content-editor--source" : "content-editor--editorial"}`} name="content" value={draft.content} onChange={(event) => { contentRef.current = event.target.value; updateDraft("content", event.target.value); setLessonSelection(lesson.id, null); }} onSelect={(event) => captureSelection(event.currentTarget)} onMouseUp={(event) => captureSelection(event.currentTarget)} onKeyUp={(event) => captureSelection(event.currentTarget)} spellCheck={contentView === "write"} /></label>}{hasUnclosedCodeFence(draft.content) && <p className="lesson-editor__warning" role="status">Un bloc de code semble ne pas être fermé. Vérifiez l’aperçu avant de sauvegarder.</p>}</section>}</>}
  </form>{tab === "resources" && canManageSources && <ForgeSourceResources courseSlug={courseSlug} />}</>;
}

function MediaUpload({ courseId, initialKind, onClose, onUploaded }: { courseId: string; initialKind: "image" | "audio"; onClose: () => void; onUploaded: (resource: Omit<MediaPresentation, "url" | "durationSeconds">, kind: "image" | "audio", text: string, caption: string, file: File) => void }) {
  const kind = initialKind;
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const uploading = useRef(false);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    input.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("keydown", closeOnEscape); previous?.focus(); };
  }, [onClose]);
  const upload = () => {
    if (uploading.current) return;
    if (!file) { setMessage("Sélectionnez un fichier."); setError(true); return; }
    if (!text.trim()) { setMessage(kind === "image" ? "Ajoutez un texte alternatif." : "Ajoutez un titre."); setError(true); return; }
    const validation = validateMediaUpload(kind, file.type, file.size);
    if (!validation.ok) { setMessage(validation.error); setError(true); return; }
    uploading.current = true;
    setMessage(""); setError(false);
    const formData = new FormData();
    formData.set("kind", kind); formData.set("file", file); formData.set(kind === "image" ? "altText" : "title", text); formData.set("caption", caption);
    startTransition(async () => {
      try {
        const resource = await uploadCourseMediaAction(courseId, formData);
        onUploaded(resource, kind, text, caption, file);
        setFile(null); setText(""); setCaption(""); if (input.current) input.current.value = "";
        onClose();
      } catch { setMessage(uploadOperationError(kind)); setError(true); }
      finally { uploading.current = false; }
    });
  };
  return <div ref={dialog} className="lesson-editor__media-overlay" role="dialog" aria-modal="true" aria-labelledby="lesson-media-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }} onKeyDown={(event) => {
    if (event.key !== "Tab") return;
    const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') ?? []);
    const first = items[0]; const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}><aside className="lesson-editor__media-upload"><header><strong id="lesson-media-title">Ajouter {kind === "image" ? "une image" : "un audio"}</strong><button type="button" aria-label="Fermer" onClick={onClose} disabled={pending}><X size={17} aria-hidden="true" /></button></header><div><label>{kind === "image" ? "Texte alternatif" : "Titre"}<input value={text} disabled={pending} onChange={(event) => setText(event.target.value)} /></label><label>Fichier<input ref={input} type="file" accept={kind === "image" ? "image/jpeg,image/png,image/webp" : "audio/mpeg,audio/mp4,audio/wav"} disabled={pending} aria-describedby="lesson-media-guidance" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><label>Légende (facultatif)<input value={caption} disabled={pending} onChange={(event) => setCaption(event.target.value)} /></label><p id="lesson-media-guidance" className="caption">{kind === "image" ? "JPEG, PNG ou WebP, 8 Mo maximum." : "MP3, M4A/MP4 ou WAV, 25 Mo maximum."}</p><Button type="button" variant="secondary" onClick={upload} disabled={pending}>{pending ? "Téléversement…" : "Téléverser et insérer"}</Button></div>{message && <p className={error ? "form-error" : "completion-state"} role="alert">{message}</p>}</aside></div>;
}
