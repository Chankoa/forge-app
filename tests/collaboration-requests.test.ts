import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { acceptedRequestRole, collaborationRequestMessageSchema } from "../lib/courses/collaboration-requests";

const migration = readFileSync(new URL("../supabase/migrations/20261004000000_i2f_collaboration_requests.sql", import.meta.url), "utf8");
const learnerPanel = readFileSync(new URL("../components/course/LearnerCollaborationRequest.tsx", import.meta.url), "utf8");
const ownerPanel = readFileSync(new URL("../components/course/CourseCollaborationRequestsPanel.tsx", import.meta.url), "utf8");

test("request model is explicit, course-scoped, and allows one pending request only", () => {
  assert.match(migration, /create table if not exists public\.course_collaboration_requests/);
  assert.match(migration, /course_collaboration_requests_one_pending/);
  assert.match(migration, /where status = 'pending'/);
  assert.match(migration, /'pending',\s*'accepted',\s*'declined',\s*'cancelled'/);
  assert.doesNotMatch(migration, /alter table public\.course_memberships.*request/i);
});

test("learner request eligibility is enforced for active enrolled non-owner learners only", () => {
  assert.match(migration, /private\.is_active_account\(\)/);
  assert.match(migration, /course\.collaboration_requests_enabled/);
  assert.match(migration, /course\.status = 'published'/);
  assert.match(migration, /from public\.enrollments enrollment/);
  assert.match(migration, /course\.teacher_id is distinct from/);
  assert.match(migration, /membership\.role::text in \('viewer', 'editor'\)/);
  assert.match(migration, /raise exception 'request_already_pending'/);
});

test("learner UI offers only an optional message and never a final collaborator role", () => {
  assert.match(learnerPanel, /Message facultatif/);
  assert.match(learnerPanel, /Demander à collaborer/);
  assert.doesNotMatch(learnerPanel, /<select|Lecteur|Éditeur|viewer|editor/);
  assert.equal(collaborationRequestMessageSchema.safeParse("x".repeat(1000)).success, true);
  assert.equal(collaborationRequestMessageSchema.safeParse("x".repeat(1001)).success, false);
});

test("canonical owner controls opt-in and resolves pending requests only", () => {
  assert.match(migration, /function public\.set_course_collaboration_requests_enabled/);
  assert.match(migration, /private\.forge_is_course_owner/);
  assert.match(migration, /function public\.list_course_collaboration_requests/);
  assert.match(migration, /function public\.resolve_course_collaboration_request/);
  assert.match(migration, /request_status <> 'pending'/);
  assert.match(ownerPanel, /Accepter les demandes de collaboration/);
  assert.match(ownerPanel, /> Lecteur</);
  assert.match(ownerPanel, /> Éditeur</);
  assert.match(ownerPanel, /> Refuser</);
});

test("acceptance is transactional, preserves enrollment, and only grants viewer/editor", () => {
  const resolveStart = migration.indexOf("create or replace function public.resolve_course_collaboration_request");
  const resolve = migration.slice(resolveStart);
  assert.match(resolve, /join public\.enrollments enrollment/);
  assert.match(resolve, /accepted_role not in \('viewer', 'editor'\)/);
  assert.match(resolve, /insert into public\.course_memberships/);
  assert.match(resolve, /on conflict\s*\(course_id, user_id\)\s*do update/);
  assert.ok(resolve.indexOf("insert into public.course_memberships") < resolve.indexOf("status = 'accepted'"));
  assert.doesNotMatch(resolve, /delete from public\.enrollments/);
  assert.equal(acceptedRequestRole("accepted", "editor"), "editor");
  assert.equal(acceptedRequestRole("declined", "viewer"), null);
});

test("decline retains request history without creating a membership", () => {
  const resolveStart = migration.indexOf("create or replace function public.resolve_course_collaboration_request");
  const resolve = migration.slice(resolveStart);
  const declineStart = resolve.indexOf("if resolution = 'declined'");
  const decline = resolve.slice(declineStart, resolve.indexOf("return;", declineStart));
  assert.match(decline, /set\s+status = 'declined'/);
  assert.doesNotMatch(decline, /course_memberships/);
  assert.doesNotMatch(migration, /delete from public\.course_collaboration_requests/);
});