import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { mapExploreCourse, mapPublicDiscoverableCourse } from "../lib/courses/explore-repository";

test("maps real domain and level from Supabase many-to-one and legacy array shapes", () => {
  const row = { id: "course-1", slug: "foundations", title: "Foundations", status: "published", description: "Build durable foundations.", duration_minutes: 90, level: "beginner" };
  const expected = { id: "course-1", slug: "foundations", title: "Foundations", status: "published", description: "Build durable foundations.", domain: "Création web", durationMinutes: 90, level: "beginner" };
  assert.deepEqual(mapExploreCourse({ ...row, domains: { name: "Création web" } }), expected);
  assert.deepEqual(mapExploreCourse({ ...row, domains: [{ name: "Création web" }] }), expected);
});

test("public discovery is a narrow published-public projection, independent from user relationships", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20261014000000_public_course_discovery_catalog.sql", import.meta.url), "utf8");
  assert.match(migration, /create or replace function public\.list_public_discoverable_courses/);
  assert.match(migration, /where course\.status = 'published'\s+and course\.visibility = 'public'/);
  assert.match(migration, /grant execute on function public\.list_public_discoverable_courses\(\) to anon, authenticated/);
  assert.doesNotMatch(migration, /auth\.uid\(\)/);

  const course = mapPublicDiscoverableCourse({
    id: "course-public",
    slug: "public-course",
    title: "Cours public",
    description: "Ouvert à la découverte.",
    status: "published",
    duration_minutes: 60,
    level: "beginner",
    domain_name: "Design",
    cover_image: null,
    cover_storage_path: null,
    cover_mime_type: null,
    cover_file_size: null,
    author_profile_id: "profile-other-user",
    author_name: "Autre autrice",
    author_avatar_url: null,
  }, (path) => `https://storage.example/${path}`);
  assert.equal(course.author?.displayName, "Autre autrice");
  assert.equal(course.status, "published");
});
