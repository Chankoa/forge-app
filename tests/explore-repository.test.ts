import assert from "node:assert/strict";
import test from "node:test";
import { mapExploreCourse } from "../lib/courses/explore-repository";

test("maps real domain and level from Supabase many-to-one and legacy array shapes", () => {
  const row = { id: "course-1", slug: "foundations", title: "Foundations", status: "published", description: "Build durable foundations.", duration_minutes: 90, level: "beginner" };
  const expected = { id: "course-1", slug: "foundations", title: "Foundations", status: "published", description: "Build durable foundations.", domain: "Création web", durationMinutes: 90, level: "beginner" };
  assert.deepEqual(mapExploreCourse({ ...row, domains: { name: "Création web" } }), expected);
  assert.deepEqual(mapExploreCourse({ ...row, domains: [{ name: "Création web" }] }), expected);
});
