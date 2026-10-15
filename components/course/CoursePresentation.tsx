import type { ReactNode } from "react";
import { BookOpen, Clock3, Eye, GraduationCap, Layers3, PenLine, Pencil } from "lucide-react";
import type { CourseSummary } from "@/lib/courses/contracts";
import { clampProgress, domainLabel, showLibraryCreator, type CourseRelation } from "@/lib/courses/presentation";
import { Surface } from "@/components/ui/Surface";
import { DomainMetadata } from "./DomainMetadata";
import { libraryStatusLabels, type LibraryCourse } from "@/lib/courses/library-view";
import { AuthorAttribution } from "./AuthorAttribution";
import { CourseCover } from "./CourseCoverVisual";

export { CourseCover } from "./CourseCoverVisual";

export function CourseMediaIdentity({ cover, domain, title }: { cover: { url: string; altText?: string | null } | null | undefined; domain: string | null; title: ReactNode }) {
  return <div className="course-presentation__media-identity"><CourseCover image={cover} domain={domain} compact /><div className="course-presentation__identity"><DomainMetadata domain={domain} /><h3 className="course-presentation__title">{title}</h3></div></div>;
}

export function RelationPills({ relations }: { relations: CourseRelation[] }) {
  if (relations.length === 0) return null;
  return <div className="relation-pills" aria-label="Relations au parcours">{relations.map((relation) => <span key={relation}>{relation === "learn" ? <GraduationCap size={13} /> : relation === "create" ? <PenLine size={13} /> : relation === "edit" ? <Pencil size={13} /> : <Eye size={13} />}{relation === "learn" ? "J’apprends" : relation === "create" ? "Je crée" : relation === "edit" ? "J’édite" : "Lecteur"}</span>)}</div>;
}

export function ProgressRing({ value, size = 52 }: { value: number; size?: number }) {
  const progress = clampProgress(value);
  return <div className="progress-ring" style={{ "--progress": progress, "--ring-size": `${size}px` } as React.CSSProperties} role="img" aria-label={`Progression : ${progress} %`}><svg viewBox="0 0 36 36" aria-hidden="true"><circle className="progress-ring__track" cx="18" cy="18" r="15.5" /><circle className="progress-ring__value" cx="18" cy="18" r="15.5" pathLength="100" /></svg><strong>{progress}%</strong></div>;
}

export function CourseMeta({ lessonCount, durationMinutes }: { lessonCount?: number; durationMinutes?: number | null }) {
  if (lessonCount === undefined && !durationMinutes) return null;
  return <div className="course-meta">{lessonCount !== undefined && <span><BookOpen size={14} />{lessonCount} leçon{lessonCount > 1 ? "s" : ""}</span>}{durationMinutes ? <span><Clock3 size={14} />{formatDuration(durationMinutes)}</span> : null}</div>;
}

function formatDuration(minutes: number) { const hours = Math.floor(minutes / 60); const rest = minutes % 60; return hours ? `${hours} h${rest ? ` ${rest} min` : ""}` : `${rest} min`; }

export function CourseFacts({ moduleCount, lessonCount, durationMinutes }: { moduleCount?: number; lessonCount?: number; durationMinutes?: number | null }) {
  if (moduleCount === undefined && lessonCount === undefined && !durationMinutes) return null;
  return <div className="course-facts">
    {moduleCount !== undefined && <span><Layers3 size={14} aria-hidden="true" />{moduleCount} module{moduleCount === 1 ? "" : "s"}</span>}
    {lessonCount !== undefined && <span><BookOpen size={14} aria-hidden="true" />{lessonCount} leçon{lessonCount === 1 ? "" : "s"}</span>}
    {durationMinutes ? <span><Clock3 size={14} aria-hidden="true" />{formatDuration(durationMinutes)}</span> : null}
  </div>;
}

export function CourseCard({ course, relations = [], percentage, completedCount, action, menu }: { course: CourseSummary; relations?: CourseRelation[]; percentage?: number; completedCount?: number; action: ReactNode; menu?: ReactNode }) {
  return <Surface className="course-card course-card--canonical"><CourseCover image={course.cover} domain={course.domain} /><div className="course-card__body"><div className="course-card__top"><RelationPills relations={relations} /><div className="course-card__tools">{course.status && <span className={`course-status course-status--${course.status}`}>{course.status === "published" ? "Publié" : course.status === "draft" ? "Brouillon" : course.status}</span>}{menu}</div></div><p className="caption course-card__domain">{course.domain ?? "Parcours"}</p><h2>{course.title}</h2>{course.description && <p className="course-card__description">{course.description}</p>}<CourseMeta lessonCount={course.lessonCount} durationMinutes={course.durationMinutes} />{percentage !== undefined && <div className="course-card__progress"><ProgressRing value={percentage} size={48} /><span><strong>{completedCount ?? 0} leçon{completedCount === 1 ? "" : "s"} terminée{completedCount === 1 ? "" : "s"}</strong><small>Progression réelle du parcours</small></span></div>}<div className="course-card__action">{action}</div></div></Surface>;
}

export function PublicationStatus({ status }: { status: string | null | undefined }) { if (!status) return null; return <span className={`course-status course-status--${status}`}>{status === "published" ? "Publié" : status === "draft" ? "Brouillon" : status}</span>; }
export function ProgressIndicator({ value, completedCount }: { value: number; completedCount: number }) { const progress = clampProgress(value); return <div className="course-progress-indicator"><div><strong>{progress}%</strong><span>{completedCount} leçon{completedCount === 1 ? "" : "s"} terminée{completedCount === 1 ? "" : "s"}</span></div><progress value={progress} max="100" aria-label={`Progression : ${progress} %`} /></div>; }
type PersonalCourseProps = { course: LibraryCourse; relations: CourseRelation[]; action: ReactNode; menu?: ReactNode };
function PersonalCourseStatus({ course }: { course: LibraryCourse }) {
  const status = course.status === "published" || course.status === "draft" || course.status === "archived" ? course.status : null;
  return status ? <span className={`course-status course-status--${status}`}>{libraryStatusLabels[status]}</span> : null;
}
export function PersonalCourseRow({ course, relations, action, menu }: PersonalCourseProps) {
  return <article className="course-presentation course-presentation--row personal-course-row" role="row">
    <div className="personal-course-row__course course-presentation__course" role="cell"><CourseCover image={course.cover} domain={course.domain} compact /><div className="personal-course-row__identity course-presentation__identity"><DomainMetadata domain={course.domain} /><h3 className="course-presentation__title">{course.title}</h3>{course.description && <p className="course-presentation__description">{course.description}</p>}{showLibraryCreator(course) && <AuthorAttribution author={course.author} />}</div></div>
    <div className="personal-course-row__relationship course-presentation__relation" role="cell"><RelationPills relations={relations} /></div>
    <div className="personal-course-row__state course-presentation__status" role="cell"><PersonalCourseStatus course={course} /></div>
    <div className="personal-course-row__progress course-presentation__progress" role="cell">{course.enrolled && <ProgressIndicator value={course.percentage} completedCount={course.completedCount} />}</div>
    <div className="personal-course-row__modules" role="cell"><CourseFacts moduleCount={course.moduleCount} lessonCount={course.lessonCount} durationMinutes={course.durationMinutes} /></div>
    <div className="personal-course-row__actions" role="cell"><div>{action}</div>{menu}</div>
  </article>;
}
export function PersonalCourseCard({ course, relations, action, menu }: PersonalCourseProps) {
  const status = course.status === "published" || course.status === "draft" || course.status === "archived" ? course.status : null;
  return <article className="course-presentation course-presentation--card personal-course-card"><div className="personal-course-card__badges"><RelationPills relations={relations} />{status && <span className={`course-status course-status--${status}`}>{libraryStatusLabels[status]}</span>}</div><CourseMediaIdentity cover={course.cover} domain={course.domain} title={course.title} />{course.description && <p className="personal-course-card__description course-presentation__description">{course.description}</p>}{showLibraryCreator(course) && <AuthorAttribution author={course.author} />}<CourseFacts moduleCount={course.moduleCount} lessonCount={course.lessonCount} durationMinutes={course.durationMinutes} />{course.enrolled && <ProgressIndicator value={course.percentage} completedCount={course.completedCount} />}<div className="personal-course-card__actions"><div>{action}</div>{menu}</div></article>;
}
export function ExploreCourseCard({ course, action }: { course: CourseSummary; action: ReactNode }) { return <Surface className="explore-course-card"><CourseCover image={course.cover} domain={course.domain} /><div className="explore-course-card__body"><p className="caption">{domainLabel(course.domain)}</p><h2>{course.title}</h2>{course.description && <p className="explore-course-card__description">{course.description}</p>}<CourseMeta lessonCount={course.lessonCount} durationMinutes={course.durationMinutes} /><div className="explore-course-card__action">{action}</div></div></Surface>; }
