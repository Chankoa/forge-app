create index if not exists course_provenance_remixed_from_course_id_idx
  on public.course_provenance(remixed_from_course_id);

drop policy if exists "Owners can read remix provenance"
on public.course_provenance;

drop policy if exists "Public provenance follows published courses"
on public.course_provenance;

create policy "Anonymous can read public remix provenance"
on public.course_provenance
for select
to anon
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_provenance.course_id
      and c.status = 'published'::public.course_status
      and c.visibility = 'public'::public.course_visibility
  )
);

create policy "Authenticated can read permitted remix provenance"
on public.course_provenance
for select
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_provenance.course_id
      and (
        (
          c.teacher_id = (select auth.uid())
          and private.is_active_account()
        )
        or (
          c.status = 'published'::public.course_status
          and c.visibility = 'public'::public.course_visibility
        )
      )
  )
);