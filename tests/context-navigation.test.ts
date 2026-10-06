import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CourseContextNavigation } from "../components/course/CourseContextNavigation";
import { resolveCourseCapabilities } from "../lib/capabilities/course-capabilities";
import { courseClassroomPath, courseEditPath, courseLessonPath, courseOverviewPath, getCourseContextLinks, publicationCorrectionPath } from "../lib/courses/context-navigation";

const courseSlug = "workflow-ia";
const lessonSlug = "premiers-pas";
const owner = resolveCourseCapabilities({ isOwner: true, isEnrolled: false });
const enrolled = resolveCourseCapabilities({ isOwner: false, isEnrolled: true });
const dual = resolveCourseCapabilities({ isOwner: true, isEnrolled: true });

test("lesson Learn has a canonical back-to-course destination", () => { assert.equal(courseOverviewPath(courseSlug), `/app/courses/${courseSlug}`); assert.equal(getCourseContextLinks(courseSlug, enrolled, lessonSlug)[0].href, `/app/courses/${courseSlug}`); });
test("lesson Edit has a canonical back-to-course destination", () => { assert.equal(getCourseContextLinks(courseSlug, owner, lessonSlug)[0].href, `/app/courses/${courseSlug}`); });
test("Learn and Edit keep the current lesson slug", () => { const links = getCourseContextLinks(courseSlug, dual, lessonSlug); assert.equal(links.find((link) => link.label === "Apprendre")?.href, `/app/courses/${courseSlug}/lessons/${lessonSlug}`); assert.equal(links.find((link) => link.label === "Modifier")?.href, `/app/courses/${courseSlug}/lessons/${lessonSlug}?mode=edit`); });
test("course-level Learn opens the resumed lesson", () => { assert.equal(getCourseContextLinks(courseSlug, dual, undefined, lessonSlug).find((link) => link.label === "Apprendre")?.href, courseLessonPath(courseSlug, lessonSlug)); });
test("owner course navigation opens the canonical Cockpit while keeping the overview explicit", () => { const links = getCourseContextLinks(courseSlug, dual, undefined, lessonSlug); assert.equal(links.find((link) => link.label === "Gérer")?.href, courseEditPath(courseSlug)); assert.equal(links.find((link) => link.label === "Vue d'ensemble")?.href, courseOverviewPath(courseSlug)); assert.equal(links.some((link) => link.label === "Modifier"), false); });
test("owner Classroom navigation uses the dedicated course-scoped route", () => {
  assert.equal(courseClassroomPath(courseSlug), `/app/courses/${courseSlug}/classroom`);
  assert.equal(getCourseContextLinks(courseSlug, owner).find((link) => link.label === "Classroom")?.href, courseClassroomPath(courseSlug));
});
test("Publication routes Learn to the resumed lesson", () => { const links = getCourseContextLinks(courseSlug, dual, undefined, lessonSlug); assert.equal(links.find((link) => link.label === "Publication")?.href, `${courseOverviewPath(courseSlug)}?mode=publication`); assert.equal(links.find((link) => link.label === "Apprendre")?.href, courseLessonPath(courseSlug, lessonSlug)); });
test("course without lessons keeps Learn on the valid overview route", () => { assert.equal(getCourseContextLinks(courseSlug, enrolled).find((link) => link.label === "Apprendre")?.href, courseOverviewPath(courseSlug)); });
test("learner-only navigation never exposes authoring modes", () => { const links = getCourseContextLinks(courseSlug, enrolled, undefined, lessonSlug); assert.deepEqual(links.map((link) => link.label), ["Vue d'ensemble", "Apprendre"]); });
test("publisher exposes course-level publication from lesson context", () => { const publication = getCourseContextLinks(courseSlug, owner, lessonSlug).find((link) => link.label === "Publication"); assert.equal(publication?.href, `/app/courses/${courseSlug}?mode=publication`); });
test("non-publisher never receives publication navigation", () => { assert.equal(getCourseContextLinks(courseSlug, enrolled, lessonSlug).some((link) => link.label === "Publication"), false); });
test("owner without enrollment gets a preview route", () => { assert.equal(getCourseContextLinks(courseSlug, owner, undefined, lessonSlug).find((link) => link.label === "Prévisualiser")?.href, `${courseLessonPath(courseSlug, lessonSlug)}?mode=preview`); });
test("course context links contain no legacy route", () => { for (const link of getCourseContextLinks(courseSlug, dual, lessonSlug)) assert.equal(/\/(teacher|learner|learn)(\/|$)/.test(link.href), false); });
test("course-local back action returns to the same course overview while UJ05 returns to My paths", () => {
  const props = { courseId: "course-id", courseSlug, enrollable: false, capabilities: owner, lessonSlug, activeMode: "edit" as const };
  const local = renderToStaticMarkup(createElement(CourseContextNavigation, props));
  assert.match(local, /href="\/app\/courses\/workflow-ia"[^>]*>.*?Vue d’ensemble/);
  const overview = renderToStaticMarkup(createElement(CourseContextNavigation, { ...props, overview: true }));
  assert.match(overview, /href="\/app\/courses"[^>]*>.*?Mes parcours/);
});
test("publication issues retain exact course and lesson correction routes", () => {
  assert.equal(publicationCorrectionPath(courseSlug, "blocking"), `/app/courses/${courseSlug}?mode=edit#cockpit-program-title`);
  assert.equal(publicationCorrectionPath(courseSlug, "recommended", lessonSlug), `/app/courses/${courseSlug}/lessons/${lessonSlug}?mode=edit`);
  assert.equal(publicationCorrectionPath(courseSlug, "recommended"), publicationCorrectionPath(courseSlug, "blocking"));
});
test("learner primary continuation appears in the shared course action row", () => {
  const action = createElement("a", { href: `/app/courses/${courseSlug}/lessons/${lessonSlug}` }, "Continuer");
  const html = renderToStaticMarkup(createElement(CourseContextNavigation, { courseId: "course-id", courseSlug, enrollable: true, capabilities: enrolled, activeMode: "view", learnLessonSlug: lessonSlug, primaryLearningAction: action }));
  assert.match(html, /<nav class="mode-switch"[^>]*>.*Vue d&#x27;ensemble.*Apprendre.*Continuer.*<\/nav>/);
  assert.equal((html.match(/>Continuer<\/a>/g) ?? []).length, 1);
});
