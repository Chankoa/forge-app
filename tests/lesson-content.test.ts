import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LessonContent, isSafeLessonLink } from "../components/learning/LessonContent";

const lesson = { id: "lesson-1", slug: "lesson-1", title: "Leçon", description: null, objectives: [], durationMinutes: null, contentType: "reading", publishingStatus: "draft", status: "not-started" as const };

test("lesson Markdown renders headings, fenced code, and safe links without Markdown syntax", () => {
  const html = renderToStaticMarkup(createElement(LessonContent, { lesson: { ...lesson, content: "## Étape\n\n[Documentation](https://example.com/docs)\n\n```ts\nconst ready = true;\n```" } }));
  assert.match(html, /<h2>Étape<\/h2>/);
  assert.match(html, /href="https:\/\/example\.com\/docs"/);
  assert.match(html, /<pre><code>const ready = true;<\/code><\/pre>/);
  assert.doesNotMatch(html, /\[Documentation\]\(/);
});

test("lesson Markdown never turns an unsafe link into a learner navigation target", () => {
  assert.equal(isSafeLessonLink("javascript:alert(1)"), false);
  const html = renderToStaticMarkup(createElement(LessonContent, { lesson: { ...lesson, content: "[Ne pas ouvrir](javascript:alert(1))" } }));
  assert.doesNotMatch(html, /href=/);
  assert.match(html, /Ne pas ouvrir/);
});
