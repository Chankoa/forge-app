-- The live profile table has column-level UPDATE grants. Allow users to edit
-- only the additive I.11.B identity fields without widening table privileges.
grant update (headline, location, bio) on table public.profiles to authenticated;
