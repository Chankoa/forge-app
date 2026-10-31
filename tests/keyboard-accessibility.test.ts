import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("course and lesson cockpit tabs expose their active panels and roving keyboard navigation", () => {
  const course = read("components/authoring/CourseEditor.tsx");
  const lesson = read("components/authoring/LessonEditor.tsx");

  for (const source of [course, lesson]) {
    assert.match(source, /role="tablist"/);
    assert.match(source, /aria-controls=\{`(?:course|lesson)-panel-\$\{item(?:\.id)?\}`\}/);
    assert.match(source, /role="tabpanel"/);
    assert.match(source, /aria-labelledby=\{`(?:course|lesson)-tab-\$\{tab\}`\}/);
    assert.match(source, /onKeyDown=\{\(event\) => \{ if \(moveTab\(index, event\.key\)\) event\.preventDefault\(\); \}\}/);
  }
});

test("library and discussion controls remain native filter button groups, not incomplete tab widgets", () => {
  const library = read("components/library/LibraryView.tsx");
  const discussion = read("components/course/CourseDiscussion.tsx");

  for (const source of [library, discussion]) {
    assert.match(source, /role="group"/);
    assert.match(source, /aria-pressed=/);
    assert.doesNotMatch(source, /role="tablist"/);
    assert.doesNotMatch(source, /role="tab"/);
  }
});

test("native details controls do not claim a menu pattern they do not implement", () => {
  const lesson = read("components/authoring/LessonEditor.tsx");

  assert.match(lesson, /event\.key === "Escape"/);
  assert.doesNotMatch(lesson, /role="menu"|role="menuitem"/);
});

test("course overflow menu names and controls its popup, then moves focus with menu keys", () => {
  const menu = read("components/course/OwnerCourseMenu.tsx");

  assert.match(menu, /aria-controls=\{open \? menuId : undefined\}/);
  assert.match(menu, /aria-haspopup="menu"/);
  assert.match(menu, /querySelector<HTMLElement>\('\[role="menuitem"\]'\)\?\.focus\(\)/);
  assert.match(menu, /event\.key === "ArrowDown"/);
  assert.match(menu, /onKeyDown=\{moveFocus\}/);
  assert.match(menu, /event\.key === "Escape"/);
});

test("course share dialog is controlled by its trigger and moves focus into the popup", () => {
  const share = read("components/course/CourseShareButton.tsx");

  assert.match(share, /aria-controls=\{open \? popoverId : undefined\}/);
  assert.match(share, /aria-haspopup="dialog"/);
  assert.match(share, /querySelector<HTMLElement>\('button:not\(:disabled\), a\[href\]'\)\?\.focus\(\)/);
  assert.match(share, /event\.key === "Escape"\) close\(true\)/);
});
