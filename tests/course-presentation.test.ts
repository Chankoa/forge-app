import assert from "node:assert/strict";
import test from "node:test";
import { canShowOwnerDelete, clampProgress, courseCardAction, courseRelations, hasCourseCover } from "../lib/courses/presentation";

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

test("library card actions reflect progress and ownership", () => {
  assert.equal(courseCardAction({ isOwner: false, enrolled: true, percentage: 0, hasLesson: true }), "start");
  assert.equal(courseCardAction({ isOwner: false, enrolled: true, percentage: 42, hasLesson: true }), "continue");
  assert.equal(courseCardAction({ isOwner: false, enrolled: true, percentage: 100, hasLesson: true }), "review");
  assert.equal(courseCardAction({ isOwner: true, enrolled: false, percentage: 0, hasLesson: true }), "manage");
  assert.equal(courseCardAction({ isOwner: true, enrolled: true, percentage: 52, hasLesson: true }), "manage");
});
test("delete action is owner-only at presentation boundary", () => { assert.equal(canShowOwnerDelete(false), false); assert.equal(canShowOwnerDelete(true), true); });
