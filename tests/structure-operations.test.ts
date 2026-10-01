import assert from "node:assert/strict";
import test from "node:test";
import { adjacentSwap, courseDeletePreflight, emptyModuleBlocker, inlineRenameKey, nextDisplayOrder } from "../lib/courses/structure-operations";
import { getPublicationReadiness } from "../lib/courses/publication";
import { resolveContinueLessonId } from "../lib/learning/progress";

const rows = [{ id: "a", display_order: 0 }, { id: "b", display_order: 1 }, { id: "c", display_order: 2 }];

test("module and within-module lesson reordering swaps adjacent positions only", () => {
  assert.deepEqual(adjacentSwap(rows, "b", "up"), { current: rows[1], neighbor: rows[0] });
  assert.deepEqual(adjacentSwap(rows, "b", "down"), { current: rows[1], neighbor: rows[2] });
  assert.throws(() => adjacentSwap(rows, "a", "up"), /pas possible/);
  assert.throws(() => adjacentSwap(rows, "missing", "down"), /pas possible/);
  assert.throws(() => adjacentSwap(rows, "b", "sideways" as "up"), /invalide/);
  assert.throws(() => adjacentSwap([{ id: "a", display_order: 0 }, { id: "b", display_order: 0 }], "a", "down"), /incohérent/);
});
test("new modules and lessons append after the highest persisted order, even with gaps", () => {
  assert.equal(nextDisplayOrder(null), 0);
  assert.equal(nextDisplayOrder([{ display_order: 0 }, { display_order: 4 }]), 5);
});

test("only empty modules with no linked resources pass the removal guard", () => {
  assert.equal(emptyModuleBlocker(0, 0), null);
  assert.equal(emptyModuleBlocker(2, 0), "Déplacez d’abord les leçons de ce module.");
  assert.equal(emptyModuleBlocker(0, 1), "Détachez d’abord les ressources de ce module.");
  assert.match(emptyModuleBlocker(null, 0) ?? "", /vérifiées/);
});

test("inline rename distinguishes Enter, Escape and ordinary typing", () => {
  assert.equal(inlineRenameKey("Enter"), "save");
  assert.equal(inlineRenameKey("Escape"), "cancel");
  assert.equal(inlineRenameKey("a"), null);
});

test("course deletion preflight accepts only an empty verified draft", () => {
  const empty = { enrollments: 0, lessonProgress: 0, memberships: 0, sources: 0, resources: 0, provenance: 0 };
  assert.deepEqual(courseDeletePreflight("draft", empty), { disposable: true, blockers: [] });
  assert.equal(courseDeletePreflight("published", empty).disposable, false);
  for (const key of Object.keys(empty) as Array<keyof typeof empty>) {
    const withDependency = { ...empty, [key]: 1 };
    assert.equal(courseDeletePreflight("draft", withDependency).disposable, false, key);
  }
  assert.equal(courseDeletePreflight("draft", { ...empty, sources: null }).disposable, false);
});

test("reordering changes sequence without changing lesson identity, progress or readiness", () => {
  const lesson = { id: "lesson", slug: "same-url", title: "Lesson", description: null, content: "# Content", objectives: [], durationMinutes: null, contentType: "reading", publishingStatus: "published", status: "not-started" as const };
  const course = { id: "course", slug: "same-course", title: "Course", description: "Course", subtitle: null, domain: null, domainId: null, status: "published", visibility: "public", durationMinutes: null, outline: [{ id: "module-a", moduleTitle: "A", lessons: [lesson] }, { id: "module-b", moduleTitle: "B", lessons: [] }] };
  const before = getPublicationReadiness(course);
  const after = { ...course, outline: [course.outline[1], course.outline[0]] };
  assert.deepEqual(getPublicationReadiness(after), before);
  assert.equal(resolveContinueLessonId(after.outline, [], lesson.id), lesson.id);
  assert.equal(after.outline[1].lessons[0].slug, "same-url");
});
