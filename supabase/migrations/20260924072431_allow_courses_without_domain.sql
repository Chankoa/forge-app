-- A course can be created before its owner chooses a taxonomy domain.
-- Keep the existing FK: a non-null domain must still reference a real domain.
alter table public.courses alter column domain_id drop not null;
