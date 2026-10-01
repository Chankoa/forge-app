import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/migrations/20261005000000_i2g_collaboration_awareness.sql", import.meta.url), "utf8");
const repository = readFileSync(new URL("../lib/courses/collaboration-awareness-repository.ts", import.meta.url), "utf8");
const profile = readFileSync(new URL("../app/app/profile/page.tsx", import.meta.url), "utf8");

test("owner awareness is limited to pending requests on canonically owned courses", () => {
  assert.match(migration, /function public\.list_owned_pending_collaboration_awareness/);
  assert.match(migration, /course\.teacher_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /request\.status = 'pending'/);
  assert.match(migration, /limit 4/);
  assert.doesNotMatch(migration, /email|account_role|account_status/i);
});

test("requester awareness is limited to own recent active viewer/editor acceptances", () => {
  assert.match(migration, /function public\.list_my_recent_accepted_collaboration_awareness/);
  assert.match(migration, /request\.requester_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /request\.status = 'accepted'/);
  assert.match(migration, /request\.resolved_at >= now\(\) - interval '7 days'/);
  assert.match(migration, /membership\.status = 'active'/);
  assert.match(migration, /membership\.role::text in \('viewer', 'editor'\)/);
  assert.match(migration, /limit 3/);
});

test("awareness RPCs are authenticated-only and do not introduce a notification system", () => {
  for (const rpc of ["list_owned_pending_collaboration_awareness", "list_my_recent_accepted_collaboration_awareness"]) {
    assert.match(migration, new RegExp(`revoke execute\\s+on function public\\.${rpc}\\(\\)\\s+from anon`));
    assert.match(migration, new RegExp(`grant execute\\s+on function public\\.${rpc}\\(\\)\\s+to authenticated`));
  }
  assert.doesNotMatch(migration, /create table[^;]*(notification|unread|read_at|dismissed_at)/i);
});

test("server repository uses only the two narrow awareness projections", () => {
  assert.match(repository, /list_owned_pending_collaboration_awareness/);
  assert.match(repository, /list_my_recent_accepted_collaboration_awareness/);
  assert.doesNotMatch(repository, /from\("course_collaboration_requests"\)/);
});

test("Profile calls the section Collaborations and explains editor/viewer relationship without ownership confusion", () => {
  assert.match(profile, /<h2 id="profile-collaborations-title">Collaborations<\/h2>/);
  assert.match(profile, /Éditeur · Collaboration/);
  assert.match(profile, /Lecteur · Partagé avec vous/);
  assert.match(profile, /· Par \$\{course\.author\.displayName\}/);
  assert.doesNotMatch(profile, /Vous partagez ce parcours|Parcours partagés/);
});