import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DiscussionContextLabel } from "../components/course/DiscussionContextLabel";
import {
  canDeleteDiscussionMessage,
  canEditDiscussionMessage,
  discussionAccess,
  normalizeDiscussionBody,
  normalizeDiscussionContext,
  normalizePersistedDiscussionContext,
} from "../lib/courses/discussion";

const owner = discussionAccess({ isOwner: true, membershipRole: null, membershipStatus: null, userId: "owner" });
const editor = discussionAccess({ isOwner: false, membershipRole: "editor", membershipStatus: "active", userId: "editor" });
const viewer = discussionAccess({ isOwner: false, membershipRole: "viewer", membershipStatus: "active", userId: "viewer" });
const message = { authorId: "editor", deletedAt: null };

test("discussion access preserves owner/editor/viewer and excludes learners or inactive roles", () => {
  assert.equal(owner.canRead, true);
  assert.equal(owner.canPost, true);
  assert.equal(editor.canRead, true);
  assert.equal(editor.canPost, true);
  assert.equal(viewer.canRead, true);
  assert.equal(viewer.canPost, false);
  for (const role of ["viewer", "editor", "participant", "contributor"]) {
    const access = discussionAccess({ isOwner: false, membershipRole: role, membershipStatus: role === "viewer" || role === "editor" ? "revoked" : "active", userId: "other" });
    assert.equal(access.canRead, false);
    assert.equal(access.canPost, false);
  }
});

test("discussion body and context contracts reject empty, oversize, and cross-shaped input", () => {
  assert.equal(normalizeDiscussionBody("  Bonjour  "), "Bonjour");
  assert.equal(normalizeDiscussionBody(" "), null);
  assert.equal(normalizeDiscussionBody("x".repeat(4001)), null);
  assert.deepEqual(normalizeDiscussionContext({ type: "course" }), { type: "course", moduleId: null, lessonId: null });
  assert.deepEqual(normalizeDiscussionContext({ type: "module", moduleId: "module-a" }), { type: "module", moduleId: "module-a", lessonId: null });
  assert.equal(normalizeDiscussionContext({ type: "lesson", moduleId: "module-a", lessonId: "lesson-a" }), null);
});

test("persisted context accepts deleted module or lesson references without weakening create validation", () => {
  assert.deepEqual(
    normalizePersistedDiscussionContext({ type: "module", moduleId: null, lessonId: null }),
    { type: "module", moduleId: null, lessonId: null },
  );
  assert.deepEqual(
    normalizePersistedDiscussionContext({ type: "lesson", moduleId: null, lessonId: null }),
    { type: "lesson", moduleId: null, lessonId: null },
  );
  assert.equal(normalizeDiscussionContext({ type: "module", moduleId: null }), null);
  assert.equal(normalizeDiscussionContext({ type: "lesson", lessonId: null }), null);
  assert.equal(normalizePersistedDiscussionContext({ type: "module", moduleId: "module-a" }), null);
});

test("message mutation keeps viewer read-only, editor ownership, and owner moderation", () => {
  assert.equal(canEditDiscussionMessage(editor, message), true);
  assert.equal(canDeleteDiscussionMessage(editor, message), true);
  assert.equal(canEditDiscussionMessage(viewer, message), false);
  assert.equal(canDeleteDiscussionMessage(viewer, message), false);
  assert.equal(canDeleteDiscussionMessage(owner, message), true);
  assert.equal(canEditDiscussionMessage(editor, { authorId: "other", deletedAt: null }), false);
  assert.equal(canDeleteDiscussionMessage(editor, { authorId: "other", deletedAt: null }), false);
  assert.equal(canDeleteDiscussionMessage(owner, { authorId: "editor", deletedAt: "2026-10-15T10:00:00Z" }), false);
});

test("discussion migration has private RLS, delete-safe author FK, context guard, and no public visibility", () => {
  const migration = readFileSync("supabase/migrations/20261015110000_course_discussion_messages_v1.sql", "utf8");
  assert.match(migration, /author_id uuid references public\.profiles\(id\) on delete set null/);
  assert.match(migration, /course_id uuid not null references public\.courses\(id\) on delete cascade/);
  assert.match(migration, /alter table public\.course_discussion_messages enable row level security/);
  assert.match(migration, /private\.forge_can_read_course\(course_id\)/);
  assert.match(migration, /private\.forge_can_author_course\(course_id\)/);
  assert.match(migration, /Discussion lesson must belong to the course/);
  assert.match(migration, /No DELETE policy/);
  assert.match(migration, /case when message\.deleted_at is null then message\.body else 'Message supprimé' end/);
  assert.doesNotMatch(migration, /\bvisibility\b|is_public/);
});

test("context FK migration preserves message and allows only deleted-context tombstones", () => {
  const migration = readFileSync("supabase/migrations/20261015111000_course_discussion_context_set_null.sql", "utf8");
  assert.match(migration, /context_module_id[\s\S]*references public\.course_modules\(id\)[\s\S]*on delete set null/i);
  assert.match(migration, /context_lesson_id[\s\S]*references public\.lessons\(id\)[\s\S]*on delete set null/i);
  assert.match(migration, /context_type = 'module' and context_lesson_id is null/i);
  assert.match(migration, /context_type = 'lesson' and context_module_id is null/i);
  assert.match(migration, /new\.context_type is distinct from old\.context_type/);
  assert.match(migration, /new\.course_id is distinct from old\.course_id/);
  assert.match(migration, /and not exists \([\s\S]*module_row\.id = old\.context_module_id[\s\S]*\)/);
  assert.match(migration, /and not exists \([\s\S]*lesson_row\.id = old\.context_lesson_id[\s\S]*\)/);
  assert.match(migration, /module_row\.course_id = new\.course_id/);
  assert.match(migration, /lesson_row\.course_id = new\.course_id/);
  assert.match(migration, /new\.body is not distinct from old\.body/);
  assert.match(migration, /new\.deleted_at is not distinct from old\.deleted_at/);
  assert.match(migration, /old\.deleted_at is not null and not context_cleanup_only/);
  assert.match(migration, /new\.updated_at := old\.updated_at/);
  assert.doesNotMatch(migration, /new\.context_type\s*:=/);
});

test("deleted context labels show a safe fallback without exposing UUIDs", () => {
  for (const context of [
    { type: "module" as const, moduleId: null, lessonId: null },
    { type: "lesson" as const, moduleId: null, lessonId: null },
  ]) {
    const label = renderToStaticMarkup(createElement(DiscussionContextLabel, { context, outline: [], courseSlug: "course" }));
    assert.equal(label, '<span class="discussion-context">Contexte supprimé</span>');
    assert.doesNotMatch(label, /module|lesson|uuid/i);
  }
});

test("discussion navigation stays collaboration-only and keeps learners out", () => {
  const source = readFileSync("lib/courses/context-navigation.ts", "utf8");
  assert.match(source, /capabilities\.canViewPrivate/);
  assert.match(source, /courseDiscussionPath/);
  const component = readFileSync("components/course/CourseDiscussion.tsx", "utf8");
  assert.match(component, /Vous pouvez consulter les échanges de l’équipe/);
  assert.match(component, /Message supprimé/);
  assert.match(component, /Message envoyé/);
});
