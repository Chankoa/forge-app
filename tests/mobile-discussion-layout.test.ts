import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync("styles/globals.css", "utf8");
const shell = readFileSync("components/shell/AppShell.tsx", "utf8");

test("mobile discussion enforces container shrinkage instead of hiding page overflow", () => {
  for (const selector of [".course-discussion", ".discussion-message__content", ".discussion-composer", ".discussion-edit"]) {
    const start = css.lastIndexOf(selector);
    assert.ok(start >= 0, `${selector} has a mobile rule`);
  }
  const mobileContainment = css.slice(css.lastIndexOf("/* Mobile discussion containment"));
  assert.match(mobileContainment, /\.course-discussion,[\s\S]{0,600}min-width: 0/);
  assert.match(mobileContainment, /\.discussion-message__content[\s\S]{0,500}overflow-wrap: anywhere/);
  assert.match(css, /\.discussion-composer textarea,[\s\S]{0,300}width: 100%/);
  assert.match(css, /\.discussion-composer__footer[\s\S]{0,200}grid-template-columns: minmax\(0, 1fr\)/);
  assert.doesNotMatch(css, /html, body\s*\{[^}]*overflow-x:\s*hidden/);
});

test("mobile bottom navigation hides classroom structurally while desktop link remains rendered", () => {
  assert.match(shell, /\["\/app\/classroom", "Classroom"/);
  assert.match(css, /\.app-sidebar \.nav a\[href="\/app\/classroom"\]\s*\{\s*display: none/);
  assert.match(css, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /padding-bottom: calc\(84px \+ env\(safe-area-inset-bottom\)\)/);
});
