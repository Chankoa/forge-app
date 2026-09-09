"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import type { CourseLesson } from "@/lib/courses/contracts";
import { Button } from "@/components/ui/Button";
import { saveLessonAction } from "@/app/app/create/actions";

export function LessonEditor({ courseId, lesson }: { courseId: string; lesson: CourseLesson }) { const [message, setMessage] = useState(""); const [pending, startTransition] = useTransition(); return <form className="form authoring-form" action={(data) => startTransition(async () => { try { await saveLessonAction(courseId, lesson.id, data); setMessage("Leçon sauvegardée."); } catch (error) { setMessage(error instanceof Error ? error.message : "La sauvegarde a échoué."); } })}><h2>Modifier la leçon</h2><label>Titre<input name="title" defaultValue={lesson.title} required /></label><label>Résumé<textarea name="description" defaultValue={lesson.description ?? ""} /></label><label>Objectifs, une ligne par objectif<textarea name="objectives" defaultValue={lesson.objectives.join("\n")} /></label><label>Contenu Markdown<textarea className="content-editor" name="content" defaultValue={lesson.content ?? ""} /></label><Button type="submit"><Save size={17} /> {pending ? "Sauvegarde..." : "Sauvegarder"}</Button>{message && <p className={message.includes("échoué") ? "form-error" : "completion-state"}>{message}</p>}</form>; }