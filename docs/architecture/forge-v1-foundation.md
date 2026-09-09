# Forge V1 Foundation

Forge exists because converging LearnIt learner, teacher and studio experiences into one legacy UI became increasingly costly. Forge is a greenfield frontend over the brownfield LearnIt backend and business model.

LearnIt remains read-only: it supplies Supabase contracts, domain vocabulary, capability logic and DS1/user-journey references. Forge owns the canonical UI, routes, navigation and product composition. No legacy UI folders or styles are imported.

## Unified user and capabilities

An identity is not a learner or teacher application. Its capabilities depend on its relationship to a course: enrollment permits viewing and learning; ownership permits viewing, editing and publishing. `profiles.role` remains a possible backend compatibility field only; Forge components do not read it.

## Three shell layers

- **PublicShell** serves `/`, login and registration.
- **AppShell** serves the authenticated workspace and its canonical navigation.
- **CourseWorkspace** serves every course relationship and mode.

« Un parcours = un seul espace. Le contenu reste au même endroit. Seules les capacités disponibles changent. »

CourseWorkspace composes **Parcours | Contenu | Forge**. `view`, `learn` and `edit` are modes, never separate shells. The outline and Forge rails are shared contracts.

## Canonical routes

`/`, `/login`, `/register`, `/auth/callback`, `/app`, `/app/explore`, `/app/courses`, `/app/create`, `/app/courses/[courseSlug]`, and `/app/courses/[courseSlug]/lessons/[lessonSlug]` are canonical. Legacy `/learn`, `/app/learner`, and `/app/teacher` routes are prohibited.

## Shared backend and progressive migration

Forge uses the existing LearnIt Supabase project through server/browser clients and public environment variables. F0 makes no migration, RLS, policy, trigger or role-data changes. Discover reads published courses when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured. The current schema mapping is deliberately isolated in its repository.

## Roadmap

- **F0:** foundation, shells, DS1, capabilities, auth boundary and real Explore read.
- **F1:** Discover and Learn: enrollment, course/lesson data and progress.
- **F2:** Create and Edit: intent, authoring, sources and Forge authoring.
- **F3:** Publish and dual capability: publishing, participants, Learn/Edit convergence.

Collaboration, invitations, comments, remix, versioning, marketplace and administration follow F3.