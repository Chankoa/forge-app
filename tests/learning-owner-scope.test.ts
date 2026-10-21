import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const repository = readFileSync(new URL("../lib/courses/learning-repository.ts", import.meta.url), "utf8");
const explore = readFileSync(new URL("../lib/courses/explore-repository.ts", import.meta.url), "utf8");
const actions = readFileSync(new URL("../app/app/courses/actions.ts", import.meta.url), "utf8");
const overviewPage = readFileSync(new URL("../app/app/courses/[courseSlug]/page.tsx", import.meta.url), "utf8");
const lessonPage = readFileSync(new URL("../app/app/courses/[courseSlug]/lessons/[lessonSlug]/page.tsx", import.meta.url), "utf8");

test("owner access to other learners never substitutes their enrollment or progress for self-learning", () => {
  assert.match(repository, /from\("enrollments"\)\.select\("id,course_id,status,current_lesson_id"\)\.eq\("course_id", course\.id\)\.eq\("user_id", user\.id\)\.maybeSingle\(\)/);
  assert.match(repository, /from\("lesson_progress"\)\.select\("lesson_id,completed,updated_at"\)\.eq\("course_id", course\.id\)\.eq\("user_id", user\.id\)/);
  assert.match(repository, /from\("enrollments"\)\.select\("course_id"\)\.eq\("user_id", user\.id\)/);
  assert.match(explore, /from\("enrollments"\)\.select\("course_id"\)\.eq\("user_id", user\.id\)/);
});

test("completing a lesson uses only the acting learner's enrollment and progress", () => {
  assert.match(actions, /from\("enrollments"\)\.select\("id,started_at"\)\.eq\("course_id", courseId\)\.eq\("user_id", user\.id\)\.maybeSingle\(\)/);
  assert.match(actions, /from\("lesson_progress"\)\.select\("lesson_id,completed"\)\.eq\("course_id", courseId\)\.eq\("user_id", user\.id\)/);
  assert.match(actions, /\.eq\("id", enrollment\.id\)\.eq\("user_id", user\.id\)/);
  assert.match(actions, /course\.status !== "published"/);
});

test("unpublished learner routes keep enrollment but block course, lesson, and completion access", () => {
  assert.match(overviewPage, /courseVisibility: course\.visibility/);
  assert.match(overviewPage, /if \(!capabilities\.canView\)/);
  assert.match(lessonPage, /courseStatus: course\.status/);
  assert.match(lessonPage, /if \(!canAccessLessonMode\(capabilities, mode\)/);
  assert.match(lessonPage, /Votre inscription est conservée, mais ce parcours n’est pas publié/);
  assert.match(actions, /course\.status !== "published"/);
});
