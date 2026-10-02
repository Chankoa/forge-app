import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GlobalClassroomLanding } from "../components/course/GlobalClassroomLanding";
import { globalClassroomOverviewFromRows } from "../lib/courses/classroom";

const outline = [{ id: "module", moduleTitle: "Module", lessons: [{ id: "lesson-a", slug: "a", title: "Leçon A", description: null, content: null, objectives: [], durationMinutes: null, contentType: "reading", publishingStatus: "published", status: "not-started" as const }, { id: "lesson-b", slug: "b", title: "Leçon B", description: null, content: null, objectives: [], durationMinutes: null, contentType: "reading", publishingStatus: "published", status: "not-started" as const }] }];
const repository = readFileSync(new URL("../lib/courses/classroom-repository.ts", import.meta.url), "utf8");
const globalRepository = repository.slice(repository.indexOf("export async function getGlobalClassroomOverview"));
const shell = readFileSync(new URL("../components/shell/AppShell.tsx", import.meta.url), "utf8");

test("global Classroom includes only supplied owned courses and reuses learner progress metrics", () => {
  const courses = [{ id: "current", slug: "current", title: "Alpha", status: "published", visibility: "public", outline }, { id: "archived", slug: "archived", title: "Zulu", status: "archived", visibility: "private", outline }, { id: "empty", slug: "empty", title: "Bravo", status: "draft", visibility: "private", outline: [] }];
  const overview = globalClassroomOverviewFromRows(courses, [{ course_id: "current", user_id: "zero", status: "not-started", current_lesson_id: null }, { course_id: "current", user_id: "complete", status: "completed", current_lesson_id: null }, { course_id: "archived", user_id: "archived-user", status: "in-progress", current_lesson_id: "lesson-b" }], [{ course_id: "current", user_id: "complete", lesson_id: "lesson-a", completed: true }, { course_id: "current", user_id: "complete", lesson_id: "lesson-b", completed: true }, { course_id: "current", user_id: "complete", lesson_id: "outside", completed: true }, { course_id: "archived", user_id: "archived-user", lesson_id: "lesson-a", completed: true }]);
  assert.deepEqual(overview.map(({ slug, totalLearners, averageProgress, completedLearners }) => ({ slug, totalLearners, averageProgress, completedLearners })), [{ slug: "current", totalLearners: 2, averageProgress: 50, completedLearners: 1 }, { slug: "empty", totalLearners: 0, averageProgress: null, completedLearners: 0 }, { slug: "archived", totalLearners: 1, averageProgress: 50, completedLearners: 0 }]);
  assert.equal(overview.find((course) => course.slug === "empty")?.averageProgress, null);
});

test("global Classroom rendering keeps empty and archived owned courses navigable without learner data", () => {
  const html = renderToStaticMarkup(createElement(GlobalClassroomLanding, { courses: [{ id: "archived", slug: "archived", title: "Parcours archivé", status: "archived", visibility: "private", totalLessons: 2, totalLearners: 0, averageProgress: null, completedLearners: 0 }] }));
  assert.match(html, /Parcours archivé/);
  assert.match(html, /Aucun apprenant inscrit/);
  assert.match(html, /href="\/app\/courses\/archived\/classroom"/);
  assert.doesNotMatch(html, /email|Aline|note|rôle|compte/i);
  const emptyHtml = renderToStaticMarkup(createElement(GlobalClassroomLanding, { courses: [] }));
  assert.match(emptyHtml, /dès que vous créez votre premier parcours/);
});

test("global Classroom repository scopes reads to canonical ownership and never selects learner profiles", () => {
  assert.match(globalRepository, /from\("courses"\)\.select\("id,slug,title,status,visibility"\)\.eq\("teacher_id", user\.id\)/);
  assert.match(globalRepository, /from\("enrollments"\)\.select\("course_id,user_id,status,current_lesson_id"\)\.in\("course_id", courseIds\)/);
  assert.match(globalRepository, /from\("lesson_progress"\)\.select\("course_id,user_id,lesson_id,completed"\)\.in\("course_id", courseIds\)/);
  assert.doesNotMatch(globalRepository, /getCourseClassroom\(course\)|from\("profiles"\)|email|notes|course_memberships/i);
});

test("global rail exposes Classroom and keeps it active for course-scoped Classroom routes", () => {
  assert.match(shell, /\["\/app\/classroom", "Classroom", GraduationCap\]/);
  assert.match(shell, /\^\\\/app\\\/courses\\\/\[\^\/\]\+\\\/classroom/);
});