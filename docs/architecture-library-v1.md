# Library V1 — unified projection

Route: `/app/library` (nav entry « Bibliothèque »; hidden from the 5-column mobile bottom bar like Classroom, reachable from « Mes parcours »).

## Projection, not a model
The Library is a UI-only `LibraryItem` projection (`lib/library/library-items.ts`) over three unchanged tables. No table is merged, no migration, nothing persisted:

| Kind | Label | Table | Bucket |
|---|---|---|---|
| media | Médias | `course_media_resources` | `course-media` |
| resource | Ressources pédagogiques (learner material) | `resources` | `resources` |
| source | Sources Forge (context for Forge only) | `course_sources` | `course-sources` |

Wording is never flattened to « ressource » generically.

## Permissions
Computed from `resolveCourseCapabilities`; no widening.
- Owner: media, resources, sources of own courses; delete per object contract.
- Active editor: media only (resources/sources are owner-managed); cannot delete media (`canDeleteMedia` = owner).
- Viewer / learner: nothing. No cross-user browsing.

## Orphan detection
Media has no lesson column. A media is « Référencé » when a `:::image` / `:::audio` directive (`resource=<id>`) in a lesson of the same course points at it (`resourceIdsInRichContent`). Otherwise « Non référencé ». Nothing is auto-cleaned.

## Delete safety
- Media: `deleteLibraryMediaAction(mediaId)` takes only the id. Course and storage path come from the DB row. Requires the course owner, re-scans all lessons of the course and refuses with `referenced`. The row is deleted first, then the file (`storage_delete_failed` if cleanup fails).
- Resources / sources reuse the existing owner-only delete actions.
- The UI disables delete for referenced media.

## Storage URL strategy
Signed URLs (300 s) from the caller's session, never persisted. Thumbnails resolve lazily for the visible page (24 per batch, one `createSignedUrls` call); previews sign one URL on open; PDFs reuse `PdfViewer` and the existing PDF URL actions.

## Deviations from UJ11
Modal preview instead of side panel; no checkboxes, Forge AI panel, domain filter or « Ajouter » CTA; modules have no route so context links to the course.

## Deferred
Folders, collections, tags, favorites, bulk actions/delete, drag/drop, versioning, AI classification/search, auto-cleanup, duplicate detection, cross-course media reuse.
