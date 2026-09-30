# DS 1.2 E.2 — Creator, course presentation and Explorer

## Creator cockpit

`CourseEditor` keeps the existing Informations / Structure / Sources tabs and server actions. The heading, field labels, spacing and save placement are quieter. Module and lesson rename forms now open from native `details` controls beside the item they change; their explicit submit actions and persistence remain the same. Module disclosure, preview, edit and add actions are unchanged.

## Workspace and My Paths

Workspace continuation and compact course rows retain their real course selection, role, progress and destinations. They now align cover, identity, metadata and action more consistently with My Paths. The shared `CourseCover` fallback is neutral in these authenticated course contexts; no imagery was fabricated.

My Paths keeps List as its default and preserves its local search, role/status filters, sort and Card toggle. List actions occupy a stable column on wide screens and stack before the available width becomes too narrow. Card view uses the same records and action resolution as List, with domain, relationship and status together at the top, compact `CourseFacts` icons for known module/lesson/duration values, and one visible primary action. The existing owner menu remains available but visually secondary. The card grid fits four, three, two or one columns according to available width; no preference is persisted.

## Explorer

`ExploreCatalog` receives the existing public-course projection from `listDiscoverableCourses`. Search and domain buttons filter the loaded data locally. The first three matching courses appear in **À découvrir**; all remaining matches appear in a compact **Autres parcours publiés** list. The repository's existing `created_at` order is retained without a new score or ranking. Course detail links and existing enrollment/continuation controls remain available; management actions are absent from discovery cards.

The Explorer right column lists only domains present on loaded public courses and links to the real Create route. The shared `CourseFacts`, `CourseCover` and `DomainMetadata` primitives connect its visual language to Workspace and My Paths while its larger discovery cards remain distinct from the personal library.

## Real-data limits and reference differences

The earlier public-course projection did not expose dependable domain values because it read the Supabase many-to-one domain relation as an array only. Sprint F corrects that mapping and includes the existing course level field. Domain filters now use only domains present on published courses, and supported level values render as Débutant / Intermédiaire / Avancé. A missing domain or level is omitted from editorial metadata. **Autres parcours publiés** still replaces the mockup's **Récemment publiés** claim because the catalogue does not use a reliable publication timestamp. No resource section or personalized recommendation is shown. The canonical imagery is represented by the existing neutral Forge cover fallback because the loaded courses have no supported image field.

## Responsive and validation

The cockpit and Workspace rows stack at narrow widths. My Paths switches its List rows to a compact two-column composition by 900 px and its Card grid responds to actual available width. Explorer moves its contextual column below the catalogue by 1100 px; featured cards become two columns there and one column by 700 px. Mobile filters stay inside the viewport and the existing bottom-navigation inset remains unchanged.

Authenticated browser review checked Workspace, My Paths, Explorer and Creator at 1440, 1100, 430 and 390 px. Search, Card toggle, Structure tab and inline rename disclosure were exercised without persisting edits. No page-level horizontal overflow was observed at those widths. The interactive reference site was unavailable to the read tool, so its architecture and unsupported mockup data were not copied.

## Deferred

Publication timestamps, course imagery, resources, levels and author metadata require reliable product data before being represented. Recommendation engines, personalization, ranking, UJ11 Library, UJ13 Course detail and structural editing remain outside this sprint.
