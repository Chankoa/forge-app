import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CourseIdentityHeader } from "../components/course/CourseIdentityHeader";
import { resolveCourseCapabilities } from "../lib/capabilities/course-capabilities";

test("Creator and Learner share one domain-title-status header without repeated relationship metadata", () => {
  const course = { id: "course-1", slug: "course-1", title: "Un parcours réel", description: "Un objectif réel", domain: "Création web", status: "published" };
  for (const isOwner of [true, false]) {
    const header = renderToStaticMarkup(createElement(CourseIdentityHeader, { course, capabilities: resolveCourseCapabilities({ isOwner, isEnrolled: !isOwner }), overview: isOwner }));
    assert.equal((header.match(/Création web/g) ?? []).length, 1);
    assert.equal((header.match(/Un parcours réel/g) ?? []).length, 1);
    assert.equal((header.match(/Publié/g) ?? []).length, 1);
    assert.equal(header.includes("Remixer ce parcours"), isOwner);
    assert.ok(header.indexOf("Création web") < header.indexOf("Un parcours réel"));
    assert.equal((header.match(/J’apprends/g) ?? []).length, isOwner ? 0 : 1);
  }
});
