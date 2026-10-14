"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Eye, LayoutGrid, List, PlayCircle, RotateCcw, Settings2 } from "lucide-react";
import { CourseOverflowMenu } from "@/components/course/OwnerCourseMenu";
import { PersonalCourseCard, PersonalCourseRow } from "@/components/course/CoursePresentation";
import { courseRelations, libraryPrimaryAction, type CourseCardAction, type CourseRelation } from "@/lib/courses/presentation";
import { filterAndSortLibraryCourses, type LibraryCourse, type LibrarySort, type LibraryView } from "@/lib/courses/library-view";
import { courseManagePath } from "@/lib/courses/context-navigation";
import { useContextualTopbarSearch } from "@/components/shell/ContextualTopbarSearch";

const filters: Array<{ id: "all" | CourseRelation; label: string }> = [{ id: "all", label: "Tous" }, { id: "learn", label: "J’apprends" }, { id: "create", label: "Je crée" }, { id: "edit", label: "J’édite" }];

function LibraryItem({ course, view }: { course: LibraryCourse; view: LibraryView }) {
  const actionKind = libraryPrimaryAction({ isOwner: course.isOwner, collaborationRole: course.collaborationRole, enrolled: course.enrolled, percentage: course.percentage, hasLesson: Boolean(course.lessonSlug) });
  const learnHref = course.lessonSlug ? `/app/courses/${course.slug}/lessons/${course.lessonSlug}` : `/app/courses/${course.slug}`;
  const manageHref = courseManagePath(course.slug);
  const renderAction = (kind: CourseCardAction) => kind === "manage" ? <Link className="button course-action course-action--manage" href={manageHref}><Settings2 size={16} aria-hidden="true" />Gérer</Link>
    : kind === "start" ? <Link className="button course-action" href={learnHref}><PlayCircle size={16} aria-hidden="true" />Commencer</Link>
    : kind === "continue" ? <Link className="button course-action course-action--continue" href={learnHref}>Continuer<ArrowRight size={16} aria-hidden="true" /></Link>
    : kind === "review" ? <Link className="button button--secondary course-action" href={learnHref}><RotateCcw size={16} aria-hidden="true" />Revoir</Link>
    : <Link className="button button--secondary course-action" href={learnHref}><Eye size={16} aria-hidden="true" />Voir le parcours</Link>;
  const relations = courseRelations(course.enrolled, course.isOwner, course.collaborationRole ?? null, course.collaborationRole ? "active" : null);
  const menu = <CourseOverflowMenu title={course.title} manageHref={(course.isOwner || course.collaborationRole === "editor") && actionKind !== "manage" ? manageHref : undefined} previewHref={actionKind !== "view" ? `/app/courses/${course.slug}` : undefined} />;
  if (view === "list") {
    return <PersonalCourseRow
      course={course}
      relations={relations}
      action={renderAction(actionKind)}
      menu={menu}
    />;
  }
  return <PersonalCourseCard
    course={course}
    relations={relations}
    action={renderAction(actionKind)}
    menu={menu}
  />;
}

export function CourseLibrary({ courses, initialView = "list" }: { courses: LibraryCourse[]; initialView?: LibraryView }) {
  const [relation, setRelation] = useState<"all" | CourseRelation>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<LibrarySort>("title_asc");
  const [view, setView] = useState<LibraryView>(initialView);
  const topbarSearch = useMemo(() => ({ id: "course-library", placeholder: "Rechercher un parcours…", value: query, onChange: setQuery }), [query]);
  useContextualTopbarSearch(topbarSearch);
  const visible = filterAndSortLibraryCourses(courses, { relation, status: "all", query, sort });
  const emptyCopy = relation === "learn" ? "Vous ne suivez encore aucun parcours." : relation === "create" ? "Vous n’avez encore créé aucun parcours." : relation === "edit" ? "Vous ne modifiez encore aucun parcours partagé." : relation === "view" ? "Vous n’avez encore aucun parcours partagé en lecture." : "Aucun parcours pour le moment.";
  return <section className="course-library" aria-labelledby="course-library-heading">
    <div className="course-library__heading"><h2 id="course-library-heading" className="sr-only">Liste de mes parcours</h2></div>
    <div className="course-library__tabs" role="group" aria-label="Filtrer les parcours par relation">{filters.map((item) => <button key={item.id} type="button" aria-pressed={relation === item.id} onClick={() => setRelation(item.id)}>{item.label}<span>{item.id === "all" ? courses.length : courses.filter((course) => courseRelations(course.enrolled, course.isOwner, course.collaborationRole ?? null, course.collaborationRole ? "active" : null).includes(item.id as CourseRelation)).length}</span></button>)}</div>
    <div className="course-library__toolbar"><p className="course-library__count" role="status">{visible.length} parcours affiché{visible.length > 1 ? "s" : ""}</p><div className="course-library__controls"><div className="course-library__view" role="group" aria-label="Affichage des parcours"><button type="button" aria-label="Vue liste" aria-pressed={view === "list"} onClick={() => setView("list")}><List size={18} aria-hidden="true" /></button><button type="button" aria-label="Vue grille" aria-pressed={view === "cards"} onClick={() => setView("cards")}><LayoutGrid size={18} aria-hidden="true" /></button></div><label className="course-library__select"><span className="sr-only">Trier les parcours</span><select value={sort} onChange={(event) => setSort(event.target.value as LibrarySort)}><option value="title_asc">Titre A–Z</option><option value="title_desc">Titre Z–A</option><option value="progress_desc">Progression</option></select></label></div></div>
    {visible.length ? view === "list" ? <div className="personal-course-list" role="table" aria-label="Mes parcours"><div className="personal-course-list__head" role="row"><span role="columnheader">Parcours</span><span role="columnheader">Relation</span><span role="columnheader">Statut</span><span role="columnheader">Progression</span><span role="columnheader">Contenu</span><span role="columnheader">Actions</span></div>{visible.map((course) => <LibraryItem key={course.id} course={course} view={view} />)}</div>
      : <div className="personal-course-cards">{visible.map((course) => <LibraryItem key={course.id} course={course} view={view} />)}</div>
      : <div className="course-library__empty"><p>{query.trim() ? "Aucun parcours ne correspond à cette recherche." : emptyCopy}</p>{!query.trim() && <Link href={relation === "create" ? "/app/create" : "/app/explore"}>{relation === "create" ? "Créer" : "Explorer"}</Link>}</div>}
  </section>;
}
