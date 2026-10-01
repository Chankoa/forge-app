import assert from "node:assert/strict";
import test from "node:test";
import { authorIdentityFromPublicRow, authorInitials, isPublicCourse, publicAuthorIdentity, publicAuthorIdentityFromRpcData } from "../lib/profiles/author-identity";

test("public author identity maps only the deployed RPC fields", () => {
  const identity = authorIdentityFromPublicRow({ profile_id: "author-id", name: "Amina Diallo" });
  assert.deepEqual(identity, { profileId: "author-id", displayName: "Amina Diallo", initials: "AD" });
  assert.deepEqual(publicAuthorIdentity({ profile_id: "author-id", name: "Amina Diallo" }), { displayName: "Amina Diallo", initials: "AD" });
  assert.equal("email" in identity, false); assert.equal("role" in identity, false); assert.equal("status" in identity, false); assert.equal("last_active_at" in identity, false);
});

test("author identity never falls back to email or UUID", () => {
  const identity = authorIdentityFromPublicRow({ profile_id: "b5bca34d-5b85-42c9-8c17-768d0d5dc4b2", name: "  " });
  assert.equal(identity.displayName, "Auteur Forge"); assert.equal(identity.initials, "AF");
  assert.equal(identity.displayName.includes("@"), false); assert.equal(identity.displayName.includes(identity.profileId), false);
});

test("author initials are deterministic for full, single, and missing names", () => {
  assert.equal(authorInitials("Amina Diallo"), "AD"); assert.equal(authorInitials("  Amine  "), "A"); assert.equal(authorInitials(null), "AF");
});

test("only published public courses can request public author attribution", () => {
  assert.equal(isPublicCourse({ status: "published", visibility: "public" }), true);
  assert.equal(isPublicCourse({ status: "draft", visibility: "private" }), false);
  assert.equal(isPublicCourse({ status: "archived", visibility: "private" }), false);
  assert.equal(isPublicCourse({ status: "published", visibility: "unlisted" }), false);
});

test("RPC projection ignores missing and malformed rows", () => {
  assert.deepEqual(publicAuthorIdentityFromRpcData([{ profile_id: "author-id", name: "Amina Diallo" }]), { displayName: "Amina Diallo", initials: "AD" });
  assert.equal(publicAuthorIdentityFromRpcData([]), null); assert.equal(publicAuthorIdentityFromRpcData([{ profile_id: "author-id", name: 3 }]), null);
});