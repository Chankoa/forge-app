import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CourseClassroom } from "../components/course/CourseClassroom";
import { resolveCourseCapabilities } from "../lib/capabilities/course-capabilities";
import { classroomDataFromRows } from "../lib/courses/classroom";
import { getCourseContextLinks } from "../lib/courses/context-navigation";

const outline = [{ id: "module", moduleTitle: "Module", lessons: [{ id: "lesson-1", slug: "one", title: "Première leçon", description: null, content: null, objectives: [], durationMinutes: null, contentType: "reading", publishingStatus: "published", status: "not-started" as const }, { id: "lesson-2", slug: "two", title: "Deuxième leçon", description: null, content: null, objectives: [], durationMinutes: null, contentType: "reading", publishingStatus: "published", status: "not-started" as const }] }];
const courseRoute = readFileSync(new URL("../app/app/courses/[courseSlug]/page.tsx", import.meta.url), "utf8");
const classroomRoute = readFileSync(new URL("../app/app/courses/[courseSlug]/classroom/page.tsx", import.meta.url), "utf8");
const repository = readFileSync(new URL("../lib/courses/classroom-repository.ts", import.meta.url), "utf8");

test("Classroom progress uses current-course lessons, includes zero progress, and rounds the learner mean", () => {
  const data = classroomDataFromRows(outline, [{ user_id: "learner-a", status: "in-progress", current_lesson_id: "lesson-2" }, { user_id: "learner-b", status: "completed", current_lesson_id: "outside" }, { user_id: "learner-c", status: "not-started", current_lesson_id: null }], [{ user_id: "learner-a", lesson_id: "lesson-1", completed: true }, { user_id: "learner-a", lesson_id: "other-course", completed: true }, { user_id: "learner-b", lesson_id: "lesson-1", completed: true }, { user_id: "learner-b", lesson_id: "lesson-2", completed: true }], [{ id: "learner-a", name: "Aline Martin" }, { id: "learner-b", name: "Benoît Roy" }, { id: "learner-c", name: null }]);
  assert.deepEqual(data.learners.map(({ displayName, progress, completedLessons, currentLessonTitle, status }) => ({ displayName, progress, completedLessons, currentLessonTitle, status })), [{ displayName: "Apprenant Forge", progress: 0, completedLessons: 0, currentLessonTitle: null, status: "not-started" }, { displayName: "Aline Martin", progress: 50, completedLessons: 1, currentLessonTitle: "Deuxième leçon", status: "in-progress" }, { displayName: "Benoît Roy", progress: 100, completedLessons: 2, currentLessonTitle: null, status: "completed" }]);
  assert.equal(data.averageProgress, 50);
  assert.equal(data.completedLearners, 1);
});

test("Classroom returns zero progress for a course with no lessons", () => {
  const data = classroomDataFromRows([], [{ user_id: "learner", status: "not-started", current_lesson_id: null }], [{ user_id: "learner", lesson_id: "old", completed: true }], [{ id: "learner", name: "Nora" }]);
  assert.equal(data.learners[0]?.progress, 0);
  assert.equal(data.learners[0]?.completedLessons, 0);
  assert.equal(data.averageProgress, 0);
});

test("Classroom access is canonical-owner-only in capability, dedicated route, and navigation contracts", () => {
  const archivedOwner = resolveCourseCapabilities({ isOwner: true, isEnrolled: false, courseStatus: "archived" });
  const owner = resolveCourseCapabilities({ isOwner: true, isEnrolled: false, courseStatus: "published" });
  const editor = resolveCourseCapabilities({ isOwner: false, isEnrolled: false, courseStatus: "published", membershipRole: "editor", membershipStatus: "active" });
  const viewer = resolveCourseCapabilities({ isOwner: false, isEnrolled: false, courseStatus: "published", membershipRole: "viewer", membershipStatus: "active" });
  const learner = resolveCourseCapabilities({ isOwner: false, isEnrolled: true, courseStatus: "published" });
  const unrelated = resolveCourseCapabilities({ isOwner: false, isEnrolled: false, courseStatus: "published" });
  assert.equal(owner.canViewClassroom, true);
  assert.equal(archivedOwner.canViewClassroom, true);
  assert.equal(editor.canViewClassroom, false);
  assert.equal(viewer.canViewClassroom, false);
  assert.equal(learner.canViewClassroom, false);
  assert.equal(unrelated.canViewClassroom, false);
  assert.equal(getCourseContextLinks("course", owner).some((link) => link.label === "Classroom"), true);
  assert.equal(getCourseContextLinks("course", editor).some((link) => link.label === "Classroom"), false);
  assert.equal(getCourseContextLinks("course", viewer).some((link) => link.label === "Classroom"), false);
  assert.equal(getCourseContextLinks("course", learner).some((link) => link.label === "Classroom"), false);
  assert.equal(getCourseContextLinks("course", unrelated).some((link) => link.label === "Classroom"), false);
  assert.match(classroomRoute, /!capabilities\.canViewClassroom/);
  assert.match(classroomRoute, /getCourseClassroom\(course\)/);
  assert.match(classroomRoute, /course\.status === "archived"/);
});

test("legacy Classroom mode redirects to the dedicated course-scoped route", () => {
  assert.match(courseRoute, /requestedMode === "classroom"\) redirect\(`\/app\/courses\/\$\{courseSlug\}\/classroom`\)/);
  assert.doesNotMatch(courseRoute, /getCourseClassroom|CourseClassroom/);
});

test("Classroom rendering exposes operational learner progress only", () => {
  const html = renderToStaticMarkup(createElement(CourseClassroom, { archived: true, courseSlug: "course", data: { totalLearners: 1, averageProgress: 50, completedLearners: 0, learners: [{ id: "learner-a", displayName: "Aline Martin", initials: "AM", progress: 50, completedLessons: 1, totalLessons: 2, currentLessonTitle: "Deuxième leçon", status: "in-progress" }] } }));
  assert.match(html, /Parcours archivé.*lecture seule/);
  assert.match(html, />Synthèse</);
  assert.match(html, /Aline Martin/);
  assert.match(html, /1 \/ 2 leçons/);
  assert.doesNotMatch(html, /Activité|Messages|Bientôt/);
  assert.doesNotMatch(html, /email|note|role|historique/i);
  assert.match(repository, /from\("enrollments"\)/);
  assert.match(repository, /from\("lesson_progress"\)/);
  assert.doesNotMatch(repository, /from\("notes"\)|course_memberships/);
});