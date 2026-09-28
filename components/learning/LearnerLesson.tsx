import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import type { CourseLesson } from "@/lib/courses/contracts";
import { LessonContent } from "./LessonContent";
import { CompleteLessonButton } from "./LearningActions";

export function LearnerLesson({ courseId, courseSlug, lesson, moduleTitle, moduleNumber, lessonNumber, position, total, previous, next, preview, completed }: {
  courseId: string; courseSlug: string; lesson: CourseLesson; moduleTitle: string; moduleNumber: number; lessonNumber: number;
  position: number; total: number; previous?: CourseLesson; next?: CourseLesson; preview: boolean; completed: boolean;
}) {
  const href = (item: CourseLesson) => `/app/courses/${courseSlug}/lessons/${item.slug}${preview ? "?mode=preview" : ""}`;
  return <article className="learner-lesson">
    <header className="lesson-page-header">
      <p className="eyebrow">Module {moduleNumber} · {moduleTitle}</p>
      <p className="lesson-page-header__position">Leçon {moduleNumber}.{lessonNumber} · {position} sur {total}{preview ? " · Prévisualisation" : ""}</p>
      <h2>{lesson.title}</h2>
      {lesson.durationMinutes ? <p className="lesson-page-header__meta"><Clock3 size={15} aria-hidden="true" /> {lesson.durationMinutes} min</p> : null}
    </header>
    <LessonContent lesson={lesson} />
    <nav className="learner-lesson__navigation" aria-label="Navigation entre les leçons">
      <div>{previous && <Link className="learner-lesson__adjacent" href={href(previous)}><ArrowLeft size={16} aria-hidden="true" /><span>Leçon précédente<small>{previous.title}</small></span></Link>}</div>
      {!preview && <CompleteLessonButton courseId={courseId} lessonId={lesson.id} courseSlug={courseSlug} completed={completed} />}
      <div>{next && <Link className="learner-lesson__adjacent learner-lesson__adjacent--next" href={href(next)}><span>Leçon suivante<small>{next.title}</small></span><ArrowRight size={16} aria-hidden="true" /></Link>}</div>
    </nav>
  </article>;
}
