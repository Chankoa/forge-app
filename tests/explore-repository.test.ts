import assert from "node:assert/strict";
import test from "node:test";
import { mapExploreCourse } from "../lib/courses/explore-repository";

test("maps portable Explore fields without assuming legacy metadata columns", () => {
  assert.deepEqual(mapExploreCourse({ id: "course-1", slug: "foundations", title: "Foundations", status: "published" }), {
    id: "course-1", slug: "foundations", title: "Foundations", status: "published", description: null, domain: null,
  });
});