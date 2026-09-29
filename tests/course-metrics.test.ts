import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CourseMetrics } from "../components/course/CourseMetrics";
import { knownCourseDuration } from "../lib/courses/presentation";

test("unknown lesson durations are omitted instead of presented as zero minutes", () => {
  assert.equal(knownCourseDuration({ durationMinutes: null, outline: [{ lessons: [{ durationMinutes: 12 }, { durationMinutes: null }] }] }), null);
  const html = renderToStaticMarkup(createElement(CourseMetrics, { modules: 1, lessons: 2, durationMinutes: null, progress: 42 }));
  assert.doesNotMatch(html, /Durée estimée|0 min/);
});

test("learner progress has one visible value and an accessible progress control", () => {
  const html = renderToStaticMarkup(createElement(CourseMetrics, { modules: 2, lessons: 5, durationMinutes: 35, progress: 42 }));
  assert.equal((html.match(/42 %/g) ?? []).length, 1);
  assert.match(html, /<dt>Progression<\/dt><dd>42 %<\/dd>/);
  assert.match(html, /aria-label="Progression du parcours"/);
});
