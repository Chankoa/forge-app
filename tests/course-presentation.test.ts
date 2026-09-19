import assert from "node:assert/strict";
import test from "node:test";
import { clampProgress, courseRelations, hasCourseCover } from "../lib/courses/presentation";

test("course relations remain truthful and ordered", () => {
  assert.deepEqual(courseRelations(false, false), []);
  assert.deepEqual(courseRelations(true, false), ["learn"]);
  assert.deepEqual(courseRelations(false, true), ["create"]);
  assert.deepEqual(courseRelations(true, true), ["learn", "create"]);
});

test("progress presentation clamps external values", () => {
  assert.equal(clampProgress(-4), 0); assert.equal(clampProgress(67.4), 67); assert.equal(clampProgress(130), 100);
});

test("cover fallback is used until a non-empty URL exists", () => {
  assert.equal(hasCourseCover({}), false); assert.equal(hasCourseCover({ coverUrl: " " }), false); assert.equal(hasCourseCover({ coverUrl: "https://example.test/cover.png" }), true);
});
