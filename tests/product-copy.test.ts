import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = [
  "../app/app/explore/page.tsx",
  "../app/login/page.tsx",
  "../app/register/page.tsx",
  "../app/app/courses/[courseSlug]/page.tsx",
  "../app/app/courses/[courseSlug]/lessons/[lessonSlug]/page.tsx",
  "../app/app/courses/[courseSlug]/classroom/page.tsx",
  "../app/app/courses/[courseSlug]/classroom/learners/[learnerId]/page.tsx",
];

test("product states do not expose configuration or Supabase implementation details", () => {
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /ENV REQUIRED|SUPABASE READ UNAVAILABLE|lecture Supabase indisponible/);
  }
});