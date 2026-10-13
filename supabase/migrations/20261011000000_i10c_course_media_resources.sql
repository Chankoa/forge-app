-- I.10.C: course-scoped media resources.
-- Media is separate from course_sources: sources inform authoring; media is rendered.

create table if not exists public.course_media_resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  storage_bucket text not null default 'course-media' check (storage_bucket = 'course-media'),
  storage_path text not null unique,
  kind text not null check (kind in ('image', 'audio', 'video')),
  mime_type text not null,
  file_size bigint check (file_size is null or file_size >= 0),
  title text,
  alt_text text,
  caption text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  status text not null default 'ready' check (status in ('ready', 'unavailable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_media_resources_course_id_idx
  on public.course_media_resources(course_id, created_at desc);

alter table public.course_media_resources enable row level security;

create or replace function private.forge_media_course_id(object_name text)
returns uuid
language plpgsql
immutable
as $$
begin
  return split_part(object_name, '/', 1)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

drop policy if exists "Media owners and collaborators can read course media" on public.course_media_resources;
create policy "Media owners and collaborators can read course media"
on public.course_media_resources for select to authenticated
using (private.forge_can_read_course(course_id));

drop policy if exists "Public readers can read published course media" on public.course_media_resources;
create policy "Public readers can read published course media"
on public.course_media_resources for select to anon, authenticated
using (
  exists (
    select 1 from public.courses
    where courses.id = course_media_resources.course_id
      and courses.status = 'published'
      and courses.visibility = 'public'
  )
);

drop policy if exists "Course authors can create media" on public.course_media_resources;
create policy "Course authors can create media"
on public.course_media_resources for insert to authenticated
with check (private.forge_can_author_course(course_id) and created_by = (select auth.uid()));

drop policy if exists "Course authors can update media metadata" on public.course_media_resources;
create policy "Course authors can update media metadata"
on public.course_media_resources for update to authenticated
using (private.forge_can_author_course(course_id))
with check (private.forge_can_author_course(course_id));

drop policy if exists "Course owners can delete media" on public.course_media_resources;
create policy "Course owners can delete media"
on public.course_media_resources for delete to authenticated
using (
  exists (
    select 1 from public.courses
    where courses.id = course_media_resources.course_id
      and courses.teacher_id = (select auth.uid())
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-media',
  'course-media',
  false,
  26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp4', 'audio/wav']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Course authors can upload media" on storage.objects;
create policy "Course authors can upload media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'course-media'
  and private.forge_can_author_course(private.forge_media_course_id(name))
);

drop policy if exists "Course authors can update media files" on storage.objects;
create policy "Course authors can update media files"
on storage.objects for update to authenticated
using (
  bucket_id = 'course-media'
  and private.forge_can_author_course(private.forge_media_course_id(name))
)
with check (
  bucket_id = 'course-media'
  and private.forge_can_author_course(private.forge_media_course_id(name))
);

drop policy if exists "Course owners can delete media files" on storage.objects;
create policy "Course owners can delete media files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'course-media'
  and exists (
    select 1 from public.courses
    where courses.id = private.forge_media_course_id(storage.objects.name)
      and courses.teacher_id = (select auth.uid())
  )
);

drop policy if exists "Authorized readers can read media files" on storage.objects;
create policy "Authorized readers can read media files"
on storage.objects for select to authenticated
using (
  bucket_id = 'course-media'
  and private.forge_can_read_course(private.forge_media_course_id(name))
);

drop policy if exists "Public readers can read published media files" on storage.objects;
create policy "Public readers can read published media files"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'course-media'
  and exists (
    select 1 from public.courses
    where courses.id = private.forge_media_course_id(storage.objects.name)
      and courses.status = 'published'
      and courses.visibility = 'public'
  )
);
