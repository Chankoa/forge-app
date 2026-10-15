alter table public.course_discussion_messages
  drop constraint course_discussion_messages_context_module_id_fkey,
  add constraint course_discussion_messages_context_module_id_fkey
    foreign key (context_module_id)
    references public.course_modules(id)
    on delete set null,
  drop constraint course_discussion_messages_context_lesson_id_fkey,
  add constraint course_discussion_messages_context_lesson_id_fkey
    foreign key (context_lesson_id)
    references public.lessons(id)
    on delete set null;

alter table public.course_discussion_messages
  drop constraint course_discussion_messages_context_shape,
  add constraint course_discussion_messages_context_shape check (
    (context_type = 'course' and context_module_id is null and context_lesson_id is null)
    or (context_type = 'module' and context_lesson_id is null)
    or (context_type = 'lesson' and context_module_id is null)
  );

create or replace function private.validate_course_discussion_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  module_context_removed boolean := false;
  lesson_context_removed boolean := false;
  context_cleanup_only boolean := false;
begin
  if tg_op = 'UPDATE' then
    module_context_removed :=
      old.context_type = 'module'
      and old.context_module_id is not null
      and new.context_module_id is null
      and not exists (
        select 1
        from public.course_modules module_row
        where module_row.id = old.context_module_id
      );

    lesson_context_removed :=
      old.context_type = 'lesson'
      and old.context_lesson_id is not null
      and new.context_lesson_id is null
      and not exists (
        select 1
        from public.lessons lesson_row
        where lesson_row.id = old.context_lesson_id
      );

    if new.course_id is distinct from old.course_id
      or new.author_id is distinct from old.author_id
      or new.context_type is distinct from old.context_type
      or new.created_at is distinct from old.created_at
      or (
        new.context_module_id is distinct from old.context_module_id
        and not module_context_removed
      )
      or (
        new.context_lesson_id is distinct from old.context_lesson_id
        and not lesson_context_removed
      )
    then
      raise exception 'Discussion message context is immutable';
    end if;

    context_cleanup_only :=
      (module_context_removed or lesson_context_removed)
      and new.body is not distinct from old.body
      and new.deleted_at is not distinct from old.deleted_at;

    if old.deleted_at is not null and not context_cleanup_only then
      raise exception 'Deleted discussion messages cannot be changed';
    end if;
  end if;

  if new.context_type = 'module' then
    if new.context_module_id is null then
      if tg_op <> 'UPDATE' then
        raise exception 'Discussion module must belong to the course';
      elsif not module_context_removed
        and not (old.context_type = 'module' and old.context_module_id is null)
      then
        raise exception 'Discussion module must belong to the course';
      end if;
    elsif not exists (
      select 1
      from public.course_modules module_row
      where module_row.id = new.context_module_id
        and module_row.course_id = new.course_id
    ) then
      raise exception 'Discussion module must belong to the course';
    end if;
  end if;

  if new.context_type = 'lesson' then
    if new.context_lesson_id is null then
      if tg_op <> 'UPDATE' then
        raise exception 'Discussion lesson must belong to the course';
      elsif not lesson_context_removed
        and not (old.context_type = 'lesson' and old.context_lesson_id is null)
      then
        raise exception 'Discussion lesson must belong to the course';
      end if;
    elsif not exists (
      select 1
      from public.lessons lesson_row
      where lesson_row.id = new.context_lesson_id
        and lesson_row.course_id = new.course_id
    ) then
      raise exception 'Discussion lesson must belong to the course';
    end if;
  end if;

  if new.deleted_at is not null then
    new.body := 'Message supprimé';
  end if;

  if tg_op = 'UPDATE' and context_cleanup_only then
    new.updated_at := old.updated_at;
  else
    new.updated_at := now();
  end if;
  return new;
end;
$$;
