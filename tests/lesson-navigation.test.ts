import assert from "node:assert/strict";
import test from "node:test";
import type { CourseLesson, CourseOutline } from "../lib/courses/contracts";
import { getLessonNavigation } from "../lib/courses/lesson-navigation";

const lesson = (id: string): CourseLesson => ({ id, slug: id, title: id, description: null, content: null, objectives: [], durationMinutes: null, contentType: "reading", publishingStatus: "published", status: "not-started" });
const outline: CourseOutline = [
  { id: "a", moduleTitle: "First", lessons: [lesson("one"), lesson("two")] },
  { id: "b", moduleTitle: "Second", lessons: [lesson("three")] },
];

test("lesson navigation crosses module boundaries and retains the selected module context", () => {
  const result = getLessonNavigation(outline, "two");
  assert.equal(result?.previous?.slug, "one");
  assert.equal(result?.next?.slug, "three");
  assert.equal(result?.moduleTitle, "First");
  assert.equal(result?.lessonNumber, 2);
  assert.equal(result?.position, 2);
  assert.equal(result?.total, 3);
});

test("lesson navigation omits unavailable neighbours and rejects an unknown selection", () => {
  assert.equal(getLessonNavigation(outline, "one")?.previous, undefined);
  assert.equal(getLessonNavigation(outline, "three")?.next, undefined);
  assert.equal(getLessonNavigation(outline, "missing"), null);
});
