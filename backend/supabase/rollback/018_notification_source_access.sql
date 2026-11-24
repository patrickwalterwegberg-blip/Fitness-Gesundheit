-- Emergency rollback only: restores the previous, weaker notification predicate.
-- This reopens reads of feedback/course titles after studio withdrawal.
-- Prefer a forward correction; restrict the affected areas before rollback.
-- Existing notification history and read markers are preserved.
begin;
create or replace function app_private.notification_visible(n public.team_notifications)
returns boolean language sql stable security definer set search_path='' as $$
 select n.user_id=auth.uid() and app_private.is_active() and case n.kind
 when 'task' then exists(select 1 from public.tasks t where t.id=n.target_id and app_private.task_visible(t))
 when 'event' then exists(select 1 from public.calendar_events e where e.id=n.target_id and app_private.event_visible(e))
 when 'chat' then app_private.chat_visible(n.channel_id)
 when 'feedback' then app_private.can_page('feedback') and exists(select 1 from public.team_feedback f where f.id=n.target_id and (f.author_id=auth.uid() or f.assignee_id=auth.uid() or app_private.is_admin()))
 when 'onboarding' then exists(select 1 from public.onboarding_enrollments e where e.id=n.target_id and app_private.onboarding_visible(e))
 when 'learning' then app_private.can_page('learning') and exists(select 1 from public.learning_assignments a where a.id=n.target_id and a.learner_id=auth.uid())
 else false end;
$$;
revoke all on function app_private.notification_visible(public.team_notifications) from public,anon;
grant execute on function app_private.notification_visible(public.team_notifications) to authenticated;
commit;
