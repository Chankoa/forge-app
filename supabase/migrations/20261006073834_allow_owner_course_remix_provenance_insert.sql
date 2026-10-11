create policy "Owners can insert remix provenance"
on public.course_provenance
for insert
to authenticated
with check (
  (select private.is_active_account())
  and exists (
    select 1
    from public.courses destination
    join public.courses source
      on source.id = course_provenance.remixed_from_course_id
    where destination.id = course_provenance.course_id
      and destination.teacher_id = (select auth.uid())
      and destination.status = 'draft'::public.course_status
      and destination.visibility = 'private'::public.course_visibility
      and source.title = course_provenance.source_course_title
      and (
        (
          source.teacher_id = (select auth.uid())
          and source.status in (
            'draft'::public.course_status,
            'published'::public.course_status
          )
        )
        or (
          source.status = 'published'::public.course_status
          and source.visibility = 'public'::public.course_visibility
        )
      )
  )
);
