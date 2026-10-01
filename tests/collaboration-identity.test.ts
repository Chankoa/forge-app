import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CourseIdentityHeader } from "../components/course/CourseIdentityHeader";
import { PersonalCourseCard } from "../components/course/CoursePresentation";
import { resolveCourseCapabilities } from "../lib/capabilities/course-capabilities";
import { courseRelations } from "../lib/courses/presentation";
import { profileCourseSections } from "../lib/profiles/profile-projections";
import type { LibraryCourse } from "../lib/courses/library-view";

const course = { id: "shared-course", slug: "shared-course", title: "Parcours partagé", description: "Un parcours utile", domain: "Design", status: "draft", author: { displayName: "Chandra Proton", initials: "CP" } };
const baseCard: LibraryCourse = { id: "shared-course", slug: "shared-course", title: "Parcours partagé", description: "Un parcours utile", domain: "Design", status: "draft", moduleCount: 2, lessonCount: 4, durationMinutes: null, lessonSlug: "start", enrolled: false, isOwner: false, collaborationRole: null, percentage: 0, completedCount: 0, author: course.author };

test("owner remains the canonical Je crée relationship", () => {
  const capabilities = resolveCourseCapabilities({ isOwner: true, isEnrolled: false, courseStatus: "draft" });
  const html = renderToStaticMarkup(createElement(CourseIdentityHeader, { course, capabilities, overview: true }));
  assert.match(html, /Je crée/);
  assert.doesNotMatch(html, /J’édite|Lecteur|Par Chandra Proton/);
});

test("active editor is labelled J’édite with owner attribution and never Je crée", () => {
  const capabilities = resolveCourseCapabilities({ isOwner: false, isEnrolled: false, courseStatus: "draft", membershipRole: "editor", membershipStatus: "active" });
  const html = renderToStaticMarkup(createElement(CourseIdentityHeader, { course, capabilities, overview: false }));
  assert.match(html, /J’édite/);
  assert.match(html, /Par Chandra Proton/);
  assert.doesNotMatch(html, /Je crée/);
});

test("active viewer is labelled Lecteur with owner attribution and never Je crée", () => {
  const capabilities = resolveCourseCapabilities({ isOwner: false, isEnrolled: false, courseStatus: "archived", membershipRole: "viewer", membershipStatus: "active" });
  const html = renderToStaticMarkup(createElement(CourseIdentityHeader, { course: { ...course, status: "archived" }, capabilities, overview: false }));
  assert.match(html, /Lecteur/);
  assert.match(html, /Par Chandra Proton/);
  assert.match(html, /Archivé/);
  assert.doesNotMatch(html, /Je crée/);
});

test("learner and multi-relation labels remain distinct and non-contradictory", () => {
  assert.deepEqual(courseRelations(true, false), ["learn"]);
  assert.deepEqual(courseRelations(true, false, "editor", "active"), ["learn", "edit"]);
  assert.deepEqual(courseRelations(true, true, "owner", "active"), ["learn", "create"]);
});

test("Mes parcours collaboration card shows the role and owner attribution", () => {
  const html = renderToStaticMarkup(createElement(PersonalCourseCard, { course: { ...baseCard, collaborationRole: "editor" }, relations: ["edit"], action: createElement("a", { href: "/app/courses/shared-course" }, "Voir") }));
  assert.match(html, /J’édite/);
  assert.match(html, /Par Chandra Proton/);
  assert.doesNotMatch(html, /Je crée/);
});

test("Profile separates active collaborations from authored and revoked relationships", () => {
  const sections = profileCourseSections([
    { course: { status: "draft", visibility: "private", domain: "Design" }, isOwner: true, collaborationRole: null, state: { enrollment: null } },
    { course: { status: "draft", visibility: "private", domain: "Design" }, isOwner: false, collaborationRole: "editor", state: { enrollment: null } },
    { course: { status: "archived", visibility: "private", domain: "Design" }, isOwner: false, collaborationRole: null, state: { enrollment: null } },
  ]);
  assert.equal(sections.authored.length, 1);
  assert.equal(sections.collaborations.length, 1);
  assert.equal(sections.learning.length, 0);
});