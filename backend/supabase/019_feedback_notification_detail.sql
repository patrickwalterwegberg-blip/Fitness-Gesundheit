-- Apply after Teamhub 001–012 and existing later fixes; no model access needed.
-- Read-only targeted feedback DTO with the same fields and source rules as 007/009.
begin;
do $prerequisite$ begin
 if to_regprocedure('public.team_feedback_list(integer,integer,text,uuid)') is null
  or to_regprocedure('app_private.feedback_visible(uuid)') is null
  or to_regprocedure('app_private.feedback_manage(uuid)') is null then
  raise exception 'Bitte zuerst die bestehenden Teamhub-Erweiterungen für Feedback und Rechte einrichten.';
 end if;
end $prerequisite$;
create or replace function public.team_feedback_detail(p_feedback uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not app_private.can_page('feedback') then
  raise insufficient_privilege using message='Feedback not granted';
 end if;
 select to_jsonb(item) into result from (
  select f.id,f.reference,f.studio_id,f.category,f.title,f.body,f.anonymous,f.assignee_id,f.status,f.reply,f.revision,f.created_at,f.updated_at,
   case when f.anonymous then null else author.full_name end as author_name,handler.full_name as assignee_name,
   coalesce(f.author_id=auth.uid(),false) as own,app_private.feedback_manage(f.id) as can_manage
  from public.team_feedback f
   left join public.profiles author on author.id=f.author_id
   left join public.profiles handler on handler.id=f.assignee_id
  where f.id=p_feedback and app_private.feedback_visible(f.id)
 ) item;
 -- Missing and inaccessible targets have exactly the same result.
 return result;
end;
$$;
revoke all on function public.team_feedback_detail(uuid) from public,anon;
grant execute on function public.team_feedback_detail(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
