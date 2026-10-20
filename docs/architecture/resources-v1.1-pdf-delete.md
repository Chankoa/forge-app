# Resources V1.1 — PDF reader and safe deletion

Two distinct objects, never mixed:

| | Source (Forge) | Pedagogical resource |
|---|---|---|
| Table | `course_sources` | `resources` |
| Bucket | private `course-sources` | private `resources` |
| Purpose | documentary context used by Forge | support explicitly attached to a lesson |
| Learners | **no access** (enrollment grants nothing; learn-mode Forge ignores sources) | read-only, enrolled/free access on a published course |
| Authoring | owner only | owner only |
| UI wording | "source" | "ressource" |

A source never becomes a learner resource automatically. Source PDFs have no text extraction, so Forge cannot use them; the editor accepts TXT/MD/web for sources and PDF for resources.

## Pedagogical resources (`resources`)
- Upload (`uploadLessonResourceAction`): owner only, lesson must belong to the course. Validation is server-side: MIME `application/pdf`, `.pdf` extension, `%PDF-` magic bytes, 1 byte to 10 MB. Path `{owner}/{course}/{lesson}/{uuid}-{file}`; row `type=download`, `access=enrolled`. The file is removed if the insert fails.
- Read (`getLessonResourcePdfUrlAction`): resource scoped to the course, PDF by MIME/bucket/path, owner or enrolled learner (premium hidden); 300 s signed URL generated per open, never stored.
- Delete (`deleteLessonResourceAction`): owner only, owned path, reference count must be 1 (else `resource_in_use`), DB row then Storage object.

## Source PDF access (owner only)
- A source is a readable PDF only if `type = pdf`, `source_kind = file`, `mime_type = application/pdf`, bucket `course-sources` and a path exist (never the extension).
- `getSourcePdfUrlAction(courseSlug, sourceId)` resolves the course and source server-side (source must belong to the course), allows the owner only, and returns a 300 s signed URL created with the user's session (Storage RLS stays authoritative). The URL is generated on every open, kept in memory only, never stored. The client never sends a Storage path.
- `PdfViewer` is one shared native `<dialog>` + `<iframe>` taking a `loadUrl` loader; used by both the sources and the pedagogical resources panels. No PDF parsing, OCR or indexing.

## Source delete contract
- `deleteForgeSourceAction(courseSlug, sourceId)`: auth → course by slug → owner only (editors/viewers/learners denied, as `canManageSources = isOwner`) → source scoped to the course → storage path must match `{owner}/{course}/…` → reference count on `(bucket, path)` must be 1 (else `resource_in_use`, nothing deleted) → delete DB row → remove Storage object.
- Errors are normalised: `permission_denied`, `not_found`, `invalid_request`, `invalid_storage_path`, `resource_in_use`, `db_delete_failed`, `storage_delete_failed`.
- Atomicity: DB and Storage are not transactional. The row is deleted first so DB constraints can veto before any file is destroyed; if file removal then fails, an unreferenced object remains (logged without path) and the list is still refreshed.
- Shared boundary: no row can currently share a file (unique path); if that ever changes, the count check blocks destruction.
