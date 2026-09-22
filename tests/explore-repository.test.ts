import assert from "node:assert/strict";
import test from "node:test";
import { mapExploreCourse } from "../lib/courses/explore-repository";

test("maps public Explore identity from the existing course and domain projection", () => {
  assert.deepEqual(mapExploreCourse({ id: "course-1", slug: "foundations", title: "Foundations", status: "published", description: "Build durable foundations.", duration_minutes: 90, domains: [{ name: "Création web" }] }), {
    id: "course-1", slug: "foundations", title: "Foundations", status: "published", description: "Build durable foundations.", domain: "Création web", durationMinutes: 90,
  });
});