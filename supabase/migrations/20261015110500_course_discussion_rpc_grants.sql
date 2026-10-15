-- Close the explicit anon EXECUTE grant observed after the V1 function creation.
revoke all on function public.list_course_discussion_messages(uuid) from anon;
revoke all on function public.list_course_discussion_messages(uuid) from public;
grant execute on function public.list_course_discussion_messages(uuid) to authenticated;
