import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CourseLibrary } from "../components/course/CourseLibrary";
import { filterAndSortLibraryCourses, libraryCourseStatus, type LibraryCourse } from "../lib/courses/library-view";

const owner: LibraryCourse = { id: "owner", slug: "owner", title: "Design", description: "Un parcours créé", domain: "Création web", status: "draft", moduleCount: 2, lessonCount: 5, durationMinutes: null, lessonSlug: "start", enrolled: false, isOwner: true, percentage: 0, completedCount: 0 };
const learner: LibraryCourse = { ...owner, id: "learner", slug: "learner", title: "Apprendre", description: "Un parcours suivi", status: "published", enrolled: true, isOwner: false, percentage: 45, completedCount: 2 };

test("library role and status filters use the displayed real state", () => {
  assert.equal(libraryCourseStatus(owner), "draft");
  assert.equal(libraryCourseStatus(learner), "in_progress");
  assert.deepEqual(filterAndSortLibraryCourses([owner, learner], { relation: "learn", status: "in_progress", query: "création", sort: "title_asc" }).map((course) => course.id), ["learner"]);
  assert.deepEqual(filterAndSortLibraryCourses([owner, learner], { relation: "create", status: "all", query: "", sort: "progress_desc" }).map((course) => course.id), ["owner"]);
});

test("an archived course stays visible and filterable for its owner", () => {
  const archived = { ...owner, id: "archived", slug: "archived", status: "archived" };
  assert.equal(libraryCourseStatus(archived), "archived");
  assert.deepEqual(filterAndSortLibraryCourses([archived, learner], { relation: "create", status: "archived", query: "", sort: "title_asc" }).map((course) => course.id), ["archived"]);
  const html = renderToStaticMarkup(createElement(CourseLibrary, { courses: [archived, learner] }));
  assert.match(html, /Archivé/);
});

test("My Paths starts in accessible List view with real columns and a Card toggle", () => {
  const html = renderToStaticMarkup(createElement(CourseLibrary, { courses: [owner, learner] }));
  assert.match(html, /role="table"/);
  assert.match(html, /role="columnheader">Modules/);
  assert.match(html, /aria-label="Vue liste" aria-pressed="true"/);
  assert.match(html, /aria-label="Vue cartes" aria-pressed="false"/);
  assert.match(html, /Brouillon/);
  assert.match(html, /En cours/);
  assert.doesNotMatch(html, /Dernière activité/);
});

test("Card view renders the same course records and actions without table semantics", () => {
  const html = renderToStaticMarkup(createElement(CourseLibrary, { courses: [owner, learner], initialView: "cards" }));
  assert.match(html, /aria-label="Vue cartes" aria-pressed="true"/);
  assert.match(html, /class="personal-course-cards"/);
  assert.doesNotMatch(html, /role="table"/);
  assert.match(html, /Un parcours créé/);
  assert.match(html, /Un parcours suivi/);
  assert.match(html, /href="\/app\/courses\/owner\?mode=edit"/);
});
