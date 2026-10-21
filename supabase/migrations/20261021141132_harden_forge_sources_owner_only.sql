-- Forge sources are private authoring context. Learners access only explicit
-- pedagogical resources in the `resources` bucket/table.
drop policy if exists "Users can read enrolled ready course sources" on public.course_sources;
drop policy if exists "Users can read enrolled course source files" on storage.objects;
