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
