"use client";

import { useEffect, useState, useTransition } from "react";
import { Save } from "lucide-react";
import type { CourseLesson } from "@/lib/courses/contracts";
import { Button } from "@/components/ui/Button";
import { ForgeSourceResources } from "@/components/forge/ForgeSourceResources";
import { useForgeProposal } from "@/components/forge/ForgeProposalContext";
import { saveLessonAction } from "@/app/app/create/actions";

export function LessonEditor({ courseId, courseSlug, lesson }: { courseId: string; courseSlug: string; lesson: CourseLesson }) {
  const [message, setMessage] = useState(""); const [tab, setTab] = useState<"info" | "content" | "resources">("info"); const [content, setContent] = useState(lesson.content ?? ""); const [description, setDescription] = useState(lesson.description ?? ""); const [objectives, setObjectives] = useState(lesson.objectives.join("\n")); const [pending, startTransition] = useTransition(); const { proposal, setProposal } = useForgeProposal();
  useEffect(() => { if (!proposal || proposal.proposal.target.lessonId !== lesson.id) return; queueMicrotask(() => { if (proposal.proposal.field === "content" && proposal.proposal.suggestedContent) { setContent(proposal.proposal.suggestedContent); setTab("content"); } if (proposal.proposal.field === "description" && proposal.proposal.suggestedContent) { setDescription(proposal.proposal.suggestedContent); setTab("info"); } if (proposal.proposal.field === "objectives" && proposal.proposal.objectives) { setObjectives(proposal.proposal.objectives.join("\n")); setTab("info"); } setMessage("Proposition Forge appliquée au brouillon. Sauvegardez pour la rendre persistante."); setProposal(null); }); }, [lesson.id, proposal, setProposal]);
  return <form className="form authoring-form" action={(data) => startTransition(async () => { try { await saveLessonAction(courseId, lesson.id, data); setMessage("Leçon sauvegardée."); } catch (error) { setMessage(error instanceof Error ? error.message : "La sauvegarde a échoué."); } })}>
    <p className="caption">Leçon sélectionnée</p><h2>{lesson.title}</h2><div className="editor-tabs" role="tablist" aria-label="Édition de la leçon"><button type="button" role="tab" aria-selected={tab === "info"} onClick={() => setTab("info")}>Informations</button><button type="button" role="tab" aria-selected={tab === "content"} onClick={() => setTab("content")}>Contenu</button><button type="button" role="tab" aria-selected={tab === "resources"} onClick={() => setTab("resources")}>Ressources</button></div>
    {tab === "info" && <><label>Titre<input name="title" defaultValue={lesson.title} required /></label><label>Résumé<textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} /></label><label>Type<select name="type" defaultValue={lesson.contentType}><option value="reading">Lecture</option><option value="video">Vidéo</option><option value="exercise">Exercice</option></select></label><label>Durée (minutes)<input name="durationMinutes" type="number" min="0" defaultValue={lesson.durationMinutes ?? ""} /></label><label>Statut<select name="publishingStatus" defaultValue={lesson.publishingStatus}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="locked">Verrouillé</option></select></label><label>Objectifs, une ligne par objectif<textarea name="objectives" value={objectives} onChange={(event) => setObjectives(event.target.value)} /></label></>}
    {tab === "content" && <label>Contenu Markdown<textarea className="content-editor" name="content" value={content} onChange={(event) => setContent(event.target.value)} /></label>}
    {tab === "resources" && <ForgeSourceResources courseSlug={courseSlug} />}
    <Button type="submit"><Save size={17} /> {pending ? "Sauvegarde..." : "Sauvegarder"}</Button>{message && <p className={message.includes("échoué") ? "form-error" : "completion-state"}>{message}</p>}
  </form>;
}