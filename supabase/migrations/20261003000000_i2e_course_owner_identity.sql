-- I.2.E: safe owner attribution for existing private course collaborators.
--
-- Identity projection only.
--
-- Does NOT:
-- - grant course access
-- - mutate memberships
-- - expose account fields
-- - change collaboration permissions
--
-- Access remains governed by the existing I.2 course capability model.

create or replace function public.get_course_owner_identity(
  target_course_id uuid
)
returns table (
  profile_id uuid,
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
  from public.courses course
  join public.profiles profile
    on profile.id = course.teacher_id
  where course.id = target_course_id
    and private.forge_can_read_course(target_course_id);
$$;


-- Explicit execution contract.
--
-- Only authenticated users may call this RPC.
-- Actual course authorization is still checked inside the function.

revoke all
on function public.get_course_owner_identity(uuid)
from public;

revoke execute
on function public.get_course_owner_identity(uuid)
from anon;

grant execute
on function public.get_course_owner_identity(uuid)
to authenticated;