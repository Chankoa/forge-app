import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CourseFacts, PersonalCourseCard } from "../components/course/CoursePresentation";
import { ExploreCatalog } from "../components/course/ExploreCatalog";
import { courseLevelLabel, exploreDomains, selectExploreCourses, type DiscoverableCourse } from "../lib/courses/explore-view";
import type { LibraryCourse } from "../lib/courses/library-view";

const courses: DiscoverableCourse[] = [
  { id: "a", slug: "a", title: "Écologie alpine", description: "Découvrir la montagne", domain: "Environnement", status: "published", durationMinutes: 90, enrolled: true },
  { id: "b", slug: "b", title: "Design d'interface", description: "Concevoir une interface", domain: "Design", status: "published", durationMinutes: null, enrolled: true },
  { id: "c", slug: "c", title: "Photo", description: "Pratiquer la photo", domain: "Culture", status: "published", durationMinutes: null, enrolled: true },
  { id: "d", slug: "d", title: "Cinéma", description: "Lire une image", domain: "Culture", status: "published", durationMinutes: null, enrolled: true },
];

test("Explorer uses only published courses and domains from real course data", () => {
  assert.deepEqual(exploreDomains(courses), ["Culture", "Design", "Environnement"]);
  assert.deepEqual(selectExploreCourses(courses, "", "").featured.map((course) => course.id), ["a", "b", "c"]);
  assert.deepEqual(selectExploreCourses(courses, "", "").recent.map((course) => course.id), ["d"]);
  assert.deepEqual(selectExploreCourses(courses, "ecologie", "Environnement").featured.map((course) => course.id), ["a"]);
  assert.equal(selectExploreCourses([...courses, { ...courses[0], id: "draft", status: "draft" }], "", "").count, 4);
});

test("Explorer renders discovery actions and never exposes personal management", () => {
  const html = renderToStaticMarkup(createElement(ExploreCatalog, { courses }));
  assert.match(html, /À découvrir/);
  assert.match(html, /Autres parcours publiés/);
  assert.match(html, /aria-label="Filtrer par domaine"/);
  assert.match(html, /Voir le parcours/);
  assert.doesNotMatch(html, />Gérer</);
  assert.doesNotMatch(html, /Recommandé pour vous/);
});

test("Explorer displays only supported real levels and filters by loaded domains", () => {
  assert.equal(courseLevelLabel("beginner"), "Débutant");
  assert.equal(courseLevelLabel("advanced"), "Avancé");
  assert.equal(courseLevelLabel(null), null);
  assert.deepEqual(selectExploreCourses(courses, "", "Culture").featured.map((course) => course.id), ["c", "d"]);
  const html = renderToStaticMarkup(createElement(ExploreCatalog, { courses: [{ ...courses[0], level: "beginner" }, courses[1]] }));
  assert.match(html, /Débutant/);
  assert.doesNotMatch(html, /Intermédiaire|Avancé/);
});

test("shared compact facts use only available module, lesson and duration fields", () => {
  const html = renderToStaticMarkup(createElement(CourseFacts, { moduleCount: 2, lessonCount: 5, durationMinutes: 90 }));
  assert.match(html, /2 modules/);
  assert.match(html, /5 leçons/);
  assert.match(html, /1 h 30 min/);
  assert.equal(renderToStaticMarkup(createElement(CourseFacts, { durationMinutes: null })), "");
});

test("personal card keeps role and status above title, with real metadata and one primary action", () => {
  const course: LibraryCourse = { id: "owner", slug: "owner", title: "Design", description: "Un parcours créé", domain: "Design", status: "draft", moduleCount: 2, lessonCount: 5, durationMinutes: 90, lessonSlug: "start", enrolled: false, isOwner: true, percentage: 0, completedCount: 0 };
  const html = renderToStaticMarkup(createElement(PersonalCourseCard, { course, relations: ["create"], action: createElement("a", { href: "/app/courses/owner" }, "Gérer") }));
  assert.ok(html.indexOf("J’apprends") < 0);
  assert.ok(html.indexOf("Brouillon") < html.indexOf("<h3>Design</h3>"));
  assert.match(html, /2 modules/);
  assert.match(html, /5 leçons/);
  assert.match(html, /1 h 30 min/);
  assert.equal((html.match(/>Gérer</g) ?? []).length, 1);
  assert.ok(html.indexOf("2 modules") < html.indexOf('class="personal-course-card__actions"'));
  assert.doesNotMatch(html, /owner-course-menu/);
});

test("learner card places progress after facts and keeps both actions in its footer", () => {
  const course: LibraryCourse = { id: "both", slug: "both", title: "Design", description: "Parcours suivi", domain: "Design", status: "published", moduleCount: 2, lessonCount: 5, durationMinutes: 90, lessonSlug: "start", enrolled: true, isOwner: true, percentage: 40, completedCount: 2 };
  const html = renderToStaticMarkup(createElement(PersonalCourseCard, { course, relations: ["learn", "create"], action: createElement("a", { href: "/learn" }, "Continuer"), secondaryAction: createElement("a", { href: "/manage" }, "Gérer") }));
  assert.ok(html.indexOf("2 modules") < html.indexOf("Progression : 40 %"));
  assert.ok(html.indexOf("Progression : 40 %") < html.indexOf('class="personal-course-card__actions"'));
  assert.match(html, /<div class="personal-course-card__actions"><div><a href="\/learn">Continuer<\/a><a href="\/manage">Gérer<\/a><\/div><\/div>/);
});
