import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canManageCollaborator, collaboratorIdentity, collaboratorRoleSchema, collaboratorStatusSchema } from "../lib/courses/collaborators";

const migration = readFileSync(new URL("../supabase/migrations/20261002000000_i2d_course_collaborator_management.sql", import.meta.url), "utf8");
const actions = readFileSync(new URL("../app/app/courses/collaborator-actions.ts", import.meta.url), "utf8");
const manager = readFileSync(new URL("../components/course/CourseCollaboratorManager.tsx", import.meta.url), "utf8");

test("owner collaborator roles are limited to viewer and editor", () => {
  assert.deepEqual(collaboratorRoleSchema.options, ["viewer", "editor"]);
  assert.equal(collaboratorRoleSchema.safeParse("owner").success, false);
  assert.equal(collaboratorRoleSchema.safeParse("contributor").success, false);
  assert.equal(collaboratorRoleSchema.safeParse("participant").success, false);
  assert.equal(canManageCollaborator({ role: "viewer" }), true);
  assert.equal(canManageCollaborator({ role: "editor" }), true);
});

test("collaborator identity is public-safe and never derives a display name from an ID", () => {
  const identity = collaboratorIdentity("2c2c2c2c-1111-2222-3333-444444444444", null);
  assert.deepEqual(identity, { userId: "2c2c2c2c-1111-2222-3333-444444444444", displayName: "Membre Forge", initials: "MF" });
  assert.equal("email" in identity, false);
});

test("owner RPCs require the active canonical course owner for every list, lookup and mutation", () => {
  assert.match(migration, /private\.is_active_account\(\)/);
  assert.match(migration, /teacher_id = \(select auth\.uid\(\)\)/);
  for (const rpc of ["list_course_collaborators", "search_course_collaborator_candidates", "add_course_collaborator", "change_course_collaborator_role", "set_course_collaborator_status"]) assert.match(migration, new RegExp(`function public\\.${rpc}`));
  assert.match(actions, /requireActiveCourseOwner/);
  assert.match(actions, /profile\?\.status !== "active"/);
});

test("add creates or reactivates one viewer/editor membership without changing ownership", () => {
  assert.match(migration, /on conflict\s*\(\s*course_id,\s*user_id\s*\)\s*do update/);
  assert.match(migration, /status = 'active'/);
  assert.match(migration, /target_role not in \('viewer', 'editor'\)/);
  assert.match(migration, /owner_membership_not_managed_here/);
  assert.doesNotMatch(migration, /update public\.courses/);
});

test("role changes, revocation and reactivation preserve the membership row", () => {
  assert.match(migration, /function public\.change_course_collaborator_role/);
  assert.match(migration, /function public\.set_course_collaborator_status/);
  assert.match(migration, /target_status not in \('active', 'revoked'\)/);
  assert.doesNotMatch(migration, /delete from public\.course_memberships/);
  assert.equal(collaboratorStatusSchema.safeParse("invited").success, true);
  assert.equal(collaboratorStatusSchema.safeParse("suspended").success, true);
  assert.match(manager, /collaborator\.status === "active" \|\| collaborator\.status === "revoked"/);
});

test("manager UI exposes no unsupported collaboration roles or global team destination", () => {
  assert.match(manager, /<option value="viewer">Lecteur<\/option>/);
  assert.match(manager, /<option value="editor">Éditeur<\/option>/);
  assert.doesNotMatch(manager, /value="contributor"|value="participant"|value="owner"/);
  assert.doesNotMatch(manager, /\/app\/team/);
});