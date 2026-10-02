import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LearnerProgressDetail } from "../components/course/LearnerProgressDetail";
import { resolveCourseCapabilities } from "../lib/capabilities/course-capabilities";
import { classroomLearnerDetailFromRows } from "../lib/courses/classroom";
import { courseClassroomLearnerPath } from "../lib/courses/context-navigation";

const outline = [
  { id: "module-a", moduleTitle: "Fondations", lessons: [{ id: "lesson-a", slug: "a", title: "Première leçon", description: null, content: null, objectives: [], durationMinutes: 12, contentType: "reading", publishingStatus: "published", status: "not-started" as const }, { id: "lesson-b", slug: "b", title: "Deuxième leçon", description: null, content: null, objectives: [], durationMinutes: null, contentType: "reading", publishingStatus: "published", status: "not-started" as const }] },
  { id: "module-b", moduleTitle: "Pratique", lessons: [{ id: "lesson-c", slug: "c", title: "Troisième leçon", description: null, content: null, objectives: [], durationMinutes: 8, contentType: "reading", publishingStatus: "published", status: "not-started" as const }] },
];
const repository = readFileSync(new URL("../lib/courses/classroom-repository.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/app/courses/[courseSlug]/classroom/learners/[learnerId]/page.tsx", import.meta.url), "utf8");

test("learner detail uses current-course progress for totals, modules, and lesson states", () => {
  const detail = classroomLearnerDetailFromRows(outline, { user_id: "learner", status: "in-progress", current_lesson_id: "lesson-b" }, [{ user_id: "learner", lesson_id: "lesson-a", completed: true }, { user_id: "learner", lesson_id: "outside", completed: true }], { id: "learner", name: "Aline Martin" });
  assert.deepEqual({ progress: detail.progress, completed: detail.completedLessons, total: detail.totalLessons, current: detail.currentLessonTitle }, { progress: 33, completed: 1, total: 3, current: "Deuxième leçon" });
  assert.deepEqual(detail.modules.map((module) => ({ title: module.title, completed: module.completedLessons, total: module.totalLessons, progress: module.progress })), [{ title: "Fondations", completed: 1, total: 2, progress: 50 }, { title: "Pratique", completed: 0, total: 1, progress: 0 }]);
  assert.deepEqual(detail.modules.flatMap((module) => module.lessons.map((lesson) => lesson.state)), ["completed", "current", "todo"]);
});

test("learner detail handles zero lessons, zero progress, completion, and an invalid current lesson safely", () => {
  const empty = classroomLearnerDetailFromRows([], { user_id: "learner", status: "not-started", current_lesson_id: "missing" }, [], { id: "learner", name: null });
  assert.equal(empty.progress, 0);
  assert.equal(empty.currentLessonTitle, null);
  const completed = classroomLearnerDetailFromRows(outline, { user_id: "learner", status: "completed", current_lesson_id: "missing" }, outline.flatMap((module) => module.lessons.map((lesson) => ({ user_id: "learner", lesson_id: lesson.id, completed: true }))), { id: "learner", name: "Aline" });
  assert.equal(completed.progress, 100);
  assert.equal(completed.currentLessonTitle, null);
});

test("learner detail is owner-only, enrollment-scoped, and selects no private profile data", () => {
  const owner = resolveCourseCapabilities({ isOwner: true, isEnrolled: false, courseStatus: "archived" });
  const editor = resolveCourseCapabilities({ isOwner: false, isEnrolled: false, courseStatus: "published", membershipRole: "editor", membershipStatus: "active" });
  const viewer = resolveCourseCapabilities({ isOwner: false, isEnrolled: false, courseStatus: "published", membershipRole: "viewer", membershipStatus: "active" });
  const learner = resolveCourseCapabilities({ isOwner: false, isEnrolled: true, courseStatus: "published" });
  const unrelated = resolveCourseCapabilities({ isOwner: false, isEnrolled: false, courseStatus: "published" });
  assert.equal(owner.canViewClassroom, true);
  assert.equal(editor.canViewClassroom, false);
  assert.equal(viewer.canViewClassroom, false);
  assert.equal(learner.canViewClassroom, false);
  assert.equal(unrelated.canViewClassroom, false);
  assert.match(route, /!capabilities\.canViewClassroom/);
  assert.match(repository, /\.eq\("course_id", course\.id\)\.eq\("user_id", learnerId\)\.maybeSingle\(\)/);
  assert.match(repository, /select\("id,name"\)/);
  assert.doesNotMatch(repository, /email|notes|course_memberships|account_status/i);
});

test("learner detail renders only scoped learning information and returns to its Classroom", () => {
  const detail = classroomLearnerDetailFromRows(outline, { user_id: "learner", status: "in-progress", current_lesson_id: "lesson-b" }, [{ user_id: "learner", lesson_id: "lesson-a", completed: true }], { id: "learner", name: "Aline Martin" });
  const html = renderToStaticMarkup(createElement(LearnerProgressDetail, { courseSlug: "course", detail, archived: true }));
  assert.equal(courseClassroomLearnerPath("course", "learner"), "/app/courses/course/classroom/learners/learner");
  assert.match(html, /Retour au Classroom/);
  assert.match(html, /Parcours archivé : suivi historique en lecture seule/);
  assert.match(html, /Fondations.*50 %/);
  assert.match(html, /Terminé.*Première leçon/);
  assert.match(html, /En cours.*Deuxième leçon/);
  assert.match(html, /À faire.*Troisième leçon/);
  assert.doesNotMatch(html, /email|note|rôle|compte/i);
});

test("completed learner detail labels a retained current lesson as the last lesson", () => {
  const detail = classroomLearnerDetailFromRows(outline, { user_id: "learner", status: "completed", current_lesson_id: "lesson-b" }, outline.flatMap((module) => module.lessons.map((lesson) => ({ user_id: "learner", lesson_id: lesson.id, completed: true }))), { id: "learner", name: "Aline Martin" });
  const html = renderToStaticMarkup(createElement(LearnerProgressDetail, { courseSlug: "course", detail, archived: false }));
  assert.match(html, /Dernière leçon.*Deuxième leçon/);
  assert.doesNotMatch(html, /Leçon en cours.*Deuxième leçon/);
});