import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { courseManagePath, courseOverviewPath } from "../lib/courses/context-navigation";

test("course management destinations converge on overview and route each destination locally", () => {
  const source = readFileSync("components/course/OwnerCourseOverview.tsx", "utf8");
  assert.equal(courseManagePath("atelier"), courseOverviewPath("atelier"));
  assert.match(source, /aria-label="Destinations de gestion du parcours"/);
  assert.match(source, /href=\{`\/app\/courses\/\$\{course\.slug\}`\} aria-current="page"/);
  assert.match(source, /href=\{structureHref\}>Structure/);
  assert.match(source, /href=\{publicationHref\}>Publication/);
  assert.match(source, /mode=collaborators/);
  assert.match(source, />Collaboration</);
  assert.match(source, /\/classroom/);
  assert.match(source, /mode=availability/);
  assert.match(source, /mode=remix/);
  assert.doesNotMatch(source, />Équipe</);
});
