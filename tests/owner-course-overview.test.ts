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

test("owner overview keeps publication as a compact status with its dedicated destination", () => {
  const html = renderToStaticMarkup(createElement(OwnerCourseOverview, { course, readiness: getPublicationReadiness(course) }));
  assert.match(html, /À finaliser avant publication/);
  assert.match(html, /Voir la publication/);
  assert.match(html, /real-course\?mode=publication/);
  assert.doesNotMatch(html, /class="owner-overview__issue"/);
  assert.doesNotMatch(html, /durée estimée|Score de préparation|80 %/);
});

test("owner overview sends an empty course to its existing structure editor", () => {
  const empty = { ...course, outline: [] };
  const html = renderToStaticMarkup(createElement(OwnerCourseOverview, { course: empty, readiness: getPublicationReadiness(empty) }));
  assert.match(html, /prérequis bloquant à compléter/);
  assert.match(html, /real-course\?mode=edit#cockpit-program-title/);
});

test("owner overview stays a synthesis and delegates management to local destinations", () => {
  const html = renderToStaticMarkup(createElement(OwnerCourseOverview, { course, readiness: getPublicationReadiness(course) }));
  assert.match(html, /Modules/);
  assert.match(html, /Collaboration/);
  assert.match(html, /mode=availability/);
  assert.match(html, /mode=remix/);
  assert.doesNotMatch(html, /Créer une copie indépendante/);
  assert.doesNotMatch(html, /Disponibilité du parcours/);
  assert.doesNotMatch(html, /Collaborateurs/);
  assert.doesNotMatch(html, />Apprenants</);
});
