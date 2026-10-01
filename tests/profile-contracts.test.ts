import assert from "node:assert/strict";
import test from "node:test";
import { profileNameSchema } from "../lib/profiles/profile-contracts";
import { profileCourseSections, publicAuthorDomains } from "../lib/profiles/profile-projections";

const courses = [
  { isOwner: true, course: { status: "draft", visibility: "private", domain: "Cuisine" }, state: { enrollment: null } },
  { isOwner: true, course: { status: "published", visibility: "public", domain: "Cuisine" }, state: { enrollment: null } },
  { isOwner: true, course: { status: "archived", visibility: "private", domain: "Web" }, state: { enrollment: null } },
  { isOwner: false, course: { status: "published", visibility: "public", domain: "Design" }, state: { enrollment: { id: "enrollment" } } },
];

test("profile name validation accepts a bounded display name only", () => {
  assert.equal(profileNameSchema.safeParse({ name: "Amina Diallo" }).success, true);
  assert.equal(profileNameSchema.safeParse({ name: " " }).success, false);
  assert.equal(profileNameSchema.safeParse({ name: "x".repeat(121) }).success, false);
  assert.equal(profileNameSchema.safeParse({ name: "Amina", email: "private@example.test" }).success, true);
});

test("self profile keeps authored lifecycle and learning projections private", () => {
  const sections = profileCourseSections(courses);
  assert.deepEqual(sections.authored.map((item) => item.course.status), ["draft", "published", "archived"]);
  assert.equal(sections.learning.length, 1);
  assert.deepEqual(publicAuthorDomains(courses), ["Cuisine"]);
});