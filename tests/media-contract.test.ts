import assert from "node:assert/strict";
import test from "node:test";
import { mediaResourceSchema, sanitizeMediaFilename, validateMediaUpload } from "../lib/courses/media-contracts";
import { insertMediaResource } from "../lib/courses/lesson-markdown";
import { resourceIdsInRichContent } from "../lib/courses/lesson-rich-content";

test("media uploads accept the conservative image and audio allowlists", () => {
  assert.equal(validateMediaUpload("image", "image/png", 1024).ok, true);
  assert.equal(validateMediaUpload("audio", "audio/mpeg", 1024).ok, true);
  assert.equal(validateMediaUpload("image", "image/svg+xml", 1024).ok, false);
  assert.equal(validateMediaUpload("audio", "audio/mpeg", 26 * 1024 * 1024).ok, false);
});

test("media resource contract matches the live storage identity and states", () => {
  const valid = mediaResourceSchema.safeParse({
    id: "11111111-1111-4111-8111-111111111111",
    courseId: "22222222-2222-4222-8222-222222222222",
    createdBy: "33333333-3333-4333-8333-333333333333",
    storageBucket: "course-media",
    storagePath: "course-media/22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111/photo.png",
    kind: "image",
    mimeType: "image/png",
    fileSize: 100,
    title: null,
    altText: "Photo",
    caption: null,
    durationSeconds: null,
    status: "ready",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  assert.equal(valid.success, true);
  assert.equal(mediaResourceSchema.safeParse({ ...(valid.success ? valid.data : {}), storageBucket: "other" }).success, false);
});

test("media filenames are reduced to safe path segments", () => {
  assert.equal(sanitizeMediaFilename("../photo final.png"), "photo-final.png");
});

test("resource directives can be inserted into local draft content", () => {
  const result = insertMediaResource("Avant", 5, 5, "image", "11111111-1111-4111-8111-111111111111", "Photo", "Légende");
  assert.match(result.content, /resource=11111111-1111-4111-8111-111111111111/);
  assert.equal(result.content.startsWith("Avant"), true);
});

test("resource references are extracted without exposing storage paths", () => {
  const ids = resourceIdsInRichContent(":::image\nresource=11111111-1111-4111-8111-111111111111\nalt=Photo\n:::");
  assert.deepEqual(ids, ["11111111-1111-4111-8111-111111111111"]);
});
