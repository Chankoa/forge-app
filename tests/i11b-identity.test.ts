import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { courseCoverPresentation, courseCoverMaxBytes, courseCoverBucket, validateCourseCoverUpload } from "../lib/courses/cover-contracts";
import { avatarMaxBytes, avatarStoragePath, avatarStoragePathFromPublicUrl, isOwnAvatarPath, profileDetailsSchema, profileDomainIdsSchema, validateAvatarUpload } from "../lib/profiles/profile-contracts";
import { safeAvatarUrl } from "../lib/profiles/avatar-url";
import { publicAuthorIdentityFromRpcData, authorInitials } from "../lib/profiles/author-identity";
import { parseThemePreference, resolveTheme, settingsSections } from "../lib/settings/settings-contracts";

const baseCover = { cover_image: null, cover_storage_path: null, cover_mime_type: null, cover_file_size: null };
const publicCoverUrl = (path: string) => `https://forge.supabase.co/storage/v1/object/public/${courseCoverBucket}/${path}`;

test("cover: existing cover_image URLs and legacy bucket paths remain renderable", () => {
  assert.deepEqual(courseCoverPresentation({ ...baseCover, cover_image: "https://cdn.example.test/legacy.jpg" }, publicCoverUrl), {
    url: "https://cdn.example.test/legacy.jpg", altText: null, source: "legacy",
  });
  assert.equal(courseCoverPresentation({ ...baseCover, cover_image: "legacy/cover.webp" }, publicCoverUrl)?.url, publicCoverUrl("legacy/cover.webp"));
});

test("cover: uploaded cover_storage_path is canonical and takes precedence over cover_image", () => {
  const presentation = courseCoverPresentation({
    cover_image: "https://cdn.example.test/legacy.jpg",
    cover_storage_path: "course-a/cover.webp",
    cover_mime_type: "image/webp",
    cover_file_size: 512,
  }, publicCoverUrl);
  assert.equal(presentation?.url, publicCoverUrl("course-a/cover.webp"));
  assert.equal(presentation?.source, "storage");
});

test("cover: no cover and invalid legacy URL use the DS fallback", () => {
  assert.equal(courseCoverPresentation(baseCover, publicCoverUrl), null);
  assert.equal(courseCoverPresentation({ ...baseCover, cover_image: "javascript:alert(1)" }, publicCoverUrl), null);
  const visual = readFileSync("components/course/CourseCoverVisual.tsx", "utf8");
  assert.match(visual, /image\?\.complete && image\.naturalWidth === 0/);
});

test("cover: validates the existing bucket size and accepted image formats", () => {
  assert.equal(courseCoverBucket, "course-covers");
  assert.equal(validateCourseCoverUpload("image/jpeg", 1024).ok, true);
  assert.equal(validateCourseCoverUpload("image/gif", 1024).ok, true);
  assert.equal(validateCourseCoverUpload("image/svg+xml", 1024).ok, false);
  assert.equal(validateCourseCoverUpload("image/png", courseCoverMaxBytes + 1).ok, false);
});

test("cover mutation stays owner-only and uses only the existing cover fields and bucket", () => {
  const action = readFileSync("app/app/courses/cover-actions.ts", "utf8");
  assert.match(action, /course\.teacher_id !== user\.id/);
  assert.doesNotMatch(action, /resolveCourseCapabilities|course_media_resources|cover_media_id/);
  assert.match(action, /storage\.from\(courseCoverBucket\)/);
  assert.match(action, /course\.teacher_id\}\/\$\{courseId\}\/\$\{crypto\.randomUUID\(\)\}/);
  assert.match(action, /cover_storage_path:/);
  assert.match(action, /cover_mime_type:/);
  assert.match(action, /cover_file_size:/);
  const removal = action.slice(action.indexOf("export async function removeCourseCoverAction"));
  assert.match(removal, /!hasUploadedCover \? \{ cover_image: null \}/);
  assert.match(removal, /remove\(\[uploadedPath\]\)/);
});

test("migration does not introduce parallel cover or avatar storage fields", () => {
  const migration = readFileSync("supabase/migrations/20261012124213_i11b_profile_identity_convergence_v1.sql", "utf8");
  assert.doesNotMatch(migration, /cover_media_id|avatar_path/);
  assert.match(migration, /add column if not exists headline/);
  assert.match(migration, /add column if not exists location/);
  assert.match(migration, /add column if not exists bio/);
  assert.match(migration, /create table if not exists public\.profile_domains/);
});

test("remix contract explicitly starts without a cover", () => {
  const path = "supabase/migrations/20261006000000_add_course_remix_provenance_v1.sql";
  const sql = readFileSync(path, "utf8");
  const insert = sql.slice(sql.indexOf("insert into public.courses ("), sql.indexOf("returning id into new_course_id;"));
  assert.match(insert, /cover_image,\s*duration_minutes/);
  assert.match(insert, /published_at,\s*cover_storage_path,\s*cover_mime_type,\s*cover_file_size/);
  assert.match(insert, /'preview'::public\.course_availability,\s*null,\s*null,\s*source_course\.format/);
  assert.match(insert, /null,\s*null,\s*null,\s*null,\s*false/);
});

test("avatar: accepts the supported formats under the public bucket limit", () => {
  assert.equal(validateAvatarUpload("image/png", 1000).ok, true);
  assert.equal(validateAvatarUpload("image/gif", 1000).ok, false);
  assert.equal(validateAvatarUpload("image/png", avatarMaxBytes + 1).ok, false);
});

test("avatar: stable public URLs map back only to the current user's own object", () => {
  const path = avatarStoragePath("u1", "image/webp", "tok");
  const prefix = "https://forge.supabase.co/storage/v1/object/public/profile-avatars/";
  assert.equal(path, "u1/avatar-tok.webp");
  assert.equal(avatarStoragePathFromPublicUrl("u1", `${prefix}${path}`, prefix), path);
  assert.equal(avatarStoragePathFromPublicUrl("u2", `${prefix}${path}`, prefix), null);
  assert.equal(avatarStoragePathFromPublicUrl("u1", `https://elsewhere.test/${path}`, prefix), null);
  assert.equal(isOwnAvatarPath("u1", path), true);
  assert.equal(isOwnAvatarPath("u1", "u1/subfolder/avatar.webp"), false);
  assert.equal(safeAvatarUrl("javascript:alert(1)"), null);
  assert.equal(safeAvatarUrl("https://cdn.example.test/avatar.webp"), "https://cdn.example.test/avatar.webp");
});

test("avatar: storage and profile writes use canonical avatar_url and authenticated self", () => {
  const actions = readFileSync("app/app/profile/actions.ts", "utf8");
  const repository = readFileSync("lib/profiles/self-profile-repository.ts", "utf8");
  assert.match(actions, /update\(\{ avatar_url: avatarUrl \}\)\.eq\("id", user\.id\)/);
  assert.match(actions, /update\(\{ avatar_url: null \}\)\.eq\("id", user\.id\)/);
  assert.match(actions, /select\("avatar_url"\)/);
  assert.doesNotMatch(actions, /avatar_path/);
  assert.match(repository, /select\("headline,location,bio,avatar_url"\)/);
  assert.match(repository, /avatarUrl: safeAvatarUrl\(typeof extras\?\.avatar_url/);
});

test("avatar: safe public projection exposes only name and avatar, never private fields", () => {
  const migration = readFileSync("supabase/migrations/20261012124213_i11b_profile_identity_convergence_v1.sql", "utf8");
  const publicProjection = migration.slice(migration.indexOf("create or replace function public.get_public_course_author"), migration.indexOf("revoke all on function public.get_public_course_author"));
  assert.match(publicProjection, /profile\.name,\s*profile\.avatar_url/);
  assert.doesNotMatch(publicProjection, /profile\.(email|bio|headline|location)/);
  assert.match(publicProjection, /course\.status = 'published'/);
  assert.match(publicProjection, /course\.visibility = 'public'/);
  assert.match(migration, /get_course_owner_identity/);
});

test("avatar: collaborator and remix projections stay capability-scoped", () => {
  const migration = readFileSync("supabase/migrations/20261012124213_i11b_profile_identity_convergence_v1.sql", "utf8");
  const collaborators = migration.slice(migration.indexOf("create or replace function public.list_course_collaborators"), migration.indexOf("revoke all on function public.list_course_collaborators"));
  const candidates = migration.slice(migration.indexOf("create or replace function public.search_course_collaborator_candidates"), migration.indexOf("revoke all on function public.search_course_collaborator_candidates"));
  assert.match(collaborators, /private\.forge_is_course_owner\(target_course_id\)/);
  assert.match(collaborators, /status::text,\s*profile\.avatar_url/);
  assert.match(candidates, /private\.forge_is_course_owner\(target_course_id\)/);
  assert.match(candidates, /profile\.name,\s*profile\.avatar_url/);
  assert.match(readFileSync("lib/courses/collaborator-repository.ts", "utf8"), /list_course_collaborators/);
  assert.match(readFileSync("lib/courses/collaboration-request-repository.ts", "utf8"), /list_course_collaboration_requests/);
  assert.match(readFileSync("lib/courses/provenance-repository.ts", "utf8"), /getPublicCourseAuthor/);
});

test("avatar: owner projections parse safe avatar URLs and retain initials fallback", () => {
  assert.deepEqual(publicAuthorIdentityFromRpcData([{ profile_id: "author-id", name: "Chandra Neutral", avatar_url: "https://forge.test/avatar.png" }]), {
    displayName: "Chandra Neutral", initials: "CN", avatarUrl: "https://forge.test/avatar.png",
  });
  assert.equal(authorInitials("Chandra Neutral"), "CN");
  assert.equal(publicAuthorIdentityFromRpcData([{ profile_id: "author-id", name: "A", avatar_url: {} }]), null);
});

test("profile: bio, headline, location, domains and mutation ownership", () => {
  assert.equal(profileDetailsSchema.safeParse({ headline: "Créateur", location: "PACA", bio: "Bio" }).success, true);
  assert.equal(profileDetailsSchema.safeParse({ headline: "x".repeat(121), location: "", bio: "" }).success, false);
  const domainId = "11111111-1111-4111-8111-111111111111";
  assert.deepEqual(profileDomainIdsSchema.parse([domainId, domainId]), [domainId]);
  assert.equal(profileDomainIdsSchema.safeParse(["not-uuid"]).success, false);
  assert.match(readFileSync("supabase/migrations/20261012150000_i11b_profile_fields_update_privilege.sql", "utf8"), /grant update \(headline, location, bio\) on table public\.profiles to authenticated/i);
  const actions = readFileSync("app/app/profile/actions.ts", "utf8");
  assert.match(actions, /profile_domains/);
  assert.match(actions, /eq\("profile_id", user\.id\)/);
  assert.doesNotMatch(actions, /formData\.get\("(user|profile)_?[iI]d"\)/);
});

test("settings: only preferences is active and theme preference parses", () => {
  assert.deepEqual(settingsSections.map((section) => section.label), ["Compte", "Préférences", "Notifications", "Forge AI", "Confidentialité", "Facturation"]);
  assert.deepEqual(settingsSections.filter((section) => section.href).map((section) => section.id), ["preferences"]);
  assert.equal(parseThemePreference("dark"), "dark");
  assert.equal(parseThemePreference(null), "system");
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("light", true), "light");
});
