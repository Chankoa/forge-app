import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  assert.equal(selection.paths.length, 1);
});

test("Continue is a highlighted shared row with canonical identity order and shared progress", () => {
  const active = item("active", false, true, 42);
  active.course.author = { displayName: "Hakitano", initials: "H", avatarUrl: "https://example.com/hakitano.png" };
  active.course.owner = { id: "owner", displayName: "Hakitano" };
  const html = renderToStaticMarkup(createElement(WorkspaceSections, { courses: [active] }));
  const block = html.match(/<article class="course-presentation course-presentation--row workspace-dashboard__continue"[\s\S]*?<\/article>/)?.[0] ?? "";
  assert.match(block, /workspace-dashboard__continue-relation/);
  assert.match(block, /workspace-dashboard__continue-status/);
  assert.match(block, /workspace-dashboard__continue-progress/);
  assert.match(block, /workspace-dashboard__progress/);
  assert.match(block, /course-presentation__action--primary/);
  assert.ok(block.indexOf("Parcours active") < block.indexOf("Module réel · Leçon réelle · 15 min"));
  assert.ok(block.indexOf("Module réel · Leçon réelle · 15 min") < block.indexOf("Hakitano"));
  assert.match(block, />Continuer</);
});

test("Workspace sections reserve continuation for active work and keep each course in one section", () => {
  const courses = [item("owner", true, false, 0), item("learner", false, true, 42)];
  const html = renderToStaticMarkup(createElement(WorkspaceSections, { courses }));
  assert.ok(html.indexOf("Continuer</h2>") < html.indexOf("Mes parcours</h2>"));
  assert.doesNotMatch(html, />Apprendre<\/h2>/);
  assert.equal((html.match(/<article class="course-presentation course-presentation--row workspace-dashboard__path">/g) ?? []).length, 1);
  assert.match(html, /Module réel · Leçon réelle · 15 min/);
  const rail = renderToStaticMarkup(createElement(WorkspaceContextRail, { courses }));
  assert.match(rail, /href="\/app\/create"/);
  assert.match(rail, /\/app\/courses\/owner\/lessons\/lesson\?mode=edit/);
  assert.match(rail, /Parcours à explorer/);
  assert.match(rail, /Explorer tous les parcours/);
  assert.doesNotMatch(rail, /Trouver des ressources|score de recommandation/);
});

test("Workspace owns contextual search semantics in the shared topbar slot", () => {
  const source = readFileSync(new URL("../components/workspace/WorkspaceDashboard.tsx", import.meta.url), "utf8");
  assert.match(source, /useContextualTopbarSearch\(topbarSearch\)/);
  assert.match(source, /Rechercher dans mes parcours…/);
});

test("Workspace course rows keep owner identity and mixed learner-editor relationship", () => {
  const shared = item("shared", false, true, 0);
  const active = item("active", false, true, 42);
  shared.collaborationRole = "editor";
  shared.course.description = "Une description compacte";
  shared.course.author = { displayName: "Chandra Proton", initials: "CP", avatarUrl: "https://example.com/chandra.png" };
  shared.course.owner = { id: "other-owner", displayName: "Chandra Proton" };
  const html = renderToStaticMarkup(createElement(WorkspaceSections, { courses: [active, shared] }));
  assert.match(html, /Chandra Proton/);
  assert.match(html, /src="https:\/\/example.com\/chandra.png"/);
  assert.ok(html.indexOf("Une description compacte") < html.indexOf("Chandra Proton"));
  assert.match(html, /J’apprends/);
  assert.match(html, /J’édite/);
  assert.match(html, /workspace-dashboard__path-relation/);
  assert.match(html, /workspace-dashboard__path-status/);
  assert.match(html, /workspace-dashboard__path-progress/);
  assert.match(html, /course-presentation__action--secondary/);
  assert.doesNotMatch(html, /Je crée/);
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
