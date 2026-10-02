create table if not exists public.course_provenance (
  course_id uuid primary key
    references public.courses(id) on delete cascade,
  remixed_from_course_id uuid null
    references public.courses(id) on delete set null,
  source_course_title text not null,
  source_author_name text null,
  remixed_at timestamptz not null default now()
);

alter table public.course_provenance enable row level security;

drop policy if exists "Owners can read remix provenance"
on public.course_provenance;

create policy "Owners can read remix provenance"
on public.course_provenance
for select
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_provenance.course_id
      and c.teacher_id = (select auth.uid())
      and private.is_active_account()
  )
);

drop policy if exists "Public provenance follows published courses"
on public.course_provenance;

create policy "Public provenance follows published courses"
on public.course_provenance
for select
to public
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_provenance.course_id
      and c.status = 'published'::public.course_status
      and c.visibility = 'public'::public.course_visibility
  )
);

revoke all on table public.course_provenance from anon, authenticated;
grant select on table public.course_provenance to anon, authenticated;

create or replace function public.create_course_remix(source_course_id uuid)
returns table(course_id uuid, slug text)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  source_course public.courses%rowtype;
  new_course_id uuid;
  new_course_slug text;
  base_course_slug text;
  slug_attempt integer := 1;
  source_author_name text;
  copied_domain_id uuid;
  src_module record;
  new_module_id uuid;
  new_module_slug text;
  src_lesson record;
  new_lesson_slug text;
  lesson_slug_base text;
  lesson_slug_attempt integer;
begin
  if actor_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if not private.is_active_account() then
    raise exception 'ACTIVE_ACCOUNT_REQUIRED' using errcode = '42501';
  end if;

  select *
  into source_course
  from public.courses
  where id = source_course_id;

  if not found then
    raise exception 'SOURCE_COURSE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if source_course.status = 'archived'::public.course_status then
    raise exception 'SOURCE_COURSE_NOT_ELIGIBLE' using errcode = '42501';
  end if;

  if source_course.teacher_id = actor_id then
    if source_course.status not in (
      'draft'::public.course_status,
      'published'::public.course_status
    ) then
      raise exception 'SOURCE_COURSE_NOT_ELIGIBLE' using errcode = '42501';
    end if;

    select p.name
    into source_author_name
    from public.profiles p
    where p.id = actor_id;
  else
    if source_course.status <> 'published'::public.course_status
       or source_course.visibility <> 'public'::public.course_visibility then
      raise exception 'SOURCE_COURSE_NOT_ELIGIBLE' using errcode = '42501';
    end if;

    select a.name
    into source_author_name
    from public.get_public_course_author(source_course_id) a
    limit 1;

    if source_author_name is null then
      raise exception 'SOURCE_AUTHOR_UNAVAILABLE' using errcode = '42501';
    end if;
  end if;

  select d.id
  into copied_domain_id
  from public.domains d
  where d.id = source_course.domain_id
    and d.status = 'active'
  limit 1;

  base_course_slug := trim(both '-' from regexp_replace(
    coalesce(nullif(source_course.slug, ''), 'course') || '-remix',
    '[^a-zA-Z0-9-]+',
    '-',
    'g'
  ));

  if base_course_slug = '' then
    base_course_slug := 'course-remix';
  end if;

  loop
    new_course_slug := case
      when slug_attempt = 1 then base_course_slug
      else base_course_slug || '-' || slug_attempt::text
    end;

    begin
      insert into public.courses (
        domain_id,
        teacher_id,
        slug,
        title,
        subtitle,
        description,
        level,
        status,
        visibility,
        availability,
        cover_image,
        duration_minutes,
        format,
        tags,
        published_at,
        cover_storage_path,
        cover_mime_type,
        cover_file_size,
        collaboration_requests_enabled
      )
      values (
        copied_domain_id,
        actor_id,
        new_course_slug,
        source_course.title || ' — Remix',
        source_course.subtitle,
        source_course.description,
        source_course.level,
        'draft'::public.course_status,
        'private'::public.course_visibility,
        'preview'::public.course_availability,
        null,
        null,
        source_course.format,
        source_course.tags,
        null,
        null,
        null,
        null,
        false
      )
      returning id into new_course_id;

      exit;
    exception
      when unique_violation then
        slug_attempt := slug_attempt + 1;

        if slug_attempt > 99 then
          raise exception 'REMIX_SLUG_EXHAUSTED' using errcode = '23505';
        end if;
    end;
  end loop;

  insert into public.course_provenance (
    course_id,
    remixed_from_course_id,
    source_course_title,
    source_author_name
  )
  values (
    new_course_id,
    source_course.id,
    source_course.title,
    source_author_name
  );

  for src_module in
    select
      m.id,
      m.slug,
      m.title,
      m.description,
      m.duration_minutes,
      m.display_order
    from public.course_modules m
    where m.course_id = source_course.id
    order by m.display_order, m.id
  loop
    new_module_id := gen_random_uuid();

    new_module_slug :=
      coalesce(
        nullif(src_module.slug, ''),
        'module-' || src_module.display_order::text
      );

    insert into public.course_modules (
      id,
      course_id,
      slug,
      title,
      description,
      duration_minutes,
      display_order,
      status
    )
    values (
      new_module_id,
      new_course_id,
      new_module_slug,
      src_module.title,
      src_module.description,
      src_module.duration_minutes,
      src_module.display_order,
      'draft'::public.lesson_status
    );

    for src_lesson in
      select
        l.slug,
        l.title,
        l.description,
        l.type,
        l.duration_minutes,
        l.video_url,
        l.objectives,
        l.display_order,
        l.content
      from public.lessons l
      where l.course_id = source_course.id
        and l.module_id = src_module.id
      order by l.display_order, l.id
    loop
      lesson_slug_base := trim(both '-' from regexp_replace(
        new_course_slug || '-' ||
        coalesce(
          nullif(src_lesson.slug, ''),
          'lesson-' || src_lesson.display_order::text
        ),
        '[^a-zA-Z0-9-]+',
        '-',
        'g'
      ));

      if lesson_slug_base = '' then
        lesson_slug_base := 'lesson';
      end if;

      lesson_slug_attempt := 1;

      loop
        new_lesson_slug := case
          when lesson_slug_attempt = 1 then lesson_slug_base
          else lesson_slug_base || '-' || lesson_slug_attempt::text
        end;

        begin
          insert into public.lessons (
            course_id,
            module_id,
            slug,
            title,
            description,
            type,
            status,
            duration_minutes,
            content_path,
            video_url,
            objectives,
            display_order,
            content
          )
          values (
            new_course_id,
            new_module_id,
            new_lesson_slug,
            src_lesson.title,
            src_lesson.description,
            src_lesson.type,
            'draft'::public.lesson_status,
            src_lesson.duration_minutes,
            null,
            src_lesson.video_url,
            src_lesson.objectives,
            src_lesson.display_order,
            src_lesson.content
          );

          exit;
        exception
          when unique_violation then
            lesson_slug_attempt := lesson_slug_attempt + 1;

            if lesson_slug_attempt > 99 then
              raise exception 'REMIX_LESSON_SLUG_EXHAUSTED'
                using errcode = '23505';
            end if;
        end;
      end loop;
    end loop;
  end loop;

  return query
  select new_course_id, new_course_slug;
end;
$function$;

revoke all on function public.create_course_remix(uuid) from public;
revoke all on function public.create_course_remix(uuid) from anon;
grant execute on function public.create_course_remix(uuid) to authenticated;