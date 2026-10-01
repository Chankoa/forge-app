import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canAccessLessonMode, resolveCourseCapabilities } from "../lib/capabilities/course-capabilities";
import { assertForgeAccess } from "../lib/forge/context";

test("active editor is authorized for Forge authoring while inactive memberships are rejected immediately", () => {
  assert.doesNotThrow(() => assertForgeAccess("edit", false, false, "archived", "editor", "active"));
  for (const status of ["invited", "suspended", "revoked"] as const) assert.throws(() => assertForgeAccess("edit", false, false, "draft", "editor", status));
  assert.throws(() => assertForgeAccess("edit", false, false, "draft", "viewer", "active"));
});

test("viewer preview does not imply learner progress or authoring", () => {
  const viewer = resolveCourseCapabilities({ isOwner: false, isEnrolled: false, courseStatus: "archived", membershipRole: "viewer", membershipStatus: "active" });
  assert.equal(canAccessLessonMode(viewer, undefined), false);
  assert.equal(canAccessLessonMode(viewer, "preview"), true);
  assert.equal(canAccessLessonMode(viewer, "edit"), false);
  assert.equal(viewer.canLearn, false);
});

test("collaboration migration scopes relational RLS to active editor/viewer and leaves Storage owner-only", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20261001000000_i2_editor_viewer_course_access.sql", import.meta.url), "utf8");
  assert.match(migration, /status = 'active'/);
  assert.match(migration, /array\['editor', 'viewer'\]/);
  assert.match(migration, /array\['editor'\]/);
  assert.match(migration, /Editors may only update course metadata/);
  assert.match(migration, /Editors may only update lesson content and order/);
  assert.doesNotMatch(migration, /on public\.course_sources|on public\.resources|on storage\.objects/);
  assert.doesNotMatch(migration, /array\['contributor'|array\['participant'/);
});