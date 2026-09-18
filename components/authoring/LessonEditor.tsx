"use client";

import { useEffect, useState, useTransition } from "react";
import { Save } from "lucide-react";
import type { CourseLesson } from "@/lib/courses/contracts";
import { createLessonDraft, lessonDraftFormData } from "@/lib/courses/lesson-draft";
import { Button } from "@/components/ui/Button";
import { ForgeSourceResources } from "@/components/forge/ForgeSourceResources";
import { useForgeProposal } from "@/components/forge/ForgeProposalContext";
import { saveLessonAction } from "@/app/app/create/actions";

export function LessonEditor({ courseId, courseSlug, lesson }: { courseId: string; courseSlug: string; lesson: CourseLesson }) {
  return <LessonEditorDraft key={lesson.id} courseId={courseId} courseSlug={courseSlug} lesson={lesson} />;
}

function LessonEditorDraft({ courseId, courseSlug, lesson }: { courseId: string; courseSlug: string; lesson: CourseLesson }) {
  const [message, setMessage] = useState(""); const [tab, setTab] = useState<"info" | "content" | "resources">("info"); const [draft, setDraft] = useState(createLessonDraft(lesson)); const [pending, startTransition] = useTransition(); const { proposal, setProposal } = useForgeProposal();
  useEffect(() => { if (!proposal || proposal.proposal.target.lessonId !== lesson.id) return; queueMicrotask(() => { if (proposal.proposal.field === "content" && proposal.proposal.suggestedContent) { setDraft((current) => ({ ...current, content: proposal.proposal.suggestedContent! })); setTab("content"); } if (proposal.proposal.field === "description" && proposal.proposal.suggestedContent) { setDraft((current) => ({ ...current, description: proposal.proposal.suggestedContent! })); setTab("info"); } if (proposal.proposal.field === "objectives" && proposal.proposal.objectives) { setDraft((current) => ({ ...current, objectives: proposal.proposal.objectives!.join("\n") })); setTab("info"); } setMessage("Proposition Forge appliquée au brouillon. Sauvegardez pour la rendre persistante."); setProposal(null); }); }, [lesson.id, proposal, setProposal]);
  const updateDraft = <Key extends keyof typeof draft>(key: Key, value: typeof draft[Key]) => setDraft((current) => ({ ...current, [key]: value }));
  const save = () => startTransition(async () => { try { await saveLessonAction(courseId, lesson.id, lessonDraftFormData(draft)); setMessage("Leçon sauvegardée."); } catch (error) { setMessage(error instanceof Error ? error.message : "La sauvegarde a échoué."); } });
  return <><form className="form authoring-form" action={save}>
    <p className="caption">Leçon sélectionnée</p><h2>{draft.title}</h2><div className="editor-tabs" role="tablist" aria-label="Édition de la leçon"><button type="button" role="tab" aria-selected={tab === "info"} onClick={() => setTab("info")}>Informations</button><button type="button" role="tab" aria-selected={tab === "content"} onClick={() => setTab("content")}>Contenu</button><button type="button" role="tab" aria-selected={tab === "resources"} onClick={() => setTab("resources")}>Ressources</button></div>
    {tab === "info" && <><label>Titre<input name="title" value={draft.title} required onChange={(event) => updateDraft("title", event.target.value)} /></label><label>Résumé<textarea name="description" value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} /></label><label>Type<select name="type" value={draft.type} onChange={(event) => updateDraft("type", event.target.value)}><option value="reading">Lecture</option><option value="video">Vidéo</option><option value="exercise">Exercice</option></select></label><label>Durée (minutes)<input name="durationMinutes" type="number" min="0" value={draft.durationMinutes} onChange={(event) => updateDraft("durationMinutes", event.target.value)} /></label><label>Statut<select name="publishingStatus" value={draft.publishingStatus} onChange={(event) => updateDraft("publishingStatus", event.target.value)}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="locked">Verrouillé</option></select></label><label>Objectifs, une ligne par objectif<textarea name="objectives" value={draft.objectives} onChange={(event) => updateDraft("objectives", event.target.value)} /></label></>}
    {tab === "content" && <label>Contenu Markdown<textarea className="content-editor" name="content" value={draft.content} onChange={(event) => updateDraft("content", event.target.value)} /></label>}
    {tab !== "resources" && <Button type="submit" disabled={pending}><Save size={17} /> {pending ? "Sauvegarde..." : "Sauvegarder"}</Button>}{message && <p className={message.includes("échoué") ? "form-error" : "completion-state"} role="status">{message}</p>}
  </form>{tab === "resources" && <ForgeSourceResources courseSlug={courseSlug} />}</>;
}