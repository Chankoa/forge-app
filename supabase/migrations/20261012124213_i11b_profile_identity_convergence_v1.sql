-- I.11.B: additive profile identity, profile domains, and safe author avatars.
-- Course covers continue using courses.cover_image, courses.cover_storage_path,
-- courses.cover_mime_type, courses.cover_file_size, and the public course-covers bucket.

alter table public.profiles
  add column if not exists headline text,
  add column if not exists location text,
  add column if not exists bio text;

alter table public.profiles
  drop constraint if exists profiles_headline_length_check,
  add constraint profiles_headline_length_check
    check (headline is null or char_length(headline) <= 120),
  drop constraint if exists profiles_location_length_check,
  add constraint profiles_location_length_check
    check (location is null or char_length(location) <= 120),
  drop constraint if exists profiles_bio_length_check,
  add constraint profiles_bio_length_check
    check (bio is null or char_length(bio) <= 1200);

create table if not exists public.profile_domains (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  domain_id uuid not null references public.domains(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, domain_id)
);

alter table public.profile_domains enable row level security;

drop policy if exists "Profile domains are readable" on public.profile_domains;
create policy "Profile domains are readable"
on public.profile_domains for select to authenticated
using (true);

drop policy if exists "Users can add their own profile domains" on public.profile_domains;
create policy "Users can add their own profile domains"
on public.profile_domains for insert to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "Users can remove their own profile domains" on public.profile_domains;
create policy "Users can remove their own profile domains"
on public.profile_domains for delete to authenticated
using (profile_id = (select auth.uid()));

grant select, insert, delete on public.profile_domains to authenticated;

-- Avatars are public identity assets. The profile stores the stable public URL in
-- the existing avatar_url field; writes stay scoped to the authenticated user's folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own profile avatar" on storage.objects;
create policy "Users can upload their own profile avatar"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can update their own profile avatar" on storage.objects;
create policy "Users can update their own profile avatar"
on storage.objects for update to authenticated
using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete their own profile avatar" on storage.objects;
create policy "Users can delete their own profile avatar"
on storage.objects for delete to authenticated
using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Narrow identity projections; neither RPC exposes non-public profile fields.
drop function if exists public.get_public_course_author(uuid);

create or replace function public.get_public_course_author(
  target_course_id uuid
)
returns table (
  profile_id uuid,
  name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id, profile.name, profile.avatar_url
  from public.courses course
  join public.profiles profile on profile.id = course.teacher_id
  where course.id = target_course_id
    and course.status = 'published'
    and course.visibility = 'public';
$$;

revoke all on function public.get_public_course_author(uuid) from public;
grant execute on function public.get_public_course_author(uuid) to anon, authenticated;

drop function if exists public.get_course_owner_identity(uuid);

create or replace function public.get_course_owner_identity(
  target_course_id uuid
)
returns table (
  profile_id uuid,
  name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id, profile.name, profile.avatar_url
  from public.courses course
  join public.profiles profile on profile.id = course.teacher_id
  where course.id = target_course_id
    and private.forge_can_read_course(target_course_id);
$$;

revoke all on function public.get_course_owner_identity(uuid) from public;
grant execute on function public.get_course_owner_identity(uuid) to authenticated;

drop function if exists public.list_course_collaborators(uuid);

create or replace function public.list_course_collaborators(
  target_course_id uuid
)
returns table (
  user_id uuid,
  name text,
  role text,
  status text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select membership.user_id, profile.name,
    membership.role::text, membership.status::text, profile.avatar_url
  from public.course_memberships membership
  join public.profiles profile on profile.id = membership.user_id
  where private.forge_is_course_owner(target_course_id)
    and membership.course_id = target_course_id
    and membership.user_id is distinct from (
      select teacher_id from public.courses where id = target_course_id
    )
    and membership.role::text in ('viewer', 'editor')
  order by profile.name nulls last, membership.created_at;
$$;

revoke all on function public.list_course_collaborators(uuid) from public;
grant execute on function public.list_course_collaborators(uuid) to authenticated;

drop function if exists public.list_course_collaboration_requests(uuid);

create or replace function public.list_course_collaboration_requests(
  target_course_id uuid
)
returns table (
  request_id uuid,
  requester_id uuid,
  name text,
  message text,
  created_at timestamptz,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select request.id, request.requester_id, profile.name,
    request.message, request.created_at, profile.avatar_url
  from public.course_collaboration_requests request
  join public.profiles profile on profile.id = request.requester_id
  where private.forge_is_course_owner(target_course_id)
    and request.course_id = target_course_id
    and request.status = 'pending'
  order by request.created_at asc;
$$;

revoke all on function public.list_course_collaboration_requests(uuid) from public;
grant execute on function public.list_course_collaboration_requests(uuid) to authenticated;

drop function if exists public.search_course_collaborator_candidates(uuid, text);

create or replace function public.search_course_collaborator_candidates(
  target_course_id uuid,
  search_term text
)
returns table (
  user_id uuid,
  name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id, profile.name, profile.avatar_url
  from public.profiles profile
  where private.forge_is_course_owner(target_course_id)
    and search_term is not null
    and length(trim(search_term)) >= 2
    and profile.status = 'active'
    and profile.id is distinct from (
      select teacher_id from public.courses where id = target_course_id
    )
    and not exists (
      select 1 from public.course_memberships membership
      where membership.course_id = target_course_id
        and membership.user_id = profile.id
    )
    and profile.name ilike '%' || trim(search_term) || '%'
  order by profile.name
  limit 8;
$$;

revoke all on function public.search_course_collaborator_candidates(uuid, text) from public;
grant execute on function public.search_course_collaborator_candidates(uuid, text) to authenticated;
