"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Eye, PlayCircle, RotateCcw, Settings2 } from "lucide-react";
import { OwnerCourseMenu } from "@/components/course/OwnerCourseMenu";
import { PersonalCourseRow } from "@/components/course/CoursePresentation";
import { courseCardAction, courseRelations, matchesCourseRelation, type CourseRelation } from "@/lib/courses/presentation";

type LibraryFilter = "all" | CourseRelation;
type LibraryCourse = { id: string; slug: string; title: string; description: string | null; domain: string | null; status: string | null; lessonCount: number; durationMinutes: number | null; lessonSlug: string | null; enrolled: boolean; isOwner: boolean; percentage: number; completedCount: number; };
const filters: Array<{ id: LibraryFilter; label: string }> = [{ id: "all", label: "Tous" }, { id: "learn", label: "J’apprends" }, { id: "create", label: "Je crée" }];

export function CourseLibrary({ courses }: { courses: LibraryCourse[] }) {
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const visible = courses.filter((course) => matchesCourseRelation(filter, course.enrolled, course.isOwner));
  const emptyCopy = filter === "learn" ? "Vous ne suivez encore aucun parcours." : filter === "create" ? "Vous n’avez encore créé aucun parcours." : "Aucun parcours pour le moment.";
  return <section className="course-library" aria-labelledby="course-library-heading"><div className="course-library__heading"><div><h2 id="course-library-heading">Votre bibliothèque</h2><p>{courses.length} parcours lié{courses.length > 1 ? "s" : ""} à votre activité.</p></div><div className="relation-filter" role="group" aria-label="Filtrer les parcours par relation">{filters.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div></div>{visible.length ? <div className="personal-course-list">{visible.map((course) => {
    const actionKind = courseCardAction({ isOwner: course.isOwner, enrolled: course.enrolled, percentage: course.percentage, hasLesson: Boolean(course.lessonSlug) });
    const learnHref = course.lessonSlug ? `/app/courses/${course.slug}/lessons/${course.lessonSlug}` : `/app/courses/${course.slug}`;
    const manageHref = `/app/courses/${course.slug}?mode=edit`;
    const action = actionKind === "manage" ? <Link className="button course-action course-action--manage" href={manageHref}><Settings2 size={16} />Gérer</Link> : actionKind === "start" ? <Link className="button course-action" href={learnHref}><PlayCircle size={16} />Commencer</Link> : actionKind === "continue" ? <Link className="button course-action course-action--continue" href={learnHref}>Continuer<ArrowRight size={16} /></Link> : actionKind === "review" ? <Link className="button button--secondary course-action" href={learnHref}><RotateCcw size={16} />Revoir</Link> : <Link className="button button--secondary course-action" href={learnHref}><Eye size={16} />Voir le parcours</Link>;
    return <PersonalCourseRow key={course.id} course={course} relations={courseRelations(course.enrolled, course.isOwner)} percentage={course.enrolled ? course.percentage : undefined} completedCount={course.completedCount} action={action} secondaryAction={course.isOwner && course.enrolled ? <Link className="personal-course-row__learn-action" href={learnHref}>Apprendre <ArrowRight size={14} /></Link> : null} menu={course.isOwner ? <OwnerCourseMenu title={course.title} manageHref={manageHref} /> : null} />;
  })}</div> : <div className="course-library__empty"><p>{emptyCopy}</p><Link href={filter === "create" ? "/app/create" : "/app/explore"}>{filter === "create" ? "Créer" : "Explorer"}</Link></div>}</section>;
}