import assert from "node:assert/strict";
import test from "node:test";
import { courseMetadataSchema } from "../lib/forge/authoring-contracts";
import { normalizeAuthoringText } from "../lib/courses/authoring-text";

test("course descriptions normalize LF and CRLF before the persisted length check", () => {
  const lines = Array.from({ length: 800 }, () => "abcd").join("\n");
  const crlf = lines.replace(/\n/g, "\r\n");
  assert.equal(normalizeAuthoringText(lines), normalizeAuthoringText(crlf));
  assert.equal(courseMetadataSchema.safeParse({ title: "Titre valide", description: normalizeAuthoringText(crlf) }).success, true);
});

test("course descriptions over the persisted limit remain rejected", () => {
  assert.equal(courseMetadataSchema.safeParse({ title: "Titre valide", description: normalizeAuthoringText("x".repeat(4001)) }).success, false);
});
