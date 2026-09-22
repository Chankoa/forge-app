import assert from "node:assert/strict";
import test from "node:test";
import { canShowOwnerDelete, clampProgress, courseCardAction, courseRelations, domainLabel, domainNameFromRelation, hasCourseCover, matchesCourseRelation } from "../lib/courses/presentation";

test("domain label uses the real domain or honest fallback", () => {
  assert.equal(domainLabel("Cuisine"), "Cuisine");
  assert.equal(domainLabel("  "), "Sans domaine");
  assert.equal(domainLabel(null), "Sans domaine");
});

test("domain relation supports Supabase many-to-one and legacy array shapes", () => {
  assert.equal(domainNameFromRelation({ name: "Création web" }), "Création web");
  assert.equal(domainNameFromRelation([{ name: "Cuisine" }]), "Cuisine");
  assert.equal(domainNameFromRelation(null), null);
});

test("course relations remain truthful and ordered", () => {
  assert.deepEqual(courseRelations(false, false), []);
  assert.deepEqual(courseRelations(true, false), ["learn"]);
  assert.deepEqual(courseRelations(false, true), ["create"]);
  assert.deepEqual(courseRelations(true, true), ["learn", "create"]);
});

test("personal library filters include dual-relation courses once", () => {
  const courses = [{ id: "learn", enrolled: true, owner: false }, { id: "create", enrolled: false, owner: true }, { id: "both", enrolled: true, owner: true }];
  assert.deepEqual(courses.filter((course) => matchesCourseRelation("all", course.enrolled, course.owner)).map((course) => course.id), ["learn", "create", "both"]);
  assert.deepEqual(courses.filter((course) => matchesCourseRelation("learn", course.enrolled, course.owner)).map((course) => course.id), ["learn", "both"]);
  assert.deepEqual(courses.filter((course) => matchesCourseRelation("create", course.enrolled, course.owner)).map((course) => course.id), ["create", "both"]);
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
