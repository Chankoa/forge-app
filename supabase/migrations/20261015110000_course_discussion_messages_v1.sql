-- Course Collaboration Messaging V1 — private course-scoped discussion only.
-- Public contributions must be stored and permissioned separately in a future model.

create table public.course_discussion_messages (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  context_type text not null default 'course' check (context_type in ('course', 'module', 'lesson')),
  context_module_id uuid references public.course_modules(id) on delete restrict,
  context_lesson_id uuid references public.lessons(id) on delete restrict,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint course_discussion_messages_context_shape check (
    (context_type = 'course' and context_module_id is null and context_lesson_id is null)
    or (context_type = 'module' and context_module_id is not null and context_lesson_id is null)
    or (context_type = 'lesson' and context_module_id is null and context_lesson_id is not null)
  )
);

comment on table public.course_discussion_messages is
  'Private internal course collaboration messages. Never use as a public profile activity feed.';

create index course_discussion_messages_course_created_at_idx
  on public.course_discussion_messages (course_id, created_at, id);

create index course_discussion_messages_course_context_created_at_idx
  on public.course_discussion_messages (course_id, context_type, created_at, id);

create or replace function private.validate_course_discussion_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.course_id is distinct from old.course_id
      or new.author_id is distinct from old.author_id
      or new.context_type is distinct from old.context_type
      or new.context_module_id is distinct from old.context_module_id
      or new.context_lesson_id is distinct from old.context_lesson_id
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Discussion message context is immutable';
    end if;

    if old.deleted_at is not null then
      raise exception 'Deleted discussion messages cannot be changed';
    end if;
  end if;

  if new.context_type = 'module' and not exists (
    select 1
    from public.course_modules module_row
    where module_row.id = new.context_module_id
      and module_row.course_id = new.course_id
  ) then
    raise exception 'Discussion module must belong to the course';
  end if;

  if new.context_type = 'lesson' and not exists (
    select 1
    from public.lessons lesson_row
    where lesson_row.id = new.context_lesson_id
      and lesson_row.course_id = new.course_id
  ) then
    raise exception 'Discussion lesson must belong to the course';
  end if;

  if new.deleted_at is not null then
    new.body := 'Message supprimé';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger validate_course_discussion_message
before insert or update on public.course_discussion_messages
for each row execute function private.validate_course_discussion_message();

alter table public.course_discussion_messages enable row level security;

revoke all on table public.course_discussion_messages from public;
revoke all on table public.course_discussion_messages from anon;
grant select, insert, update on table public.course_discussion_messages to authenticated;

drop policy if exists "Course discussion readers" on public.course_discussion_messages;
create policy "Course discussion readers"
on public.course_discussion_messages
for select
to authenticated
using (private.forge_can_read_course(course_id));

drop policy if exists "Course discussion authors can post" on public.course_discussion_messages;
create policy "Course discussion authors can post"
on public.course_discussion_messages
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and private.forge_can_author_course(course_id)
);

drop policy if exists "Course discussion authors can update" on public.course_discussion_messages;
create policy "Course discussion authors can update"
on public.course_discussion_messages
for update
to authenticated
using (
  deleted_at is null
  and (
    private.forge_is_course_owner(course_id)
    or (
      author_id = (select auth.uid())
      and private.forge_can_author_course(course_id)
    )
  )
)
with check (
  private.forge_is_course_owner(course_id)
  or (
    author_id = (select auth.uid())
    and private.forge_can_author_course(course_id)
  )
);

-- No DELETE policy: removal stays a soft-delete update.

create or replace function public.list_course_discussion_messages(target_course_id uuid)
returns table (
  id uuid,
  course_id uuid,
  author_id uuid,
  context_type text,
  context_module_id uuid,
  context_lesson_id uuid,
  body text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  author_name text,
  author_avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    message.id,
    message.course_id,
    message.author_id,
    message.context_type,
    message.context_module_id,
    message.context_lesson_id,
    case when message.deleted_at is null then message.body else 'Message supprimé' end,
    message.created_at,
    message.updated_at,
    message.deleted_at,
    profile.name,
    profile.avatar_url
  from public.course_discussion_messages message
  left join public.profiles profile
    on profile.id = message.author_id
  where private.forge_can_read_course(target_course_id)
    and message.course_id = target_course_id
  order by message.created_at asc, message.id asc
  limit 100;
$$;

revoke all on function public.list_course_discussion_messages(uuid) from public;
revoke all on function public.list_course_discussion_messages(uuid) from anon;
grant execute on function public.list_course_discussion_messages(uuid) to authenticated;
