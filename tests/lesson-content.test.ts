import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LessonContent, LessonMarkdown, isSafeLessonLink } from "../components/learning/LessonContent";

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

test("learner content renders a first-level Markdown heading, objectives, and inline code semantically", () => {
  const html = renderToStaticMarkup(createElement(LessonContent, { lesson: { ...lesson, objectives: ["Comprendre la structure"], content: "# Introduction\n\nUtilisez `const` dans cet exemple." } }));
  assert.match(html, /<h2>Introduction<\/h2>/);
  assert.match(html, /class="lesson-objectives"/);
  assert.match(html, /<code>const<\/code>/);
  assert.doesNotMatch(html, /<p>\s*<span># Introduction/);
});

test("shared author and learner renderer distinguishes supported editorial structures", () => {
  const content = "## Section\n\n### Étape\n\nUn `terme` et [une source](https://example.com).\n\n- un\n- deux\n\n1. premier\n2. second\n\n> [!NOTE]\n> À vérifier\n\n> Une citation\n\n```ts\nconst a = 1;\n```\n\n---";
  const html = renderToStaticMarkup(createElement(LessonMarkdown, { content }));
  assert.match(html, /<h2>Section<\/h2>/);
  assert.match(html, /<h3>Étape<\/h3>/);
  assert.match(html, /<ul><li>un<\/li><li>deux<\/li><\/ul>/);
  assert.match(html, /<ol><li>premier<\/li><li>second<\/li><\/ol>/);
  assert.match(html, /class="lesson-callout"/);
  assert.match(html, /<blockquote>/);
  assert.match(html, /<pre><code>const a = 1;<\/code><\/pre>/);
  assert.match(html, /<code>terme<\/code>/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.match(html, /<hr\/>/);
  assert.doesNotMatch(html, /<script/);
});
