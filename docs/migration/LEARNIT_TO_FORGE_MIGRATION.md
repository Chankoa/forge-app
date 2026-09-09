# LearnIt to Forge Migration Matrix

LearnIt is read-only functional reference. No LearnIt UI directory was copied.

| Element | LearnIt location | Category | Decision | Reason | Forge destination |
| --- | --- | --- | --- | --- | --- |
| Course, module, lesson concepts | `types/`, `data/`, `supabase/` | Domain | REUSE | Stable business vocabulary, independent of UI | `lib/courses/` contracts |
| Supabase schema, memberships, enrollments, progress | `supabase/` | Backend | REUSE | Shared existing backend; no F0 mutation | Future repositories |
| Supabase browser/server access | `supabase/` | Infrastructure | PORT | Must be narrowed to Forge env and App Router | `lib/supabase/` |
| Auth callback and safe redirect | `app/`, `lib/` | Auth | PORT | Valid boundary, reimplemented for canonical routes | `app/auth/callback`, `lib/auth/` |
| Capability resolver | `app/`, `lib/` | Domain | PORT | Relationship-based model replaces global role UX | `lib/capabilities/` |
| Discoverable course reading | `data/`, `app/` | Repository | PORT | Real backend proof without legacy Explore UI | `lib/courses/explore-repository.ts` |
| DS 1.1 and user journeys | `docs/` | Design | REUSE | Normative references copied before F0 | `docs/design/`, `styles/` |
| Public, app and course shells | legacy UI shells | UI | REWRITE | Forge has three canonical shell layers | `components/shell/`, `components/course/` |
| Explore cards and navigation | legacy Explore UI | UI | REWRITE | New navigation and DS1 composition | `app/app/explore/` |
| Learner/Teacher routes and shells | `app/learner`, `app/teacher`, `/learn` | Legacy UI | DROP | Global role architecture is prohibited | Not migrated |
| Role-gated UI and bridge code | legacy components | Legacy UI | DROP | `profiles.role` is compatibility only | No runtime UI use |
| Historical styles and responsive patches | legacy styles | CSS | DROP | Coupled to abandoned shells | Not migrated |