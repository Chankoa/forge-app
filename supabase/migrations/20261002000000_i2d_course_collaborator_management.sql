-- I.2.D: course-level collaborator management.
--
-- Canonical ownership remains public.courses.teacher_id.
--
-- Managed collaborator roles in I.2.D:
--   viewer
--   editor
--
-- Managed statuses:
--   active
--   revoked
--
-- Existing invited / suspended memberships may be displayed,
-- but I.2.D does not introduce an invitation workflow.
--
-- Explicitly out of scope:
--   owner role management
--   contributor
--   participant
--   ownership transfer
--   Sources / Resources / Storage permissions


-- ============================================================
-- 1. CANONICAL COURSE OWNER CHECK
-- ============================================================

create or replace function private.forge_is_course_owner(
  target_course_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_active_account()
    and exists (
      select 1
      from public.courses
      where id = target_course_id
        and teacher_id = (select auth.uid())
    );
$$;

revoke all
on function private.forge_is_course_owner(uuid)
from public;

grant execute
on function private.forge_is_course_owner(uuid)
to authenticated;


-- ============================================================
-- 2. LIST COURSE COLLABORATORS
-- ============================================================

create or replace function public.list_course_collaborators(
  target_course_id uuid
)
returns table (
  user_id uuid,
  name text,
  role text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    membership.user_id,
    profile.name,
    membership.role::text,
    membership.status::text
  from public.course_memberships membership
  join public.profiles profile
    on profile.id = membership.user_id
  where private.forge_is_course_owner(target_course_id)
    and membership.course_id = target_course_id

    -- Canonical owner is never managed from this collaborator surface.
    and membership.user_id is distinct from (
      select teacher_id
      from public.courses
      where id = target_course_id
    )

    -- I.2.D only manages viewer/editor memberships.
    and membership.role::text in ('viewer', 'editor')

  order by
    profile.name nulls last,
    membership.created_at;
$$;


-- ============================================================
-- 3. SEARCH EXISTING FORGE USERS
-- ============================================================

create or replace function public.search_course_collaborator_candidates(
  target_course_id uuid,
  search_term text
)
returns table (
  user_id uuid,
  name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.id,
    profile.name
  from public.profiles profile
  where private.forge_is_course_owner(target_course_id)

    -- Avoid broad one-character directory searches.
    and search_term is not null
    and length(trim(search_term)) >= 2

    -- Only active Forge accounts are eligible.
    and profile.status = 'active'

    -- Canonical owner cannot add themselves as collaborator.
    and profile.id is distinct from (
      select teacher_id
      from public.courses
      where id = target_course_id
    )

    -- Existing memberships are managed from the collaborator list,
    -- including revoked/invited/suspended viewer/editor memberships.
    and not exists (
      select 1
      from public.course_memberships membership
      where membership.course_id = target_course_id
        and membership.user_id = profile.id
    )

    and profile.name ilike '%' || trim(search_term) || '%'

  order by profile.name
  limit 8;
$$;


-- ============================================================
-- 4. ADD OR REACTIVATE COLLABORATOR
-- ============================================================

create or replace function public.add_course_collaborator(
  target_course_id uuid,
  target_user_id uuid,
  target_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  -- Only the canonical course owner may manage collaborators.
  if not private.forge_is_course_owner(target_course_id) then
    raise exception 'forbidden';
  end if;


  -- I.2.D only supports viewer/editor.
  if target_role is null
     or target_role not in ('viewer', 'editor')
  then
    raise exception 'invalid_collaborator_role';
  end if;


  -- Canonical owner is never managed through course memberships here.
  if target_user_id = (
    select teacher_id
    from public.courses
    where id = target_course_id
  )
  then
    raise exception 'owner_membership_not_managed_here';
  end if;


  -- Target must be an active Forge profile.
  if not exists (
    select 1
    from public.profiles
    where id = target_user_id
      and status = 'active'
  )
  then
    raise exception 'collaborator_not_available';
  end if;


  -- Never silently repurpose owner / contributor / participant
  -- memberships into viewer/editor memberships.
  --
  -- Existing viewer/editor rows may safely be reactivated/upserted.
  if exists (
    select 1
    from public.course_memberships
    where course_id = target_course_id
      and user_id = target_user_id
      and role::text not in ('viewer', 'editor')
  )
  then
    raise exception 'membership_role_not_managed_here';
  end if;


  insert into public.course_memberships (
    course_id,
    user_id,
    role,
    status,
    invited_by,
    accepted_at
  )
  values (
    target_course_id,
    target_user_id,
    target_role::public.course_membership_role,
    'active'::public.course_membership_status,
    (select auth.uid()),
    now()
  )
  on conflict (course_id, user_id)
  do update
  set
    role = excluded.role,
    status = 'active',
    invited_by = excluded.invited_by,
    accepted_at = coalesce(
      public.course_memberships.accepted_at,
      now()
    );

end;
$$;


-- ============================================================
-- 5. CHANGE VIEWER / EDITOR ROLE
-- ============================================================

create or replace function public.change_course_collaborator_role(
  target_course_id uuid,
  target_user_id uuid,
  target_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  if not private.forge_is_course_owner(target_course_id) then
    raise exception 'forbidden';
  end if;


  if target_role is null
     or target_role not in ('viewer', 'editor')
  then
    raise exception 'invalid_collaborator_role';
  end if;


  -- Only an existing viewer/editor membership may be changed.
  --
  -- This deliberately excludes:
  -- owner
  -- contributor
  -- participant
  update public.course_memberships
  set role = target_role::public.course_membership_role
  where course_id = target_course_id
    and user_id = target_user_id
    and role::text in ('viewer', 'editor');


  if not found then
    raise exception 'collaborator_not_found';
  end if;

end;
$$;


-- ============================================================
-- 6. REVOKE / REACTIVATE COLLABORATOR
-- ============================================================

create or replace function public.set_course_collaborator_status(
  target_course_id uuid,
  target_user_id uuid,
  target_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  if not private.forge_is_course_owner(target_course_id) then
    raise exception 'forbidden';
  end if;


  -- I.2.D exposes only explicit revoke/reactivate transitions.
  if target_status is null
     or target_status not in ('active', 'revoked')
  then
    raise exception 'invalid_collaborator_status';
  end if;


  update public.course_memberships
  set
    status = target_status::public.course_membership_status,

    -- Preserve original acceptance history where it exists.
    -- A previously never-accepted row receives accepted_at when activated.
    accepted_at = case
      when target_status = 'active'
        then coalesce(accepted_at, now())
      else accepted_at
    end

  where course_id = target_course_id
    and user_id = target_user_id
    and role::text in ('viewer', 'editor');


  if not found then
    raise exception 'collaborator_not_found';
  end if;

end;
$$;


-- ============================================================
-- 7. RPC EXECUTION PERMISSIONS
-- ============================================================

-- These RPCs are callable only by authenticated users.
-- Authorization remains enforced inside every function through
-- private.forge_is_course_owner(target_course_id).

revoke all
on function public.list_course_collaborators(uuid)
from public;

revoke all
on function public.search_course_collaborator_candidates(uuid, text)
from public;

revoke all
on function public.add_course_collaborator(uuid, uuid, text)
from public;

revoke all
on function public.change_course_collaborator_role(uuid, uuid, text)
from public;

revoke all
on function public.set_course_collaborator_status(uuid, uuid, text)
from public;


grant execute
on function public.list_course_collaborators(uuid)
to authenticated;

grant execute
on function public.search_course_collaborator_candidates(uuid, text)
to authenticated;

grant execute
on function public.add_course_collaborator(uuid, uuid, text)
to authenticated;

grant execute
on function public.change_course_collaborator_role(uuid, uuid, text)
to authenticated;

grant execute
on function public.set_course_collaborator_status(uuid, uuid, text)
to authenticated;