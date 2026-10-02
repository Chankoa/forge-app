import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CourseRemixError, requestCourseRemix } from "../lib/courses/remix";
import { canOfferOwnerCourseRemix, canOfferPublicCourseRemix, courseRemixCockpitPath } from "../lib/courses/remix";
import { CourseProvenance } from "../components/course/CourseProvenance";
import { CourseRemixConfirmationContent } from "../components/course/CourseRemixButton";

test("Remix calls the RPC with only the source course id and returns its destination", async () => {
  let call: { functionName: string; args: unknown } | null = null;
  const destination = await requestCourseRemix({
    async rpc(functionName, args) {
      call = { functionName, args };
      return { data: { id: "destination-id", slug: "source-remixe" }, error: null };
    },
  }, "source-id");

  assert.deepEqual(call, { functionName: "create_course_remix", args: { source_course_id: "source-id" } });
  assert.deepEqual(destination, { id: "destination-id", slug: "source-remixe" });
});

test("Remix maps known and unknown RPC errors without exposing database details", async () => {
  await assert.rejects(
    requestCourseRemix({ async rpc() { return { data: null, error: { code: "SOURCE_COURSE_NOT_ELIGIBLE", message: "internal detail" } }; } }, "source-id"),
    (error: unknown) => error instanceof CourseRemixError && error.message === "Ce parcours ne peut pas être remixé.",
  );
  await assert.rejects(
    requestCourseRemix({ async rpc() { return { data: null, error: { code: "P0001", message: "REMIX_SLUG_EXHAUSTED" } }; } }, "source-id"),
    (error: unknown) => error instanceof CourseRemixError && error.message === "Impossible de créer le remix pour le moment.",
  );
  await assert.rejects(
    requestCourseRemix({ async rpc() { return { data: null, error: { code: "unexpected", message: "internal detail" } }; } }, "source-id"),
    (error: unknown) => error instanceof CourseRemixError && error.message === "Impossible de créer le remix pour le moment.",
  );
});

test("Remix visibility distinguishes public readers, collaborators, and owners", () => {
  assert.equal(canOfferPublicCourseRemix({ isAuthenticated: true, isOwner: false, status: "published", visibility: "public" }), true);
  assert.equal(canOfferPublicCourseRemix({ isAuthenticated: true, isOwner: false, status: "draft", visibility: "private" }), false);
  assert.equal(canOfferPublicCourseRemix({ isAuthenticated: false, isOwner: false, status: "published", visibility: "public" }), false);
  assert.equal(canOfferOwnerCourseRemix({ isAuthenticated: true, isOwner: true, status: "draft", visibility: "private" }), true);
  assert.equal(canOfferOwnerCourseRemix({ isAuthenticated: true, isOwner: true, status: "published", visibility: "public" }), true);
  assert.equal(canOfferOwnerCourseRemix({ isAuthenticated: true, isOwner: true, status: "archived", visibility: "private" }), false);
});

test("Remix confirmation names the independent-copy boundaries", () => {
  const html = renderToStaticMarkup(createElement(CourseRemixConfirmationContent, { error: null }));
  assert.match(html, /Remixer ce parcours \?/);
  assert.match(html, /Les sources, ressources, collaborateurs, apprenants et données de progression ne seront pas copiés/);
});

test("Provenance preserves frozen attribution and only links a readable source", () => {
  const frozen = renderToStaticMarkup(createElement(CourseProvenance, { provenance: { sourceCourseTitle: "Cours source", sourceAuthorName: "Ada Lovelace", remixedAt: "2026-10-02T00:00:00Z", sourceHref: null } }));
  assert.match(frozen, /Adapté de/);
  assert.match(frozen, /Cours source/);
  assert.match(frozen, /Ada Lovelace/);
  assert.doesNotMatch(frozen, /href=/);

  const linked = renderToStaticMarkup(createElement(CourseProvenance, { provenance: { sourceCourseTitle: "Cours public", sourceAuthorName: null, remixedAt: "2026-10-02T00:00:00Z", sourceHref: "/app/courses/cours-public" } }));
  assert.match(linked, /href="\/app\/courses\/cours-public"/);
});

test("Remix success targets the canonical owner cockpit", () => {
  assert.equal(courseRemixCockpitPath("source-remixe"), "/app/courses/source-remixe");
});