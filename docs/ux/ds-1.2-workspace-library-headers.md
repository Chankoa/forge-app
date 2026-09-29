# DS 1.2 E.1 — Workspace, My Paths and course headers

## Workspace

`app/app/page.tsx` keeps the existing authenticated Forge intention flow first. `WorkspaceSections` then renders one selected continuation, up to three real courses in **Mes parcours**, and one real learner-linked course in **Apprendre**. Selection and destination URLs come from `lib/courses/workspace-view.ts`; the course and lesson data still come from `listMyCourses`. At desktop widths, `WorkspaceContextRail` sits to the right; it follows the main column at intermediate and mobile widths.

The Forge rail links only to existing Create, Creator lesson and Learner lesson contexts. It does not generate results itself. Recommendations explicitly state that personalization is unavailable and link to the existing Explore route. The Explorer section links only to existing routes. No recommendation engine, ranking, resource route or unsupported Forge action was added.

## My Paths

`CourseLibrary` starts in **Liste**, with aligned **Parcours / Rôle / Statut / Modules / Actions** columns. **Cartes** uses the same `LibraryCourse` records and the same action decision. Search and role filters remain local; a real-state status filter and title/progress sort are also local. The view choice lasts only for the mounted page. `PersonalCourseRow` and `PersonalCourseCard` share domain, role, status and progress presentation.

The repository does not expose a dependable last-activity or course update date to this view, so the reference's **Dernière activité** column and its sort are omitted. Module and lesson counts come from the loaded outline. Unknown duration is omitted rather than shown as zero. No preference or course data is persisted by the view toggle.

## Shared course headers and overview

`CourseIdentityHeader` gives Creator and Learner the same **domain → title with status → relevant description and relationship → actions** grammar. Domain and relationship are not repeated in the Learner inner overview. The Learner overview presents the existing course subtitle or description as purpose text and moves its existing **Commencer / Continuer / Revoir** action into `CourseContextNavigation`'s top action row.

`CourseMetrics` presents the same compact module, lesson and known-duration facts for Creator and Learner. Creator retains real publication readiness; Learner gets one visible progress value and an accessible progress control. The existing lesson selection, progress calculation, save, publication, Forge panels and routes are unchanged.

## Responsive and reference differences

At desktop width, Workspace has main and contextual columns; at 1100 px and below, the contextual rail moves after the main flow. My Paths stacks its table-style rows on mobile, keeps the primary action reachable, and offers a single-column Card view. Course header actions retain the validated horizontal scrolling pattern, with the Learner primary action first on mobile. The canonical PNGs guided hierarchy; the interactive reference was unavailable to the read tool during this sprint. Browser viewport and interaction validation remains pending because the local browser automation surface has denied access to `localhost` in this session.

## Deferred

Personalized recommendations, embeddings, new Forge capabilities, a true activity-date column, structural analysis, Explorer/Library redesign, and backend preference storage remain out of scope.
