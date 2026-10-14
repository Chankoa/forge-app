-- Public discovery stays separate from collaborator-only course reads.
-- This projection exposes only published, public catalogue fields.

create or replace function public.list_public_discoverable_courses()
returns table (
  id uuid,
  slug text,
  title text,
  description text,
  status text,
  duration_minutes integer,
  level text,
  domain_name text,
  cover_image text,
  cover_storage_path text,
  cover_mime_type text,
  cover_file_size bigint,
  author_profile_id uuid,
  author_name text,
  author_avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    course.id, course.slug, course.title, course.description, course.status::text,
    course.duration_minutes, course.level, domain.name, course.cover_image,
    course.cover_storage_path, course.cover_mime_type, course.cover_file_size,
    profile.id, profile.name, profile.avatar_url
  from public.courses course
  left join public.domains domain on domain.id = course.domain_id
  left join public.profiles profile on profile.id = course.teacher_id
  where course.status = 'published'
    and course.visibility = 'public'
  order by course.created_at desc;
$$;

revoke all on function public.list_public_discoverable_courses() from public;
grant execute on function public.list_public_discoverable_courses() to anon, authenticated;
