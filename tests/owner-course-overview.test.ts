import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OwnerCourseOverview } from "../components/course/OwnerCourseOverview";
import { getPublicationReadiness } from "../lib/courses/publication";
import type { CourseDetail } from "../lib/courses/contracts";

const course: CourseDetail = {
  id: "course-1", slug: "real-course", title: "A real course", description: "Description", domain: "Arts", domainId: "domain-1", subtitle: null,
  status: "draft", visibility: "private", outline: [{ id: "module-1", moduleTitle: "First module", lessons: [{
    id: "lesson-1", slug: "first-lesson", title: "First lesson", description: null, content: "", objectives: [], durationMinutes: null,
    contentType: "text", publishingStatus: "draft", status: "not-started",
  }] }],
};

test("owner overview links a real readiness recommendation to the affected lesson without inventing duration or score", () => {
  const html = renderToStaticMarkup(createElement(OwnerCourseOverview, { course, readiness: getPublicationReadiness(course) }));
  assert.match(html, /Ajoutez du contenu aux leçons/);
  assert.match(html, /\/app\/courses\/real-course\/lessons\/first-lesson\?mode=edit/);
  assert.doesNotMatch(html, /durée estimée|Score de préparation|80 %/);
});

test("owner overview sends an empty course to its existing structure editor", () => {
  const empty = { ...course, outline: [] };
  const html = renderToStaticMarkup(createElement(OwnerCourseOverview, { course: empty, readiness: getPublicationReadiness(empty) }));
  assert.match(html, /Ajoutez au moins une leçon avant de publier/);
  assert.match(html, /real-course\?mode=edit#cockpit-program-title/);
});

test("owner cockpit orders structure, publication, availability, collaborators, then Classroom", () => {
  const html = renderToStaticMarkup(createElement(OwnerCourseOverview, { course, readiness: getPublicationReadiness(course) }));
  const sections = ["Modules", "À finaliser avant publication", "Disponibilité du parcours", "Collaborateurs", "Apprenants"];
  const positions = sections.map((section) => html.indexOf(section));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((left, right) => left - right), positions);
  assert.match(html, /href="\/app\/courses\/real-course\/classroom"[^>]*>Voir le Classroom/);
});
