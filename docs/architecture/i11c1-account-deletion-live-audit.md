# I.11.C.1 — Account deletion live audit

Status: deletion remains disabled. This note records the read-only live FK results supplied for the I.11.C.1 audit and the cleanup design still required before implementation. No live schema changes were made.

## Live foreign-key map

The following is the live result provided for this sprint. `CASCADE` and `SET NULL` describe database actions; they do not by themselves establish that deleting the referenced account is product-safe.

| Source table.column | Target | Live `ON DELETE` | Classification / effect |
|---|---|---|---|
| `public.profiles.id` | `auth.users.id` | `CASCADE` | Auth-user deletion removes the profile. Delete Auth last; do not manually delete the profile first. |
| `public.ai_generations.user_id` | `public.profiles.id` | `CASCADE` | Account-scoped generated-history rows are removed. |
| `public.course_collaboration_requests.requester_id` | `public.profiles.id` | `CASCADE` | Requests made by this account are removed. Requests resolved by this account are retained with `resolved_by` cleared below. |
| `public.course_memberships.user_id` | `public.profiles.id` | `CASCADE` | The account's memberships are removed; other users' memberships are unaffected. |
| `public.course_sources.teacher_id` | `public.profiles.id` | `CASCADE` | Source metadata rows attributed to the account are removed. Exact private source objects need separate cleanup. |
| `public.enrollments.user_id` | `public.profiles.id` | `CASCADE` | The account's enrollments are removed. |
| `public.favorites.user_id` | `public.profiles.id` | `CASCADE` | The account's favorites are removed. |
| `public.lesson_progress.user_id` | `public.profiles.id` | `CASCADE` | The account's learning progress is removed. |
| `public.notes.user_id` | `public.profiles.id` | `CASCADE` | The account's notes are removed. |
| `public.profile_domains.profile_id` | `public.profiles.id` | `CASCADE` | The account's domain selections are removed. |
| `public.course_collaboration_requests.resolved_by` | `public.profiles.id` | `SET NULL` | Requests are retained; resolver attribution is cleared. |
| `public.course_memberships.invited_by` | `public.profiles.id` | `SET NULL` | Memberships belonging to other users are retained; inviter attribution is cleared. |
| `public.courses.teacher_id` | `public.profiles.id` | `SET NULL` | A course can be left without an owner at the database level. Product policy blocks account deletion whenever owned courses exist. |
| `public.resources.created_by` | `public.profiles.id` | `SET NULL` | Resource rows are retained and creator attribution is cleared. |
| `public.course_media_resources.created_by` | `public.profiles.id` | `RESTRICT` | **Deletion blocker.** A media row attributed to this profile prevents profile deletion. The media may still be referenced by lesson content and must not be blindly deleted. |

This table is limited to the FK rows supplied for the audit. Classroom-specific relations and any additional activity/audit tables were not represented in the supplied result and remain unverified. The live `course_media_resources.created_by` target/action also differs from the checked-in I.10.C migration definition (`auth.users`, default `NO ACTION`); the live audit takes precedence for runtime planning. Do not infer or migrate this difference without a separately reviewed schema change.

## Dependency classification

### Cascade-safe account-scoped rows

Subject to the application-level owner-course blocker and the storage work below:

- `ai_generations.user_id`
- `course_collaboration_requests.requester_id`
- `course_memberships.user_id`
- `enrollments.user_id`
- `favorites.user_id`
- `lesson_progress.user_id`
- `notes.user_id`
- `profile_domains.profile_id`

These rows belong to the deleted profile and the live FK removes only rows linked through that user column. `course_memberships.invited_by` is a separate `SET NULL` relation; it preserves other members' rows.

### Manual cleanup required

- `course_sources.teacher_id`: the FK cascades source metadata, but file-backed sources have exact objects in the private `course-sources` bucket. Build a manifest from the user's source rows and remove only those exact `(bucket, storage_path)` objects. Do not delete by a user-ID prefix.
- Profile avatar: resolve the exact current `avatar_url` back to a validated path in the user's own `profile-avatars` namespace; include it in a cleanup manifest. Never wildcard-delete a prefix.
- `course_media_resources.created_by`: preserve lesson media and its metadata. See the anonymization proposal below; deleting media rows or their objects can break lessons.
- Any unverified user-linked Storage rows or activity tables: audit exact references before cleanup; do not assume FK cascades remove Storage objects.

### Retain / anonymize

- `course_collaboration_requests.resolved_by`: live `SET NULL` preserves the request while removing the profile attribution.
- `course_memberships.invited_by`: live `SET NULL` preserves the membership while removing inviter attribution.
- `resources.created_by`: live `SET NULL` preserves the resource.
- `course_media_resources`: preserve the row, object, and lesson content. Do not transfer authorship to the course owner; that would falsely attribute creation to another person.

### Blocker

- Any `courses.teacher_id` row for the account blocks deletion as a product rule, notwithstanding live `SET NULL`.
- Any `course_media_resources.created_by` row blocks profile deletion under the live `RESTRICT` FK. A zero owned-course count does not prove this relation is empty.
- Failure to obtain a complete user-dependency or exact-storage manifest blocks deletion.

## Storage policy for a future deletion flow

1. Construct a server-side manifest from authenticated-user-scoped rows and the profile's current avatar URL. Validate every bucket/path against its expected bucket and namespace.
2. Remove only exact avatar and `course-sources` object paths whose references are being removed. Treat failures as incomplete cleanup; do not report deletion success.
3. Keep course media objects and rows, because lesson content can reference their resource IDs. Anonymize the creator relation rather than removing the media.
4. Keep course-cover objects referenced by any surviving course. Do not infer deletable covers from a path prefix, and never bulk-delete a user namespace.
5. Persist/retry exact cleanup work if Storage removal cannot be made atomic with database/Auth deletion. A database/Auth success with untracked orphaned private files must not be presented as fully cleaned.

## Required schema evolution for media anonymization

Do not change the live FK as part of this audit. Before enabling deletion, review a migration that:

1. makes `course_media_resources.created_by` nullable;
2. changes its FK to `ON DELETE SET NULL` (or otherwise provides equivalent safe anonymization);
3. updates application types/validation to accept a null creator;
4. keeps existing media rows, storage objects, and lesson references intact.

This is preferred over deleting media or reassigning it to a course owner. It preserves authored learning content without claiming another person created it.

## Proposed deletion order and atomicity guard

Deletion is **not safe to implement yet**. A future server-only flow should:

1. Resolve the user from the server-verified Auth session; accept no client-supplied user ID.
2. Establish a server-side deletion-in-progress guard so new course creation, media/source writes, or memberships cannot race cleanup. A mere count followed by an Auth Admin API call is not atomic with concurrent writes; the live `courses.teacher_id ON DELETE SET NULL` makes this especially important.
3. In a trusted database transaction/RPC, lock/recheck the profile and count `courses.teacher_id = auth user id`; abort if nonzero.
4. Ensure the reviewed media-anonymization migration is deployed; set exact authored media rows' `created_by` to `NULL`, preserving the records and objects.
5. Build and persist the exact avatar/source-object cleanup manifest; clear/remove only those user-private references and fail closed if required cleanup cannot be tracked.
6. Delete the Auth user last through a server-only privileged capability. Auth deletion cascades to `profiles`; profile cascades clear the listed account-owned rows, and `SET NULL` relations preserve shared rows. Do not manually delete the profile first.
7. Complete/retry exact Storage cleanup from the persisted manifest, invalidate the session, and report partial cleanup honestly if any object removal fails.

The guard and database transaction are a design requirement, not implemented here. The exact mechanism must be selected and reviewed before implementation; do not rely on a non-atomic `count()` followed by `auth.admin.deleteUser()`.

## QA fixture

Use a newly provisioned disposable Auth account with a disposable profile, zero owned courses, test-only membership/enrollment/progress/notes/favorite rows, and an optional own avatar. Do not use a main/demo/owner account. Media authored on shared courses should be tested with a lesson that references it, verifying the row/object/content survive while creator attribution becomes null. Verify Storage cleanup by exact object paths and confirm no shared covers or course media are removed.

## Current decision

- Live FK audit: supplied FK rows recorded; completeness of classroom/activity/storage relations remains unverified.
- Owner blocker: remains mandatory.
- Media creator cleanup: preserve and anonymize; requires reviewed nullable/`SET NULL` schema migration.
- Account deletion: disabled. Do not implement the privileged path until the missing live relations are verified, media migration is approved/deployed, and race-safe deletion guard is designed.
