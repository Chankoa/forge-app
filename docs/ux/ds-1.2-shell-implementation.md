# Forge DS 1.2 shell foundation

## Scope and architecture

`AppShell` now supplies one authenticated navigation rail and topbar to ordinary and course routes. Course content continues through the existing `CourseWorkspace`, `WorkspacePanels`, `CourseOutlineRail`, and `ForgeRail`; their routing, data loading, authoring, and AI actions are unchanged. The shell does not write URL state, so toggling a rail or Forge mode leaves the active course and lesson route intact.

The desktop global rail has expanded (220 px, icon and label) and collapsed (68 px, icon) states. The current route uses a violet indicator, selected surface, and `aria-current`. At 701–1099 px the existing compact responsive strategy presents icon navigation; at 700 px and below the existing bottom navigation remains. The topbar retains the existing theme and sign-out actions. This checkout has no authenticated topbar search, notifications, or profile control to carry over.

The reusable `DomainMetadata` component displays only supplied domain and sub-domain values. `CourseWorkspace` supplies the real domain name on overview, editor, and learner routes. The current course projection has no sub-domain field, so no sub-domain is fabricated.

## Forge and accessibility

The Forge container has `collapsed`, `docked`, and `focus` states. Docked uses the existing AI controls and contextual course or lesson text at roughly 320–340 px. Collapsed leaves a labelled vertical trigger. Focus presents the same mounted Forge content in a wider modal surface; it does not create a second AI session. Closing focus returns to docked and restores focus to its launcher. Escape closes the active focus or drawer; the modal traps Tab and Shift+Tab. The native proposal dialog and its existing application flow remain separate and intact.

Primary shell targets use at least 44 px where practical. Icon-only links and buttons have accessible names; the global rail and panels retain visible focus. The rail transition respects reduced-motion preference.

## Styling and responsive behaviour

DS 1.1 colours and controls remain the foundation. `styles/themes.scss` adds semantic aliases for the dark rail, its selected state, shell separator, and overlay. `styles/globals.scss` applies the shared rail and Forge focus layout. Structure and Forge use the existing drawer interaction up to 1279 px; extending the former 1099 px breakpoint prevents the global rail from squeezing three permanent columns at intermediate widths. Mobile has no permanent workspace rails. No page hero or dense page content was redesigned.

The governing README names `styles/app.scss`, which is absent in this checkout. The stylesheet loaded by `app/layout.tsx` is `styles/globals.scss`; the governing README was left unchanged.

## Reference differences and deferred work

The static UJ06/UJ07 PNGs show a light horizontal global navigation, while the DS 1.2 shell rule and interactive reference specify a dark collapsible rail. The latter governs this shell. The interactive reference includes mock suggestions and a sub-domain; production continues to show real Forge results and only available domain data. Focus is a modal workspace because the existing panel and proposal interaction already support modal focus management. UJ05, UJ06, UJ07 and other page content, atmospheric heroes, and future product features remain for later sprints.

## Validation

`npm test` passed 132 tests, including the Forge state transitions. `npm run typecheck`, `npm run lint`, and `npm run build` passed. In a connected local browser session, the course workspace, Creator editor, and Learner lesson rendered with real data and no observed browser-console errors or framework overlay. At the browser's 768 CSS px viewport, the Structure and Forge drawers opened; Forge focus trapped Shift+Tab, Escape returned focus to the focus launcher, and a second Escape closed the drawer and returned focus to its trigger. The URL and selected lesson stayed stable. The available in-app browser could not be resized, so 1440 px, intermediate desktop, and under-700 px mobile visual checks remain unverified.
