-- Apply after existing Teamhub migrations. Restricts directory filtering to
-- studios already available to the caller; changes no stored data or roles.
begin;
do $prerequisite$ begin
 if to_regprocedure('public.admin_team_directory(integer,integer,text,text,text,uuid)') is null then
  raise exception 'Bitte zuerst die vorhandene Mitarbeiterverwaltung vollständig einrichten.';
 end if;
end $prerequisite$;
create or replace function public.admin_team_directory(p_page integer default 0,p_size integer default 50,p_query text default '',p_role text default '',p_status text default 'all',p_studio uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
 if not (app_private.has_function('users.view') and app_private.can_page('access')) then raise insufficient_privilege using message='Administrator required'; end if;
 if p_page is null or p_page not between 0 and 10000 or p_size is null or p_size not between 1 and 100 or p_query is null or length(p_query)>200 or p_role is null or p_role not in ('','admin','studio_manager','employee') or p_status is null or p_status not in ('all','active','inactive') then raise check_violation using message='Invalid directory filters'; end if;
 if p_studio is not null and not app_private.has_studio(p_studio) then raise insufficient_privilege using message='Directory studio not granted'; end if;
 with scoped as (
  select p.id,p.full_name,p.role,p.active,p.access_updated_at,u.email,u.last_sign_in_at,u.invited_at,
   coalesce((select jsonb_agg(m.studio_id order by m.studio_id) from public.studio_memberships m where m.user_id=p.id and app_private.has_studio(m.studio_id)),'[]') as studio_ids,
   coalesce(g.can_edit,false) or p.role='admin' as module_editor
  from public.profiles p join auth.users u on u.id=p.id left join public.module_permissions g on g.user_id=p.id
  where app_private.member_visible(p.id) and (trim(p_query)='' or strpos(lower(p.full_name||' '||coalesce(u.email,'')),lower(trim(p_query)))>0)
   and (p_role='' or p.role=p_role) and (p_status='all' or p.active=(p_status='active'))
   and (p_studio is null or p.role='admin' or exists(select 1 from public.studio_memberships m where m.user_id=p.id and m.studio_id=p_studio))
 ), paged as (select * from scoped order by lower(full_name),id offset p_page*p_size limit p_size)
 select jsonb_build_object('members',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from paged p),'total',(select count(*) from scoped),'studios',(select coalesce(jsonb_agg(to_jsonb(s) order by s.name),'[]') from public.studios s where app_private.has_studio(s.id))) into result;
 return result;
end; $$;
revoke all on function public.admin_team_directory(integer,integer,text,text,text,uuid) from public,anon;
grant execute on function public.admin_team_directory(integer,integer,text,text,text,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
