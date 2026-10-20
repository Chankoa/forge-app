import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { evaluateCourseDeletionEligibility, publicCourseSharePath } from "../lib/courses/course-management";

test("a draft can only be deleted by its owner when it has no enrollment or storage dependency", () => {
  assert.equal(evaluateCourseDeletionEligibility({ isOwner: true, status: "draft", enrollmentCount: 0, storageDependencyCount: 0 }).allowed, true);
  assert.equal(evaluateCourseDeletionEligibility({ isOwner: true, status: "draft", enrollmentCount: 1, storageDependencyCount: 0 }).blocker, "enrollments");
  assert.equal(evaluateCourseDeletionEligibility({ isOwner: true, status: "draft", enrollmentCount: 0, storageDependencyCount: 1 }).blocker, "storage-dependencies");
  assert.equal(evaluateCourseDeletionEligibility({ isOwner: true, status: "published", enrollmentCount: 0, storageDependencyCount: 0 }).blocker, "not-draft");
  assert.equal(evaluateCourseDeletionEligibility({ isOwner: false, status: "draft", enrollmentCount: 0, storageDependencyCount: 0 }).blocker, "not-owner");
});

test("only published public courses produce a canonical share link", () => {
  assert.equal(publicCourseSharePath({ slug: "course-a", status: "published", visibility: "public" }), "/courses/course-a");
  assert.equal(publicCourseSharePath({ slug: "course-a", status: "draft", visibility: "private" }), null);
  assert.equal(publicCourseSharePath({ slug: "course-a", status: "published", visibility: "private" }), null);
  assert.equal(publicCourseSharePath({ slug: "course-a", status: "archived", visibility: "public" }), null);
});

test("deletion revalidates enrollment and every storage-backed course surface on the server", () => {
  const source = `${readFileSync("app/app/create/actions.ts", "utf8")}\n${readFileSync("lib/courses/course-deletion-repository.ts", "utf8")}`;
  for (const table of ["enrollments", "course_media_resources", "resources", "course_sources"]) assert.match(source, new RegExp(`\\\"${table}\\\"`));
  assert.match(source, /cover_storage_path/);
  assert.match(source, /\.delete\(\)\.eq\("id", courseId\)\.eq\("teacher_id", user\.id\)\.eq\("status", "draft"\)/);
});

test("overview exposes domain editing without a domain-creation path", () => {
  const overview = readFileSync("components/course/OwnerCourseOverview.tsx", "utf8");
  const editor = readFileSync("components/authoring/CourseEditor.tsx", "utf8");
  assert.match(overview, /Modifier le domaine/);
  assert.match(editor, /course-domain-field/);
  assert.doesNotMatch(overview, /Créer un domaine/);
});

test("domain edit affordance reuses the existing select and save, with no new action", () => {
  const editor = readFileSync("components/authoring/CourseEditor.tsx", "utf8");
  assert.match(editor, /<label htmlFor="course-domain-select">Domaine<\/label>/);
  assert.match(editor, /draft\.domainId \? "Modifier le domaine" : "Choisir un domaine"/);
  assert.match(editor, /getElementById\("course-domain-select"\)\?\.focus\(\)/);
  assert.match(editor, /<select id="course-domain-select" name="domainId"/);
  assert.doesNotMatch(editor, /Créer un domaine/);
  assert.deepEqual(editor.match(/from "@\/app\/app\/create\/actions"/g)?.length, 1);
  assert.match(editor, /import \{ saveCourseMetadataAction \} from/);
});
