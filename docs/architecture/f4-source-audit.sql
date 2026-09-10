-- Read-only catalog audit. No migration and no role impersonation.
-- Run statements separately in clients that only return the last result set.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'course_sources'
order by ordinal_position;

select pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.course_sources'::regclass;

select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename = 'course_sources')
   or (schemaname = 'storage' and tablename = 'objects');

select pg_get_functiondef(oid) from pg_proc
where pronamespace = 'private'::regnamespace
and proname in ('is_active_account', 'teacher_owns_course',
  'can_author_source_path', 'can_read_enrolled_published_course');

select relname, relrowsecurity from pg_class
where oid in ('public.course_sources'::regclass, 'storage.objects'::regclass);

select id, public, file_size_limit, allowed_mime_types from storage.buckets;

-- Aggregate only: never dump document bodies, object names or signed URLs.
select type, source_kind, extraction_status, count(*) as source_count,
       count(nullif(extracted_content, '')) as with_extracted_text
from public.course_sources group by type, source_kind, extraction_status;
