"use client";
import Link from "next/link";
import { Check, ChevronDown, Circle, CircleDot } from "lucide-react";
import type { CourseOutline } from "@/lib/courses/contracts";
import { WorkspaceRail } from "./WorkspacePanels";

export function CourseOutlineRail({ courseSlug, outline, selectedLesson, mode }: { courseSlug: string; outline: CourseOutline; selectedLesson?: string; mode?: "learn" | "edit" }) {
  const suffix = mode === "edit" ? "?mode=edit" : "";
  const lessons = outline.flatMap((m) => m.lessons);
  const completed = lessons.filter((l) => l.status === "completed").length;
  return <WorkspaceRail panel="structure">
    {mode !== "edit" && lessons.length > 0 && <div className="outline-progress"><span>Votre progression</span><strong>{completed} / {lessons.length} leçons</strong><progress aria-label="Progression du parcours" max={lessons.length} value={completed} /></div>}
    <div className="outline-list">{outline.map((module, index) => <details className="outline-module" key={`${module.id}:${selectedLesson}`} open>
      <summary><span className="module-label">Module {index + 1}</span><strong>{module.moduleTitle}</strong><span className="caption">{module.lessons.length} leçons</span><ChevronDown size={15} /></summary>
      <ol>{module.lessons.map((lesson, lessonIndex) => <li key={lesson.id}><Link className={`outline-lesson outline-lesson--${lesson.status}`} aria-current={selectedLesson === lesson.slug ? "page" : undefined} href={`/app/courses/${courseSlug}/lessons/${lesson.slug}${suffix}`}><span className="timeline-marker" aria-label={lesson.status === "completed" ? "Terminée" : lesson.status === "in-progress" ? "En cours" : "Non commencée"}>{lesson.status === "completed" ? <Check size={12} /> : lesson.status === "in-progress" ? <CircleDot size={15} /> : <Circle size={14} />}</span><span className="lesson-number">{index + 1}.{lessonIndex + 1}</span><span>{lesson.title}{lesson.durationMinutes ? <small>{lesson.durationMinutes} min</small> : null}</span></Link></li>)}</ol>
    </details>)}</div>
    {outline.length === 0 && <p className="caption">Les modules du parcours apparaîtront ici.</p>}
  </WorkspaceRail>;
}
