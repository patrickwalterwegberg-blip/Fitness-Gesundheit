create table if not exists public.team_function_access(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 grants text[] not null default '{}',revision integer not null default 1,
 updated_by uuid not null references public.profiles(id),updated_at timestamptz not null default now(),
 check(array_position(grants,null) is null)
);
alter table public.team_function_access enable row level security;
drop policy if exists function_access_read on public.team_function_access;
create policy function_access_read on public.team_function_access for select to authenticated using(app_private.is_active() and (user_id=auth.uid() or app_private.is_admin()));
revoke all on public.team_function_access from public,anon,authenticated;
grant select on public.team_function_access to authenticated;
create or replace function app_private.function_grants(target uuid)
returns text[] language plpgsql stable security definer set search_path='' as $$ declare selected text[]; begin
 select grants into selected from public.team_function_access where user_id=target;
 if found then return selected; end if;
 return array(select key from app_private.function_catalog() c where
 (c.key in ('knowledge.article','knowledge.upload','knowledge.edit') and exists(select 1 from public.team_page_access a where a.user_id=target and 'files'=any(a.pages))) or
 (c.key='modules.create' and exists(select 1 from public.module_permissions where user_id=target and can_create)) or
 (c.key='modules.edit' and exists(select 1 from public.module_permissions where user_id=target and can_edit)) or
 (c.key in ('modules.publish','modules.restore') and exists(select 1 from public.module_permissions where user_id=target and can_publish)) or
 (c.key like 'home.%' and exists(select 1 from public.team_home_editors where user_id=target and enabled)));
end; $$;
-- Preserve individually granted pre-009 file/module/home functions once, without
-- letting future automatic page access confer unrelated actions.
insert into public.team_function_access(user_id,grants,updated_by)
select p.id,app_private.function_grants(p.id),coalesce((select id from public.profiles where role='admin' and active order by id limit 1),p.id)
from public.profiles p where p.role<>'admin' and cardinality(app_private.function_grants(p.id))>0
on conflict(user_id) do nothing;
create or replace function app_private.function_effective(target uuid)
returns text[] language sql stable security definer set search_path='' as $$
 select coalesce(array_agg(c.key order by c.key),'{}') from app_private.function_catalog() c join public.profiles p on p.id=target where p.role='admin' or p.role=any(c.roles) or c.key=any(app_private.function_grants(target));
$$;
create or replace function app_private.function_allowed(target uuid,permission text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=target and active) and permission=any(app_private.function_effective(target));
$$;
create or replace function app_private.has_function(permission text)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.function_allowed(auth.uid(),permission); $$;
create or replace function app_private.function_studio(permission text,site uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select app_private.has_function(permission) and exists(select 1 from app_private.function_catalog() c where c.key=permission and app_private.can_page(c.page)) and (app_private.is_admin() or (site is not null and app_private.has_studio(site)));
$$;
create or replace function app_private.member_visible(target uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select app_private.is_admin() or (app_private.has_function('users.view') and app_private.can_page('access') and exists(select 1 from public.profiles p join public.studio_memberships m on m.user_id=p.id where p.id=target and p.role<>'admin' and app_private.has_studio(m.studio_id)));
$$;
create or replace function app_private.member_editable(target uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select app_private.is_admin() or (app_private.member_visible(target) and not exists(select 1 from public.studio_memberships m where m.user_id=target and not app_private.has_studio(m.studio_id)));
$$;
alter table public.team_page_access drop constraint if exists team_page_access_pages_check;
alter table public.team_page_access add constraint team_page_access_pages_check check(pages<@array['dashboard','tasks','calendar','learning','knowledge','files','modules','builder','chat','feedback','access','controlling']::text[]);
create or replace function public.admin_function_access(p_user uuid,p_grants text[] default null,p_revision integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$ declare member public.profiles; previous public.team_function_access; extra text[]; before_count integer; needed_pages text[]; begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 select * into member from public.profiles where id=p_user for update;
 if not found then raise check_violation using message='Unknown employee'; end if;
 select * into previous from public.team_function_access where user_id=p_user;
 if p_grants is not null then
  if member.role='admin' then raise check_violation using message='Administrators retain full access'; end if;
  if previous.revision is distinct from p_revision then raise serialization_failure using message='Function permissions changed'; end if;
  if array_position(p_grants,null) is not null or cardinality(p_grants)>100 or exists(select 1 from unnest(p_grants) g where not exists(select 1 from app_private.function_catalog() c where c.key=g)) then raise check_violation using message='Invalid function permission'; end if;
  extra:=array(select distinct unnest(p_grants));
  loop
   before_count:=cardinality(extra);
   extra:=array(select distinct x from (select unnest(extra) x union select unnest(c.requires) from app_private.function_catalog() c where c.key=any(extra)) s);
   exit when cardinality(extra)=before_count;
  end loop;
  insert into public.team_function_access(user_id,grants,updated_by) values(p_user,extra,auth.uid()) on conflict(user_id) do update set grants=excluded.grants,revision=team_function_access.revision+1,updated_at=clock_timestamp(),updated_by=auth.uid();
  -- Keep old screens readable; the function-grant row is authoritative once present.
  insert into public.module_permissions(user_id,can_create,can_edit,can_publish) values(p_user,'modules.create'=any(extra),'modules.edit'=any(extra),'modules.publish'=any(extra)) on conflict(user_id) do update set can_create=excluded.can_create,can_edit=excluded.can_edit,can_publish=excluded.can_publish;
  select coalesce(array_agg(distinct c.page),'{}') into needed_pages from app_private.function_catalog() c where c.key=any(extra);
  if 'calendar'=any(needed_pages) then needed_pages:=needed_pages||array['tasks']; end if;
  if cardinality(needed_pages)>0 then
   insert into public.team_page_access(user_id,pages,updated_by) values(p_user,array(select distinct unnest(app_private.default_team_pages(member.role)||needed_pages)),auth.uid()) on conflict(user_id) do update set pages=array(select distinct unnest(team_page_access.pages||needed_pages)),revision=team_page_access.revision+1,updated_at=clock_timestamp(),updated_by=auth.uid();
  end if;
  insert into public.team_access_events(actor_id,target_id,event,details) values(auth.uid(),p_user,'function_permissions_updated',jsonb_build_object('grants',extra));
 end if;
 select * into previous from public.team_function_access where user_id=p_user;
 return jsonb_build_object('version',9,'grants',app_private.function_grants(p_user),'effective',app_private.function_effective(p_user),'role_defaults',(select coalesce(array_agg(c.key),'{}') from app_private.function_catalog() c where member.role='admin' or member.role=any(c.roles)),'revision',previous.revision,'role',member.role);
end; $$;
create or replace function public.team_access_context()
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare p public.profiles; a public.team_page_access; begin
 select * into p from public.profiles where id=auth.uid() and active;
 if not found then raise insufficient_privilege using message='Active employee required'; end if;
 select * into a from public.team_page_access where user_id=p.id;
 return jsonb_build_object('version',9,'pages',case when p.role='admin' then app_private.default_team_pages('admin') else coalesce(a.pages,app_private.default_team_pages(p.role)) end,'can_design',app_private.design_right('edit'),'capabilities',app_private.function_effective(p.id));
end; $$;
create or replace function app_private.design_right(permission text)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('builder') and app_private.has_function('modules.'||permission); $$;
create or replace function app_private.can_view_task(site uuid,assignee uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('tasks') and app_private.has_studio(site) and (assignee=auth.uid() or app_private.has_function('tasks.team')); $$;
create or replace function app_private.can_view_profile(target uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.is_active() and (target=auth.uid() or app_private.is_admin() or exists(select 1 from public.studio_memberships m where m.user_id=target and app_private.has_studio(m.studio_id) and (app_private.can_manage_studio(m.studio_id) or app_private.has_function('tasks.team') or app_private.has_function('learning.assign') or app_private.has_function('learning.practice') or app_private.has_function('controlling.view') or app_private.has_function('users.view')))); $$;
drop policy if exists memberships_read on public.studio_memberships;
create policy memberships_read on public.studio_memberships for select to authenticated using(app_private.is_active() and (user_id=auth.uid() or (app_private.has_studio(studio_id) and app_private.can_view_profile(user_id))));
drop policy if exists tasks_create on public.tasks;
create policy tasks_create on public.tasks for insert to authenticated with check(app_private.function_studio('tasks.create',studio_id) and created_by=auth.uid() and app_private.valid_assignee(assignee_id,studio_id));
drop policy if exists comments_insert on public.task_comments;
create policy comments_insert on public.task_comments for insert to authenticated with check(app_private.has_function('tasks.comment') and author_id=auth.uid() and exists(select 1 from public.tasks t where t.id=task_id and app_private.can_view_task(t.studio_id,t.assignee_id)));
create or replace function app_private.learning_read(aid uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('learning') and (app_private.is_admin() or exists(select 1 from public.learning_assignments a where a.id=aid and app_private.has_studio(a.studio_id) and (a.learner_id=auth.uid() or app_private.has_function('learning.assign') or app_private.has_function('learning.practice') or app_private.has_function('learning.assess')))); $$;
create or replace function app_private.knowledge_manager(site uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('files') and (app_private.function_studio('knowledge.team',site) or app_private.function_studio('knowledge.publish',site) or app_private.function_studio('knowledge.access',site) or app_private.function_studio('knowledge.archive',site) or app_private.function_studio('knowledge.cleanup',site)); $$;
create or replace function app_private.knowledge_contribute(doc uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('files') and app_private.has_function('knowledge.edit') and exists(select 1 from public.knowledge_documents d where d.id=doc and not d.archived and app_private.knowledge_scope(d.studio_id) and (app_private.function_studio('knowledge.team',d.studio_id) or d.created_by=auth.uid())); $$;
create or replace function app_private.home_manage(site uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.function_studio('home.create',site) or app_private.function_studio('home.edit',site) or app_private.function_studio('home.publish',site) or app_private.function_studio('home.archive',site); $$;
create or replace function app_private.feedback_visible(fid uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('feedback') and exists(select 1 from public.team_feedback f where f.id=fid and (app_private.is_admin() or f.author_id=auth.uid() or (f.assignee_id=auth.uid() and app_private.has_studio(f.studio_id)) or app_private.function_studio('feedback.manage',f.studio_id))); $$;
create or replace function app_private.feedback_manage(fid uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('feedback') and exists(select 1 from public.team_feedback f where f.id=fid and (app_private.is_admin() or (f.assignee_id=auth.uid() and app_private.has_studio(f.studio_id)) or app_private.function_studio('feedback.manage',f.studio_id))); $$;
-- Publish permission does not implicitly confer content editing permission.
create or replace function public.publish_team_home_item(p_id uuid,p_revision integer,p_published boolean)
returns void language plpgsql security definer set search_path='' as $$ declare item public.team_home_items; begin
 select * into item from public.team_home_items where id=p_id for update;
 if not found or item.archived or not app_private.function_studio('home.publish',item.studio_id) then raise insufficient_privilege using message='Homepage publication not granted'; end if;
 if item.revision is distinct from p_revision then raise serialization_failure using message='Homepage item changed'; end if;
 if p_published is null then raise check_violation using message='Publication state required'; end if;
 update public.team_home_items set published=p_published,revision=revision+1,updated_by=auth.uid(),updated_at=clock_timestamp() where id=p_id;
end; $$;
revoke all on function public.publish_team_home_item(uuid,integer,boolean) from public,anon;
grant execute on function public.publish_team_home_item(uuid,integer,boolean) to authenticated;
