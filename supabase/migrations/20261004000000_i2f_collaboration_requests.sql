-- I.2.F: learner-to-owner collaboration requests.
--
-- Requests are distinct from course memberships:
-- - requesters never select a collaboration role
-- - canonical owners choose viewer/editor on acceptance
-- - learner enrollment remains untouched
--
-- Canonical ownership remains public.courses.teacher_id.
--
-- Out of scope:
-- - contributor
-- - participant
-- - ownership transfer
-- - email invitations
-- - global Team
-- - Sources / Resources / Storage permission changes


-- ============================================================
-- 1. COURSE OPT-IN
-- ============================================================

alter table public.courses
  add column if not exists collaboration_requests_enabled boolean
  not null
  default false;


-- ============================================================
-- 2. REQUEST STATUS ENUM
-- ============================================================

do $$
begin
  create type public.course_collaboration_request_status as enum (
    'pending',
    'accepted',
    'declined',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;


-- ============================================================
-- 3. REQUEST TABLE
-- ============================================================

create table if not exists public.course_collaboration_requests (
  id uuid primary key default gen_random_uuid(),

  course_id uuid not null
    references public.courses(id)
    on delete cascade,

  requester_id uuid not null
    references public.profiles(id)
    on delete cascade,

  message text,

  status public.course_collaboration_request_status
    not null
    default 'pending',

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  resolved_at timestamptz,

  resolved_by uuid
    references public.profiles(id)
    on delete set null,

  check (
    message is null
    or char_length(trim(message)) between 1 and 1000
  )
);


-- One active pending request per learner/course.
create unique index if not exists
  course_collaboration_requests_one_pending
on public.course_collaboration_requests (
  course_id,
  requester_id
)
where status = 'pending';


-- Direct table access is intentionally blocked.
-- Access goes through narrow RPCs only.

alter table public.course_collaboration_requests
  enable row level security;

revoke all
on public.course_collaboration_requests
from anon, authenticated;


-- ============================================================
-- 4. REQUEST ELIGIBILITY
-- ============================================================

create or replace function private.forge_can_request_course_collaboration(
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

    -- Course must currently accept requests.
    and exists (
      select 1
      from public.courses course
      where course.id = target_course_id
        and course.status = 'published'
        and course.collaboration_requests_enabled
        and course.teacher_id is distinct from (select auth.uid())
    )

    -- Requester must already be enrolled as learner.
    and exists (
      select 1
      from public.enrollments enrollment
      where enrollment.course_id = target_course_id
        and enrollment.user_id = (select auth.uid())
    )

    -- Existing active collaborators cannot request again.
    and not exists (
      select 1
      from public.course_memberships membership
      where membership.course_id = target_course_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and membership.role::text in ('viewer', 'editor')
    );
$$;


revoke all
on function private.forge_can_request_course_collaboration(uuid)
from public;

grant execute
on function private.forge_can_request_course_collaboration(uuid)
to authenticated;


-- ============================================================
-- 5. OWNER COURSE OPT-IN
-- ============================================================

create or replace function public.set_course_collaboration_requests_enabled(
  target_course_id uuid,
  enabled boolean
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


  if enabled is null then
    raise exception 'invalid_collaboration_request_setting';
  end if;


  update public.courses
  set collaboration_requests_enabled = enabled
  where id = target_course_id;

end;
$$;


-- ============================================================
-- 6. CREATE REQUEST
-- ============================================================

create or replace function public.create_course_collaboration_request(
  target_course_id uuid,
  request_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  if not private.forge_can_request_course_collaboration(target_course_id) then
    raise exception 'request_not_eligible';
  end if;


  if request_message is not null
     and char_length(trim(request_message)) > 1000
  then
    raise exception 'request_message_too_long';
  end if;


  insert into public.course_collaboration_requests (
    course_id,
    requester_id,
    message
  )
  values (
    target_course_id,
    (select auth.uid()),
    nullif(trim(request_message), '')
  );

exception
  when unique_violation then
    raise exception 'request_already_pending';

end;
$$;


-- ============================================================
-- 7. REQUESTER: READ OWN PENDING REQUEST
-- ============================================================

create or replace function public.get_my_course_collaboration_request(
  target_course_id uuid
)
returns table (
  request_id uuid,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    request.id,
    request.status::text,
    request.created_at
  from public.course_collaboration_requests request
  where request.course_id = target_course_id
    and request.requester_id = (select auth.uid())
    and request.status = 'pending'
  order by request.created_at desc
  limit 1;
$$;


-- ============================================================
-- 8. OWNER: LIST PENDING REQUESTS
-- ============================================================

create or replace function public.list_course_collaboration_requests(
  target_course_id uuid
)
returns table (
  request_id uuid,
  requester_id uuid,
  name text,
  message text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    request.id,
    request.requester_id,
    profile.name,
    request.message,
    request.created_at
  from public.course_collaboration_requests request
  join public.profiles profile
    on profile.id = request.requester_id
  where private.forge_is_course_owner(target_course_id)
    and request.course_id = target_course_id
    and request.status = 'pending'
  order by request.created_at asc;
$$;


-- ============================================================
-- 9. OWNER: RESOLVE REQUEST ATOMICALLY
-- ============================================================

create or replace function public.resolve_course_collaboration_request(
  target_request_id uuid,
  resolution text,
  accepted_role text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_course_id uuid;
  request_requester_id uuid;
  request_status public.course_collaboration_request_status;
begin

  -- Lock the request row for the duration of the transaction.
  select
    request.course_id,
    request.requester_id,
    request.status
  into
    request_course_id,
    request_requester_id,
    request_status
  from public.course_collaboration_requests request
  where request.id = target_request_id
  for update;


  -- Do not leak whether a request exists on another owner's course.
  if not found
     or not private.forge_is_course_owner(request_course_id)
  then
    raise exception 'forbidden';
  end if;


  if request_status <> 'pending' then
    raise exception 'request_not_pending';
  end if;


  -- ----------------------------------------------------------
  -- DECLINE
  -- ----------------------------------------------------------

  if resolution = 'declined' then

    update public.course_collaboration_requests
    set
      status = 'declined',
      resolved_at = now(),
      resolved_by = (select auth.uid()),
      updated_at = now()
    where id = target_request_id;

    return;

  end if;


  -- ----------------------------------------------------------
  -- ACCEPT
  -- ----------------------------------------------------------

  if resolution is distinct from 'accepted'
     or accepted_role is null
     or accepted_role not in ('viewer', 'editor')
  then
    raise exception 'invalid_request_resolution';
  end if;


  -- Guard against a future ownership change occurring after
  -- the request was originally created.
  if request_requester_id = (
    select teacher_id
    from public.courses
    where id = request_course_id
  )
  then
    raise exception 'owner_cannot_be_collaborator';
  end if;


  -- Requester must still be an active enrolled learner
  -- on a published course at resolution time.
  if not exists (
    select 1
    from public.courses course
    join public.enrollments enrollment
      on enrollment.course_id = course.id
    join public.profiles profile
      on profile.id = enrollment.user_id
    where course.id = request_course_id
      and course.status = 'published'
      and enrollment.user_id = request_requester_id
      and profile.status = 'active'
  )
  then
    raise exception 'requester_no_longer_eligible';
  end if;


  -- Never repurpose owner/contributor/participant memberships.
  if exists (
    select 1
    from public.course_memberships membership
    where membership.course_id = request_course_id
      and membership.user_id = request_requester_id
      and membership.role::text not in ('viewer', 'editor')
  )
  then
    raise exception 'membership_role_not_managed_here';
  end if;


  -- Membership creation/reactivation happens before request resolution
  -- within the same PostgreSQL transaction.
  insert into public.course_memberships (
    course_id,
    user_id,
    role,
    status,
    invited_by,
    accepted_at
  )
  values (
    request_course_id,
    request_requester_id,
    accepted_role::public.course_membership_role,
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


  update public.course_collaboration_requests
  set
    status = 'accepted',
    resolved_at = now(),
    resolved_by = (select auth.uid()),
    updated_at = now()
  where id = target_request_id;

end;
$$;


-- ============================================================
-- 10. RPC EXECUTION CONTRACT
-- ============================================================

revoke all
on function public.set_course_collaboration_requests_enabled(uuid, boolean)
from public;

revoke all
on function public.create_course_collaboration_request(uuid, text)
from public;

revoke all
on function public.get_my_course_collaboration_request(uuid)
from public;

revoke all
on function public.list_course_collaboration_requests(uuid)
from public;

revoke all
on function public.resolve_course_collaboration_request(uuid, text, text)
from public;


-- Explicitly remove anon execution.

revoke execute
on function public.set_course_collaboration_requests_enabled(uuid, boolean)
from anon;

revoke execute
on function public.create_course_collaboration_request(uuid, text)
from anon;

revoke execute
on function public.get_my_course_collaboration_request(uuid)
from anon;

revoke execute
on function public.list_course_collaboration_requests(uuid)
from anon;

revoke execute
on function public.resolve_course_collaboration_request(uuid, text, text)
from anon;


-- Authenticated users may call the RPCs.
-- Authorization remains enforced inside each function.

grant execute
on function public.set_course_collaboration_requests_enabled(uuid, boolean)
to authenticated;

grant execute
on function public.create_course_collaboration_request(uuid, text)
to authenticated;

grant execute
on function public.get_my_course_collaboration_request(uuid)
to authenticated;

grant execute
on function public.list_course_collaboration_requests(uuid)
to authenticated;

grant execute
on function public.resolve_course_collaboration_request(uuid, text, text)
to authenticated;