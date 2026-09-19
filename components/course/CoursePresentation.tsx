import type { ReactNode } from "react";
import { BookOpen, Clock3, GraduationCap, PenLine, Sparkles } from "lucide-react";
import type { CourseSummary } from "@/lib/courses/contracts";
import { clampProgress, type CourseRelation } from "@/lib/courses/presentation";
import { Surface } from "@/components/ui/Surface";

export function RelationPills({ relations }: { relations: CourseRelation[] }) {
  if (relations.length === 0) return null;
  return <div className="relation-pills" aria-label="Relations au parcours">{relations.map((relation) => <span key={relation}>{relation === "learn" ? <GraduationCap size={13} /> : <PenLine size={13} />}{relation === "learn" ? "J’apprends" : "Je crée"}</span>)}</div>;
}

export function ProgressRing({ value, size = 52 }: { value: number; size?: number }) {
  const progress = clampProgress(value);
  return <div className="progress-ring" style={{ "--progress": progress, "--ring-size": `${size}px` } as React.CSSProperties} role="img" aria-label={`Progression : ${progress} %`}><svg viewBox="0 0 36 36" aria-hidden="true"><circle className="progress-ring__track" cx="18" cy="18" r="15.5" /><circle className="progress-ring__value" cx="18" cy="18" r="15.5" pathLength="100" /></svg><strong>{progress}%</strong></div>;
}

export function CourseCover({ domain }: { domain?: string | null }) {
  return <div className="course-cover" aria-label="Illustration Forge du parcours" role="img"><span><Sparkles size={23} /></span><small>{domain ?? "Forge"}</small></div>;
}

export function CourseMeta({ lessonCount, durationMinutes }: { lessonCount?: number; durationMinutes?: number | null }) {
  if (lessonCount === undefined && !durationMinutes) return null;
  return <div className="course-meta">{lessonCount !== undefined && <span><BookOpen size={14} />{lessonCount} leçon{lessonCount > 1 ? "s" : ""}</span>}{durationMinutes ? <span><Clock3 size={14} />{formatDuration(durationMinutes)}</span> : null}</div>;
}

function formatDuration(minutes: number) { const hours = Math.floor(minutes / 60); const rest = minutes % 60; return hours ? `${hours} h${rest ? ` ${rest} min` : ""}` : `${rest} min`; }

export function CourseCard({ course, relations = [], percentage, completedCount, action }: { course: CourseSummary; relations?: CourseRelation[]; percentage?: number; completedCount?: number; action: ReactNode }) {
  return <Surface className="course-card course-card--canonical"><CourseCover domain={course.domain} /><div className="course-card__body"><div className="course-card__top"><RelationPills relations={relations} />{course.status && <span className={`course-status course-status--${course.status}`}>{course.status === "published" ? "Publié" : course.status === "draft" ? "Brouillon" : course.status}</span>}</div><p className="caption course-card__domain">{course.domain ?? "Parcours"}</p><h2>{course.title}</h2>{course.description && <p className="course-card__description">{course.description}</p>}<CourseMeta lessonCount={course.lessonCount} durationMinutes={course.durationMinutes} />{percentage !== undefined && <div className="course-card__progress"><ProgressRing value={percentage} size={48} /><span><strong>{completedCount ?? 0} leçon{completedCount === 1 ? "" : "s"} terminée{completedCount === 1 ? "" : "s"}</strong><small>Progression réelle du parcours</small></span></div>}<div className="course-card__action">{action}</div></div></Surface>;
}
