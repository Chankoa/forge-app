import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LessonEmptyContent } from "../components/authoring/LessonEmptyContent";

test("empty lesson affordance offers Forge generation and manual drafting", () => {
  const html = renderToStaticMarkup(createElement(LessonEmptyContent, { onStartWriting() {} }));
  assert.match(html, /Commencez le contenu de cette leçon/);
  assert.match(html, /Générer avec Forge/);
  assert.match(html, /Commencer à rédiger/);
  assert.doesNotMatch(html, /Sauvegarder/);
});
