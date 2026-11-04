-- Apply after migrations 001-004. Read-only user summaries, no extra user roles.
begin;
drop function if exists public.admin_team_directory(integer,integer);
create or replace function public.admin_team_directory(p_page integer default 0,p_size integer default 50,p_query text default '',p_role text default '',p_status text default 'all',p_studio uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 if p_page is null or p_page not between 0 and 10000 or p_size is null or p_size not between 1 and 100 or p_query is null or length(p_query)>200 or p_role is null or p_role not in ('','admin','studio_manager','employee') or p_status is null or p_status not in ('all','active','inactive') then raise check_violation using message='Invalid directory filters'; end if;
 with scoped as (
  select p.id,p.full_name,p.role,p.active,p.access_updated_at,u.email,u.last_sign_in_at,u.invited_at,
   coalesce((select jsonb_agg(m.studio_id order by m.studio_id) from public.studio_memberships m where m.user_id=p.id),'[]') as studio_ids,
   coalesce(g.can_edit,false) or p.role='admin' as module_editor
  from public.profiles p join auth.users u on u.id=p.id left join public.module_permissions g on g.user_id=p.id
  where (trim(p_query)='' or strpos(lower(p.full_name||' '||coalesce(u.email,'')),lower(trim(p_query)))>0)
   and (p_role='' or p.role=p_role) and (p_status='all' or p.active=(p_status='active'))
   and (p_studio is null or p.role='admin' or exists(select 1 from public.studio_memberships m where m.user_id=p.id and m.studio_id=p_studio))
 ), paged as (select * from scoped order by lower(full_name),id offset p_page*p_size limit p_size)
 select jsonb_build_object('members',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from paged p),'total',(select count(*) from scoped),'studios',(select coalesce(jsonb_agg(to_jsonb(s) order by s.name),'[]') from public.studios s)) into result;
 return result;
end; $$;

create or replace function public.admin_team_member_detail(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare member jsonb; begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 select to_jsonb(p)||jsonb_build_object('email',u.email,'last_sign_in_at',u.last_sign_in_at,'invited_at',u.invited_at) into member from public.profiles p join auth.users u on u.id=p.id where p.id=p_user;
 if member is null then raise check_violation using message='Unknown team member'; end if;
 return jsonb_build_object('member',member,
  'tasks',(select jsonb_build_object('total',count(*),'done',count(*) filter(where t.status='done'),'open',count(*) filter(where t.status<>'done'),'overdue',count(*) filter(where t.status<>'done' and t.due_date<(now() at time zone 'Europe/Berlin')::date)) from public.tasks t where t.assignee_id=p_user),
  'courses',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'title',c.title,'lesson_count',c.lesson_count,'lessons_read',coalesce(p.lessons_read,0),'quiz_passed',coalesce(p.quiz_passed,false),'practice_required',a.requires_practice,'practice_confirmed',coalesce(p.practice_confirmed,false),'due_date',a.due_date) order by c.title),'[]') from public.learning_assignments a join public.learning_courses c on c.id=a.course_id left join public.learning_progress p on p.assignment_id=a.id where a.learner_id=p_user),
  'design_rights',(select jsonb_build_object('create',coalesce(g.can_create,false),'edit',coalesce(g.can_edit,false),'publish',coalesce(g.can_publish,false)) from (select 1) x left join public.module_permissions g on g.user_id=p_user)
 );
end; $$;
revoke all on function public.admin_team_directory(integer,integer,text,text,text,uuid),public.admin_team_member_detail(uuid) from public,anon;
grant execute on function public.admin_team_directory(integer,integer,text,text,text,uuid),public.admin_team_member_detail(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
