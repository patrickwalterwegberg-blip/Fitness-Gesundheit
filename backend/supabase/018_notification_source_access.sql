-- Apply after the existing Teamhub migrations 001–012 and their later fixes.
-- Adds source-access checks to existing feedback/learning notification reads.
-- No notification, read marker, profile or membership is changed or deleted.
begin;
do $prerequisite$ begin
 if to_regclass('public.team_notifications') is null or to_regclass('public.onboarding_enrollments') is null then
  raise exception 'Bitte zuerst die vorhandenen Teamhub-Erweiterungen 001 bis 012 vollständig einrichten.';
 end if;
 if to_regprocedure('app_private.notification_visible(public.team_notifications)') is null
  or to_regprocedure('app_private.feedback_visible(uuid)') is null
  or to_regprocedure('app_private.learning_read(uuid)') is null then
  raise exception 'Die vorhandenen Teamhub-Zugriffsregeln fehlen. Bitte zuerst die Einrichtung prüfen.';
 end if;
end $prerequisite$;
create or replace function app_private.notification_visible(n public.team_notifications)
returns boolean language sql stable security definer set search_path='' as $$
 select n.user_id=auth.uid() and app_private.is_active() and case n.kind
 when 'task' then exists(select 1 from public.tasks t where t.id=n.target_id and app_private.task_visible(t))
 when 'event' then exists(select 1 from public.calendar_events e where e.id=n.target_id and app_private.event_visible(e))
 when 'chat' then app_private.chat_visible(n.channel_id)
 when 'feedback' then app_private.can_page('feedback') and exists(select 1 from public.team_feedback f where f.id=n.target_id and (f.author_id=auth.uid() or f.assignee_id=auth.uid() or app_private.is_admin()) and app_private.feedback_visible(f.id))
 when 'onboarding' then exists(select 1 from public.onboarding_enrollments e where e.id=n.target_id and app_private.onboarding_visible(e))
 when 'learning' then app_private.can_page('learning') and exists(select 1 from public.learning_assignments a where a.id=n.target_id and a.learner_id=auth.uid() and app_private.learning_read(a.id))
 else false end;
$$;
revoke all on function app_private.notification_visible(public.team_notifications) from public,anon;
grant execute on function app_private.notification_visible(public.team_notifications) to authenticated;
commit;
