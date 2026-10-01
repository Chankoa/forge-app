-- I.2: course-scoped collaboration.
--
-- Canonical ownership remains public.courses.teacher_id.
--
-- I.2 active roles:
--   editor  -> bounded course/module/lesson authoring
--   viewer  -> private read-only access
--
-- Inactive in I.2:
--   contributor
--   participant
--
-- Owner-only:
--   publication
--   archive / restore
--   collaborator management
--   enrollments
--   sources
--   resources
--   Storage
--   destructive structure operations


-- ============================================================
-- 1. COURSE-SCOPED ROLE RESOLUTION
-- ============================================================

create or replace function private.forge_has_active_course_role(
  target_course_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_active_account()
    and (
      -- Canonical ownership always comes from courses.teacher_id.
      exists (
        select 1
        from public.courses
        where id = target_course_id
          and teacher_id = (select auth.uid())
      )

      or exists (
        select 1
        from public.course_memberships
        where course_id = target_course_id
          and user_id = (select auth.uid())
          and status = 'active'
          and role::text = any(allowed_roles)
      )
    );
$$;


create or replace function private.forge_can_read_course(
  target_course_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.forge_has_active_course_role(
    target_course_id,
    array['editor', 'viewer']
  );
$$;


create or replace function private.forge_can_author_course(
  target_course_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.forge_has_active_course_role(
    target_course_id,
    array['editor']
  );
$$;


-- These functions are implementation helpers, not public API RPCs.
-- Authenticated users need EXECUTE because RLS policies invoke them.
-- They remain in the non-exposed private schema.

revoke all
on function private.forge_has_active_course_role(uuid, text[])
from public;

revoke all
on function private.forge_can_read_course(uuid)
from public;

revoke all
on function private.forge_can_author_course(uuid)
from public;

grant execute
on function private.forge_has_active_course_role(uuid, text[])
to authenticated;

grant execute
on function private.forge_can_read_course(uuid)
to authenticated;

grant execute
on function private.forge_can_author_course(uuid)
to authenticated;


-- ============================================================
-- 2. COLLABORATOR READ POLICIES
-- ============================================================

drop policy if exists
  "Forge active collaborators can read courses"
on public.courses;

create policy
  "Forge active collaborators can read courses"
on public.courses
for select
to authenticated
using (
  private.forge_can_read_course(id)
);


drop policy if exists
  "Forge active collaborators can read modules"
on public.course_modules;

create policy
  "Forge active collaborators can read modules"
on public.course_modules
for select
to authenticated
using (
  private.forge_can_read_course(course_id)
);


drop policy if exists
  "Forge active collaborators can read lessons"
on public.lessons;

create policy
  "Forge active collaborators can read lessons"
on public.lessons
for select
to authenticated
using (
  private.forge_can_read_course(course_id)
);


-- ============================================================
-- 3. EDITOR COURSE UPDATE POLICY
-- ============================================================

drop policy if exists
  "Forge active editors can update courses"
on public.courses;

create policy
  "Forge active editors can update courses"
on public.courses
for update
to authenticated
using (
  private.forge_can_author_course(id)
)
with check (
  private.forge_can_author_course(id)
);


-- ============================================================
-- 4. EDITOR MODULE POLICIES
-- ============================================================

drop policy if exists
  "Forge active editors can insert modules"
on public.course_modules;

create policy
  "Forge active editors can insert modules"
on public.course_modules
for insert
to authenticated
with check (
  private.forge_can_author_course(course_id)
);


drop policy if exists
  "Forge active editors can update modules"
on public.course_modules;

create policy
  "Forge active editors can update modules"
on public.course_modules
for update
to authenticated
using (
  private.forge_can_author_course(course_id)
)
with check (
  private.forge_can_author_course(course_id)
);


-- IMPORTANT:
-- No editor DELETE policy is created for course_modules.
--
-- Module deletion remains owner-only and subject to the existing
-- empty-module protection. This avoids cascade deletion of lessons,
-- learner progress, notes and other dependent data.


-- ============================================================
-- 5. EDITOR LESSON POLICIES
-- ============================================================

drop policy if exists
  "Forge active editors can insert lessons"
on public.lessons;

create policy
  "Forge active editors can insert lessons"
on public.lessons
for insert
to authenticated
with check (
  private.forge_can_author_course(course_id)

  -- Preserve course/module structural integrity.
  and exists (
    select 1
    from public.course_modules
    where course_modules.id = lessons.module_id
      and course_modules.course_id = lessons.course_id
  )
);


drop policy if exists
  "Forge active editors can update lessons"
on public.lessons;

create policy
  "Forge active editors can update lessons"
on public.lessons
for update
to authenticated
using (
  private.forge_can_author_course(course_id)
)
with check (
  private.forge_can_author_course(course_id)

  -- Preserve course/module structural integrity.
  and exists (
    select 1
    from public.course_modules
    where course_modules.id = lessons.module_id
      and course_modules.course_id = lessons.course_id
  )
);


-- No editor DELETE policy for lessons in I.2.


-- ============================================================
-- 6. COURSE UPDATE BOUNDARY
-- ============================================================

create or replace function private.enforce_forge_editor_course_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  -- Canonical owner remains unrestricted by this editor-specific guard.
  --
  -- IS DISTINCT FROM is intentional: unlike <>,
  -- it behaves correctly when teacher_id is NULL.

  if old.teacher_id is distinct from (select auth.uid())
     and private.forge_can_author_course(old.id)
  then

    if
      (
        to_jsonb(new)
        - array[
            'title',
            'subtitle',
            'description',
            'domain_id',
            'updated_at'
          ]
      )
      is distinct from
      (
        to_jsonb(old)
        - array[
            'title',
            'subtitle',
            'description',
            'domain_id',
            'updated_at'
          ]
      )
    then
      raise exception
        'Editors may only update course metadata';
    end if;

  end if;

  return new;
end;
$$;


-- ============================================================
-- 7. MODULE WRITE BOUNDARY
-- ============================================================

create or replace function private.enforce_forge_editor_module_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if tg_op = 'INSERT' then

    -- Owner insert behavior remains unchanged.
    --
    -- A collaborator editor may only create a module as draft.

    if not exists (
      select 1
      from public.courses
      where id = new.course_id
        and teacher_id = (select auth.uid())
    )
    and private.forge_can_author_course(new.course_id)
    and new.status <> 'draft'
    then
      raise exception
        'Editors may only create draft modules';
    end if;


  elsif tg_op = 'UPDATE' then

    if not exists (
      select 1
      from public.courses
      where id = old.course_id
        and teacher_id = (select auth.uid())
    )
    and private.forge_can_author_course(old.course_id)
    then

      -- Editor module updates are intentionally narrow.
      --
      -- course_id, status, description, duration and other fields
      -- cannot be changed through this editor capability.

      if
        (
          to_jsonb(new)
          - array[
              'title',
              'display_order',
              'updated_at'
            ]
        )
        is distinct from
        (
          to_jsonb(old)
          - array[
              'title',
              'display_order',
              'updated_at'
            ]
        )
      then
        raise exception
          'Editors may only update module title and order';
      end if;

    end if;

  end if;

  return new;
end;
$$;


-- ============================================================
-- 8. LESSON WRITE BOUNDARY
-- ============================================================

create or replace function private.enforce_forge_editor_lesson_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if tg_op = 'INSERT' then

    -- Owner insert behavior remains unchanged.
    --
    -- Editor-created lessons must remain draft and must belong
    -- to a module from the same course.

    if not exists (
      select 1
      from public.courses
      where id = new.course_id
        and teacher_id = (select auth.uid())
    )
    and private.forge_can_author_course(new.course_id)
    then

      if new.status <> 'draft' then
        raise exception
          'Editors may only create draft lessons';
      end if;

      if not exists (
        select 1
        from public.course_modules
        where course_modules.id = new.module_id
          and course_modules.course_id = new.course_id
      )
      then
        raise exception
          'Lesson module must belong to the same course';
      end if;

    end if;


  elsif tg_op = 'UPDATE' then

    if not exists (
      select 1
      from public.courses
      where id = old.course_id
        and teacher_id = (select auth.uid())
    )
    and private.forge_can_author_course(old.course_id)
    then

      -- Editors may modify pedagogical lesson content and order.
      --
      -- They cannot change:
      -- course_id
      -- module_id
      -- status
      -- slug
      -- or other structural/security-sensitive fields.

      if
        (
          to_jsonb(new)
          - array[
              'title',
              'description',
              'content',
              'objectives',
              'type',
              'duration_minutes',
              'display_order',
              'updated_at'
            ]
        )
        is distinct from
        (
          to_jsonb(old)
          - array[
              'title',
              'description',
              'content',
              'objectives',
              'type',
              'duration_minutes',
              'display_order',
              'updated_at'
            ]
        )
      then
        raise exception
          'Editors may only update lesson content and order';
      end if;

    end if;

  end if;

  return new;
end;
$$;


-- ============================================================
-- 9. TRIGGERS
-- ============================================================

drop trigger if exists
  enforce_forge_editor_course_update
on public.courses;

create trigger enforce_forge_editor_course_update
before update
on public.courses
for each row
execute function private.enforce_forge_editor_course_update();


drop trigger if exists
  enforce_forge_editor_module_write
on public.course_modules;

create trigger enforce_forge_editor_module_write
before insert or update
on public.course_modules
for each row
execute function private.enforce_forge_editor_module_write();


drop trigger if exists
  enforce_forge_editor_lesson_write
on public.lessons;

create trigger enforce_forge_editor_lesson_write
before insert or update
on public.lessons
for each row
execute function private.enforce_forge_editor_lesson_write();