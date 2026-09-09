import assert from "node:assert/strict";
import test from "node:test";
import { progressPercentage, resolveContinueLessonId } from "../lib/learning/progress";

const outline = [{ id: "module-1", moduleTitle: "Module", lessons: [
  { id: "lesson-1", slug: "one", title: "One", description: null, content: null, objectives: [], durationMinutes: null, contentType: "reading", publishingStatus: "draft", status: "not-started" as const },
  { id: "lesson-2", slug: "two", title: "Two", description: null, content: null, objectives: [], durationMinutes: null, contentType: "reading", publishingStatus: "draft", status: "not-started" as const },
] }];

test("resumes the current incomplete lesson", () => assert.equal(resolveContinueLessonId(outline, [], "lesson-2"), "lesson-2"));
test("starts with the first lesson without progress", () => assert.equal(resolveContinueLessonId(outline, [], null), "lesson-1"));
test("chooses the first incomplete lesson after completed work", () => assert.equal(resolveContinueLessonId(outline, [{ lessonId: "lesson-1", completed: true, updatedAt: "2026-09-09T00:00:00Z" }], null), "lesson-2"));
test("returns the first lesson when all lessons are completed", () => assert.equal(resolveContinueLessonId(outline, [{ lessonId: "lesson-1", completed: true, updatedAt: "2026-09-09T00:00:00Z" }, { lessonId: "lesson-2", completed: true, updatedAt: "2026-09-09T00:00:00Z" }], null), "lesson-1"));
test("calculates whole course progress", () => assert.equal(progressPercentage(4, new Set(["a", "b", "c"])), 75));