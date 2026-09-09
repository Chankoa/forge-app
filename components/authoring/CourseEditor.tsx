"use client";

import { useState, useTransition } from "react";
import { Plus, Save } from "lucide-react";
import type { CourseDetail } from "@/lib/courses/contracts";
import { Button } from "@/components/ui/Button";
import { addLessonAction, addModuleAction, saveCourseMetadataAction } from "@/app/app/create/actions";

export function CourseEditor({ course }: { course: CourseDetail }) {
  const [message, setMessage] = useState(""); const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<void>, success: string) => startTransition(async () => { try { await action(); setMessage(success); } catch (error) { setMessage(error instanceof Error ? error.message : "La sauvegarde a échoué."); } });
  return <div className="editor-stack"><form className="form authoring-form" action={(data) => run(() => saveCourseMetadataAction(course.id, data), "Informations sauvegardées.")}><h2>Informations</h2><label>Titre<input name="title" defaultValue={course.title} required /></label><label>Résumé<input name="subtitle" defaultValue={course.subtitle ?? ""} /></label><label>Description<textarea name="description" defaultValue={course.description ?? ""} required /></label><Button type="submit"><Save size={17} /> {pending ? "Sauvegarde..." : "Sauvegarder"}</Button></form><section className="content-section"><div className="section-heading"><h2>Structure</h2><form action={(data) => run(() => addModuleAction(course.id, data), "Module ajouté.")}><input name="title" aria-label="Titre du nouveau module" placeholder="Nouveau module" required /><Button type="submit" variant="secondary"><Plus size={16} /> Module</Button></form></div>{course.outline.map((module) => <section className="program-module" key={module.id}><h3>{module.moduleTitle}</h3>{module.lessons.map((lesson) => <p key={lesson.id}>{lesson.title}</p>)}<form className="inline-form" action={(data) => run(() => addLessonAction(course.id, module.id, data), "Leçon ajoutée.")}><input name="title" aria-label={`Titre d'une leçon dans ${module.moduleTitle}`} placeholder="Nouvelle leçon" required /><Button type="submit" variant="ghost"><Plus size={16} /> Leçon</Button></form></section>)}</section>{message && <p className={message.includes("échoué") || message.includes("pouvez") ? "form-error" : "completion-state"}>{message}</p>}</div>;
}