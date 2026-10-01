import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceSections, WorkspaceContextRail } from "../components/workspace/WorkspaceDashboard";
import { selectWorkspaceCourses, workspaceCourseAction, type WorkspaceCourse } from "../lib/courses/workspace-view";

function item(id: string, isOwner: boolean, enrolled: boolean, percentage: number): WorkspaceCourse {
  return { isOwner, course: { id, slug: id, title: `Parcours ${id}`, description: null, subtitle: null, domain: "Design", domainId: null, status: "published", visibility: "public", outline: [{ id: `${id}-module`, moduleTitle: "Module réel", lessons: [{ id: `${id}-lesson`, slug: "lesson", title: "Leçon réelle", description: null, content: null, objectives: [], durationMinutes: 15, contentType: "reading", publishingStatus: "published", status: "not-started" }] }] }, state: { enrollment: enrolled ? { id: `${id}-enrollment`, courseId: id, status: "in-progress", currentLessonId: `${id}-lesson` } : null, progress: [], completedLessonIds: new Set(), percentage, continueLessonId: `${id}-lesson` } };
}

test("Workspace prioritizes an active learner course and keeps real lesson navigation", () => {
  const courses = [item("owner", true, false, 0), item("learner", false, true, 42)];
  const selection = selectWorkspaceCourses(courses);
  assert.equal(selection.continuing?.course.id, "learner");
  assert.deepEqual(workspaceCourseAction(selection.continuing!), { href: "/app/courses/learner/lessons/lesson", label: "Continuer" });
  assert.equal(selection.paths.length, 2);
});

test("Workspace sections follow Continue, My Paths, Learn and Forge links only to supported contexts", () => {
  const courses = [item("owner", true, false, 0), item("learner", false, true, 42)];
  const html = renderToStaticMarkup(createElement(WorkspaceSections, { courses }));
  assert.ok(html.indexOf("Continuer</h2>") < html.indexOf("Mes parcours</h2>"));
  assert.ok(html.indexOf("Mes parcours</h2>") < html.indexOf("Apprendre</h2>"));
  assert.match(html, /Module réel · Leçon réelle · 15 min/);
  const rail = renderToStaticMarkup(createElement(WorkspaceContextRail, { courses }));
  assert.match(rail, /href="\/app\/create"/);
  assert.match(rail, /\/app\/courses\/owner\/lessons\/lesson\?mode=edit/);
  assert.match(rail, /recommandations personnalisées ne sont pas encore disponibles/);
  assert.doesNotMatch(rail, /Trouver des ressources|score de recommandation/);
});

test("Workspace collaboration awareness shows owned pending requests with the course manager deep link", () => {
  const courses = [item("owned", true, false, 0)];
  const rail = renderToStaticMarkup(createElement(WorkspaceContextRail, { courses, collaboration: { ownerRequests: [{ requestId: "request-1", courseId: "owned", courseTitle: "Parcours owned", requesterName: "Chandra Neutral", createdAt: "2026-10-01T10:00:00.000Z" }, { requestId: "request-other", courseId: "not-listed", courseTitle: "Parcours hors scope", requesterName: "Autre", createdAt: "2026-10-01T10:00:00.000Z" }], acceptedRequests: [] } }));
  assert.match(rail, /Chandra Neutral souhaite collaborer sur/);
  assert.match(rail, /href="\/app\/courses\/owned\?mode=collaborators#collaboration-requests"/);
  assert.doesNotMatch(rail, /Parcours hors scope/);
});

test("Workspace collaboration awareness names accepted editor and viewer roles and disappears when empty", () => {
  const courses = [item("editor-course", false, true, 0), item("viewer-course", false, true, 0)];
  const rail = renderToStaticMarkup(createElement(WorkspaceContextRail, { courses, collaboration: { ownerRequests: [], acceptedRequests: [{ courseId: "editor-course", courseTitle: "Parcours editor-course", role: "editor", ownerName: "Chandra Proton", resolvedAt: "2026-10-01T10:00:00.000Z" }, { courseId: "viewer-course", courseTitle: "Parcours viewer-course", role: "viewer", ownerName: null, resolvedAt: "2026-10-01T11:00:00.000Z" }] } }));
  assert.match(rail, /Vous êtes désormais Éditeur sur Parcours editor-course · Par Chandra Proton/);
  assert.match(rail, /Vous êtes désormais Lecteur sur Parcours viewer-course/);
  assert.match(rail, /href="\/app\/courses\/editor-course"/);
  const emptyRail = renderToStaticMarkup(createElement(WorkspaceContextRail, { courses }));
  assert.doesNotMatch(emptyRail, /workspace-collaboration-title|>Collaboration</);
});
