import assert from "node:assert/strict";
import test from "node:test";
import { mapPublicCourseDetail } from "../lib/courses/public-course-view";

test("public course projection contains only public identity and pedagogical metadata", () => {
  const detail = mapPublicCourseDetail({
    id: "course-1", slug: "fondations", title: "Fondations", subtitle: "Une introduction", description: "Comprendre les notions essentielles.",
    status: "published", visibility: "public", duration_minutes: 90, level: "beginner", domains: { name: "Numérique" },
  });
  assert.deepEqual(detail, {
    id: "course-1", slug: "fondations", title: "Fondations", subtitle: "Une introduction", description: "Comprendre les notions essentielles.",
    domain: "Numérique", durationMinutes: 90, level: "beginner",
  });
  assert.equal("content" in detail, false);
  assert.equal("objectives" in detail, false);
  assert.equal("collaborators" in detail, false);
});