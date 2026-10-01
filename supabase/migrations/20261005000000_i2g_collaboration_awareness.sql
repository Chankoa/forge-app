-- I.2.G: contextual collaboration awareness for the workspace rail.
--
-- These projections are intentionally narrow.
--
-- They do NOT introduce:
-- - a generic notification feed
-- - read/unread state
-- - notification persistence
-- - direct request-table access
--
-- They only expose contextual collaboration awareness
-- already authorized by existing I.2 relationships.


-- ============================================================
-- 1. OWNER: PENDING REQUESTS ON CANONICALLY OWNED COURSES
-- ============================================================

create or replace function public.list_owned_pending_collaboration_awareness()
returns table (
  request_id uuid,
  course_id uuid,
  course_title text,
  requester_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    request.id,
    course.id,
    course.title,
    profile.name,
    request.created_at
  from public.course_collaboration_requests request
  join public.courses course
    on course.id = request.course_id
  join public.profiles profile
    on profile.id = request.requester_id
  where private.is_active_account()
    and course.teacher_id = (select auth.uid())
    and request.status = 'pending'
  order by request.created_at asc
  limit 4;
$$;


-- ============================================================
-- 2. REQUESTER: RECENT ACCEPTED COLLABORATIONS
-- ============================================================
--
-- One active awareness item per course.
--
-- If the same user has several historical accepted requests for the
-- same course within the 7-day window, only the most recent one is
-- retained.
--
-- The role displayed is the CURRENT active collaboration role.
-- Revoked memberships are intentionally excluded.

create or replace function public.list_my_recent_accepted_collaboration_awareness()
returns table (
  course_id uuid,
  course_title text,
  accepted_role text,
  owner_name text,
  resolved_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with latest_per_course as (

    select distinct on (course.id)
      course.id as course_id,
      course.title as course_title,
      membership.role::text as accepted_role,
      owner.name as owner_name,
      request.resolved_at

    from public.course_collaboration_requests request

    join public.courses course
      on course.id = request.course_id

    join public.course_memberships membership
      on membership.course_id = course.id
      and membership.user_id = request.requester_id

    left join public.profiles owner
      on owner.id = course.teacher_id

    where private.is_active_account()

      -- Only the authenticated user's own accepted requests.
      and request.requester_id = (select auth.uid())

      and request.status = 'accepted'

      -- Awareness is intentionally temporary.
      and request.resolved_at is not null
      and request.resolved_at >= now() - interval '7 days'

      -- Only an actually active collaboration should still surface.
      and membership.status = 'active'
      and membership.role::text in ('viewer', 'editor')

    -- DISTINCT ON keeps the most recent accepted request
    -- for each course.
    order by
      course.id,
      request.resolved_at desc

  )

  select
    course_id,
    course_title,
    accepted_role,
    owner_name,
    resolved_at

  from latest_per_course

  -- Then order the final workspace rail by recency globally.
  order by resolved_at desc

  limit 3;
$$;


-- ============================================================
-- 3. RPC EXECUTION CONTRACT
-- ============================================================
--
-- Both RPCs are authenticated-only.
--
-- Authorization is enforced inside the functions:
-- - owner projection: courses.teacher_id = auth.uid()
-- - requester projection: request.requester_id = auth.uid()
--
-- No broad profile or request-table RLS is introduced.


revoke all
on function public.list_owned_pending_collaboration_awareness()
from public;

revoke all
on function public.list_my_recent_accepted_collaboration_awareness()
from public;


-- Explicitly block anonymous execution.

revoke execute
on function public.list_owned_pending_collaboration_awareness()
from anon;

revoke execute
on function public.list_my_recent_accepted_collaboration_awareness()
from anon;


-- Authenticated users may invoke the projections.
-- Relationship checks remain inside each RPC.

grant execute
on function public.list_owned_pending_collaboration_awareness()
to authenticated;

grant execute
on function public.list_my_recent_accepted_collaboration_awareness()
to authenticated;