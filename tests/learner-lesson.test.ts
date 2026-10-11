import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LearnerLesson } from "../components/learning/LearnerLesson";

const lesson = { id: "lesson-1", slug: "lesson-1", title: "Leçon actuelle", description: null, objectives: [], durationMinutes: 12, contentType: "reading", publishingStatus: "published", status: "not-started" as const, content: "## Contenu" };
const adjacent = { ...lesson, id: "lesson-2", slug: "lesson-2", title: "Leçon suivante" };

test("learner lesson keeps content primary and exposes adjacent navigation", () => {
  const html = renderToStaticMarkup(createElement(LearnerLesson, {
    courseId: "course-1", courseSlug: "course", lesson, moduleTitle: "Module", moduleNumber: 1, lessonNumber: 2,
    position: 2, total: 3, previous: { ...adjacent, id: "lesson-0", slug: "lesson-0", title: "Leçon précédente" },
    next: adjacent, preview: true, completed: false,
  }));
  assert.match(html, /class="learner-lesson"/);
  assert.match(html, /Leçon précédente/);
  assert.match(html, /Leçon suivante/);
  assert.match(html, /mode=preview/);
});
