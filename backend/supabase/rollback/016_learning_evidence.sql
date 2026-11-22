-- Removes only the personal evidence reader. Existing progress/events remain.
begin;
drop function if exists public.learning_evidence(uuid);
notify pgrst,'reload schema';
commit;
