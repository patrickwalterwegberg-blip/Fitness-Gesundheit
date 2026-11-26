-- Removes only the new read endpoint. Apply only with a matching frontend rollback.
-- Existing feedback, list, notifications, read markers and permission helpers remain.
begin;
drop function if exists public.team_feedback_detail(uuid);
notify pgrst,'reload schema';
commit;
