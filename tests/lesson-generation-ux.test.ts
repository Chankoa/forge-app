import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LessonEmptyContent } from "../components/authoring/LessonEmptyContent";

test("empty lesson affordance offers Forge generation and manual drafting", () => {
  const html = renderToStaticMarkup(createElement(LessonEmptyContent));
  assert.match(html, /Cette leçon n’a pas encore de contenu/);
  assert.match(html, /Générer le contenu avec Forge/);
  assert.match(html, /Rédiger manuellement/);
  assert.doesNotMatch(html, /Sauvegarder/);
});
