"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Eye, LayoutGrid, List, PlayCircle, RotateCcw, Search, Settings2 } from "lucide-react";
import { OwnerCourseMenu } from "@/components/course/OwnerCourseMenu";
import { PersonalCourseCard, PersonalCourseRow } from "@/components/course/CoursePresentation";
import { courseCardAction, courseRelations, personalCardActions, type CourseCardAction, type CourseRelation } from "@/lib/courses/presentation";
import { filterAndSortLibraryCourses, libraryCourseStatus, libraryStatusLabels, type LibraryCourse, type LibrarySort, type LibraryStatus, type LibraryView } from "@/lib/courses/library-view";

const filters: Array<{ id: "all" | CourseRelation; label: string }> = [{ id: "all", label: "Tous" }, { id: "learn", label: "J’apprends" }, { id: "create", label: "Je crée" }, { id: "edit", label: "J’édite" }, { id: "view", label: "Lecteur" }];
const statuses: Array<Exclude<LibraryStatus, "all">> = ["draft", "published", "archived", "not_started", "in_progress", "completed"];

function LibraryItem({ course, view }: { course: LibraryCourse; view: LibraryView }) {
  const actionKind = courseCardAction({ isOwner: course.isOwner, enrolled: course.enrolled, percentage: course.percentage, hasLesson: Boolean(course.lessonSlug) });
  const learnHref = course.lessonSlug ? `/app/courses/${course.slug}/lessons/${course.lessonSlug}` : `/app/courses/${course.slug}`;
  const manageHref = `/app/courses/${course.slug}`;
  const renderAction = (kind: CourseCardAction, secondary = false) => kind === "manage" ? <Link className={`button course-action course-action--manage${secondary ? " button--secondary" : ""}`} href={manageHref}><Settings2 size={16} aria-hidden="true" />Gérer</Link>
    : kind === "start" ? <Link className="button course-action" href={learnHref}><PlayCircle size={16} aria-hidden="true" />Commencer</Link>
    : kind === "continue" ? <Link className="button course-action course-action--continue" href={learnHref}>Continuer<ArrowRight size={16} aria-hidden="true" /></Link>
    : kind === "review" ? <Link className="button button--secondary course-action" href={learnHref}><RotateCcw size={16} aria-hidden="true" />Revoir</Link>
    : <Link className="button button--secondary course-action" href={learnHref}><Eye size={16} aria-hidden="true" />Voir le parcours</Link>;
  const cardActions = personalCardActions({ isOwner: course.isOwner, enrolled: course.enrolled, percentage: course.percentage, hasLesson: Boolean(course.lessonSlug) });
  const action = renderAction(view === "cards" ? cardActions.primary : actionKind);
  const props = { course, relations: courseRelations(course.enrolled, course.isOwner, course.collaborationRole ?? null, course.collaborationRole ? "active" : null), action,
    secondaryAction: view === "cards" ? cardActions.secondary ? renderAction(cardActions.secondary, true) : null : course.isOwner && course.enrolled ? <Link className="personal-course-row__learn-action" href={learnHref}>Apprendre <ArrowRight size={14} aria-hidden="true" /></Link> : null,
    menu: course.isOwner ? <OwnerCourseMenu title={course.title} manageHref={manageHref} /> : null };
  return view === "list" ? <PersonalCourseRow {...props} /> : <PersonalCourseCard {...props} menu={null} />;
}

export function CourseLibrary({ courses, initialView = "list" }: { courses: LibraryCourse[]; initialView?: LibraryView }) {
  const [relation, setRelation] = useState<"all" | CourseRelation>("all");
  const [status, setStatus] = useState<LibraryStatus>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<LibrarySort>("title_asc");
  const [view, setView] = useState<LibraryView>(initialView);
  const visibleStatuses = statuses.filter((item) => courses.some((course) => libraryCourseStatus(course) === item));
  const visible = filterAndSortLibraryCourses(courses, { relation, status, query, sort });
  const emptyCopy = relation === "learn" ? "Vous ne suivez encore aucun parcours." : relation === "create" ? "Vous n’avez encore créé aucun parcours." : relation === "edit" ? "Vous ne modifiez encore aucun parcours partagé." : relation === "view" ? "Vous n’avez encore aucun parcours partagé en lecture." : "Aucun parcours pour le moment.";
  return <section className="course-library" aria-labelledby="course-library-heading">
    <div className="course-library__heading"><div><h2 id="course-library-heading">Votre bibliothèque</h2><p>{courses.length} parcours lié{courses.length > 1 ? "s" : ""} à votre activité.</p></div>
      <div className="course-library__controls"><label className="course-library__search"><Search size={17} aria-hidden="true" /><span className="sr-only">Rechercher un parcours</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un parcours" /></label>
        <div className="relation-filter" role="group" aria-label="Filtrer les parcours par relation">{filters.map((item) => <button key={item.id} type="button" aria-pressed={relation === item.id} onClick={() => setRelation(item.id)}>{item.label}</button>)}</div>
        {visibleStatuses.length > 1 && <label className="course-library__select"><span className="sr-only">Filtrer par statut</span><select value={status} onChange={(event) => setStatus(event.target.value as LibraryStatus)}><option value="all">Tous les statuts</option>{visibleStatuses.map((item) => <option key={item} value={item}>{libraryStatusLabels[item]}</option>)}</select></label>}
        <label className="course-library__select"><span className="sr-only">Trier les parcours</span><select value={sort} onChange={(event) => setSort(event.target.value as LibrarySort)}><option value="title_asc">Titre A–Z</option><option value="title_desc">Titre Z–A</option><option value="progress_desc">Progression</option></select></label>
        <div className="course-library__view" role="group" aria-label="Affichage des parcours"><button type="button" aria-label="Vue liste" aria-pressed={view === "list"} onClick={() => setView("list")}><List size={18} aria-hidden="true" /></button><button type="button" aria-label="Vue cartes" aria-pressed={view === "cards"} onClick={() => setView("cards")}><LayoutGrid size={18} aria-hidden="true" /></button></div>
      </div>
    </div>
    <p className="course-library__count" role="status">{visible.length} parcours affiché{visible.length > 1 ? "s" : ""}</p>
    {visible.length ? view === "list" ? <div className="personal-course-list" role="table" aria-label="Mes parcours"><div className="personal-course-list__head" role="row"><span role="columnheader">Parcours</span><span role="columnheader">Rôle</span><span role="columnheader">Statut</span><span role="columnheader">Modules</span><span role="columnheader">Actions</span></div>{visible.map((course) => <LibraryItem key={course.id} course={course} view={view} />)}</div>
      : <div className="personal-course-cards">{visible.map((course) => <LibraryItem key={course.id} course={course} view={view} />)}</div>
      : <div className="course-library__empty"><p>{query.trim() || status !== "all" ? "Aucun parcours ne correspond à ces critères." : emptyCopy}</p>{!query.trim() && status === "all" && <Link href={relation === "create" ? "/app/create" : "/app/explore"}>{relation === "create" ? "Créer" : "Explorer"}</Link>}</div>}
  </section>;
}
