-- Apply after 001–007. Shared homepage content; existing account roles stay intact.
begin;
create table if not exists public.team_home_editors(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 enabled boolean not null default false, revision integer not null default 1,
 updated_by uuid not null references public.profiles(id), updated_at timestamptz not null default now()
);
create table if not exists public.team_home_items(
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('link','news','contact')),
 title text not null check(length(trim(title)) between 1 and 120),
 body text not null default '' check(length(body)<=4000),
 href text not null default '' check(href='' or (length(href)<=2000 and href~'^(https://[^[:space:]]+|mailto:[^[:space:]]+|tel:[+0-9 ()-]+)$')),
 phone text not null default '' check(length(phone)<=40 and (phone='' or phone~'^[+0-9 ()-]+$')),
 studio_id uuid references public.studios(id),
 reader_roles text[] not null default array['admin','studio_manager','employee']::text[] check(cardinality(reader_roles)>0 and array_position(reader_roles,null) is null and reader_roles<@array['admin','studio_manager','employee']::text[]),
 published boolean not null default false, archived boolean not null default false,
 position integer not null default 0 check(position between 0 and 1000), revision integer not null default 1,
 created_by uuid not null references public.profiles(id), updated_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.team_home_editors enable row level security;
alter table public.team_home_items enable row level security;
create or replace function app_private.home_manage(site uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select app_private.can_page('dashboard') and (app_private.is_admin() or (site is not null and app_private.has_studio(site) and exists(select 1 from public.team_home_editors e where e.user_id=auth.uid() and e.enabled)));
$$;
create or replace function app_private.home_read(site uuid,roles text[],published boolean,archived boolean)
returns boolean language sql stable security definer set search_path='' as $$
 select app_private.can_page('dashboard') and not archived and published and (app_private.is_admin() or ((site is null or app_private.has_studio(site)) and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role=any(roles))));
$$;
drop policy if exists home_items_read on public.team_home_items;
create policy home_items_read on public.team_home_items for select to authenticated using(app_private.home_read(studio_id,reader_roles,published,archived));
drop policy if exists home_editor_read on public.team_home_editors;
create policy home_editor_read on public.team_home_editors for select to authenticated using(app_private.is_active() and (user_id=auth.uid() or app_private.is_admin()));
revoke all on public.team_home_editors,public.team_home_items from public,anon,authenticated;
grant select on public.team_home_editors,public.team_home_items to authenticated;

create or replace function public.team_home_data(p_manage boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare capable boolean; begin
 if not app_private.can_page('dashboard') then raise insufficient_privilege using message='Homepage not granted'; end if;
 capable:=app_private.is_admin() or exists(select 1 from public.team_home_editors e where e.user_id=auth.uid() and e.enabled);
 if p_manage and not capable then raise insufficient_privilege using message='Homepage editing not granted'; end if;
 return jsonb_build_object('can_manage',capable,'items',(select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('editable',app_private.home_manage(i.studio_id)) order by i.position,i.created_at,i.id),'[]') from public.team_home_items i where case when p_manage then app_private.home_manage(i.studio_id) and not i.archived else app_private.home_read(i.studio_id,i.reader_roles,i.published,i.archived) end));
end; $$;
create or replace function public.save_team_home_item(p_id uuid,p_revision integer,p_kind text,p_title text,p_body text,p_href text,p_phone text,p_studio uuid,p_roles text[],p_published boolean,p_position integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$ declare old public.team_home_items; result public.team_home_items; begin
 if not app_private.home_manage(p_studio) then raise insufficient_privilege using message='Homepage editing not granted for this studio'; end if;
 if p_id is not null then
  select * into old from public.team_home_items where id=p_id for update;
  if not found or old.archived or not app_private.home_manage(old.studio_id) then raise insufficient_privilege using message='Homepage item not editable'; end if;
  if old.revision is distinct from p_revision then raise serialization_failure using message='Homepage item changed'; end if;
  update public.team_home_items set kind=p_kind,title=trim(p_title),body=p_body,href=p_href,phone=p_phone,studio_id=p_studio,reader_roles=p_roles,published=p_published,position=p_position,revision=revision+1,updated_by=auth.uid(),updated_at=clock_timestamp() where id=p_id returning * into result;
 else
  if p_revision is not null then raise check_violation using message='Invalid new item revision'; end if;
  insert into public.team_home_items(kind,title,body,href,phone,studio_id,reader_roles,published,position,created_by,updated_by) values(p_kind,trim(p_title),p_body,p_href,p_phone,p_studio,p_roles,p_published,p_position,auth.uid(),auth.uid()) returning * into result;
 end if;
 return to_jsonb(result);
end; $$;
create or replace function public.archive_team_home_item(p_id uuid,p_revision integer)
returns void language plpgsql security definer set search_path='' as $$ declare old public.team_home_items; begin
 select * into old from public.team_home_items where id=p_id for update;
 if not found or not app_private.home_manage(old.studio_id) then raise insufficient_privilege using message='Homepage item not editable'; end if;
 if old.revision is distinct from p_revision then raise serialization_failure using message='Homepage item changed'; end if;
 update public.team_home_items set archived=true,published=false,revision=revision+1,updated_by=auth.uid(),updated_at=clock_timestamp() where id=p_id;
end; $$;
create or replace function public.admin_home_editor(p_user uuid,p_enabled boolean default null,p_revision integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$ declare p public.profiles; e public.team_home_editors; begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 select * into p from public.profiles where id=p_user for update;
 if not found then raise check_violation using message='Unknown employee'; end if;
 select * into e from public.team_home_editors where user_id=p_user;
 if p_enabled is not null then
  if p.role='admin' then raise check_violation using message='Admin already has homepage editing access'; end if;
  if e.revision is distinct from p_revision then raise serialization_failure using message='Homepage access changed'; end if;
  insert into public.team_home_editors(user_id,enabled,updated_by) values(p_user,p_enabled,auth.uid()) on conflict(user_id) do update set enabled=excluded.enabled,revision=team_home_editors.revision+1,updated_by=auth.uid(),updated_at=clock_timestamp();
  select * into e from public.team_home_editors where user_id=p_user;
 end if;
 return jsonb_build_object('enabled',p.role='admin' or coalesce(e.enabled,false),'revision',e.revision);
end; $$;
revoke all on function public.team_home_data(boolean),public.save_team_home_item(uuid,integer,text,text,text,text,text,uuid,text[],boolean,integer),public.archive_team_home_item(uuid,integer),public.admin_home_editor(uuid,boolean,integer) from public,anon;
grant execute on function public.team_home_data(boolean),public.save_team_home_item(uuid,integer,text,text,text,text,text,uuid,text[],boolean,integer),public.archive_team_home_item(uuid,integer),public.admin_home_editor(uuid,boolean,integer) to authenticated;
revoke all on function app_private.home_manage(uuid),app_private.home_read(uuid,text[],boolean,boolean) from public,anon;
grant execute on function app_private.home_manage(uuid),app_private.home_read(uuid,text[],boolean,boolean) to authenticated;
-- Optional business profile details. No private home addresses or birth dates.
create table if not exists public.team_member_info(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 job_title text not null default '' check(length(job_title)<=100),
 phone text not null default '' check(length(phone)<=40 and (phone='' or phone~'^[+0-9 ()-]+$')),
 started_on date, revision integer not null default 1,
 updated_by uuid not null references public.profiles(id),updated_at timestamptz not null default now()
);
alter table public.team_member_info enable row level security;
drop policy if exists member_info_read on public.team_member_info;
create policy member_info_read on public.team_member_info for select to authenticated using(app_private.is_active() and (user_id=auth.uid() or app_private.is_admin()));
revoke all on public.team_member_info from public,anon,authenticated;
grant select on public.team_member_info to authenticated;
create or replace function public.admin_member_info(p_user uuid,p_job_title text default null,p_phone text default null,p_started_on date default null,p_revision integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$ declare info public.team_member_info; begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 perform 1 from public.profiles where id=p_user for update;
 if not found then raise check_violation using message='Unknown employee'; end if;
 select * into info from public.team_member_info where user_id=p_user;
 if p_job_title is not null then
  if info.revision is distinct from p_revision then raise serialization_failure using message='Employee information changed'; end if;
  insert into public.team_member_info(user_id,job_title,phone,started_on,updated_by) values(p_user,trim(p_job_title),p_phone,p_started_on,auth.uid()) on conflict(user_id) do update set job_title=excluded.job_title,phone=excluded.phone,started_on=excluded.started_on,revision=team_member_info.revision+1,updated_by=auth.uid(),updated_at=clock_timestamp();
  select * into info from public.team_member_info where user_id=p_user;
 end if;
 return jsonb_build_object('job_title',coalesce(info.job_title,''),'phone',coalesce(info.phone,''),'started_on',info.started_on,'revision',info.revision);
end; $$;
revoke all on function public.admin_member_info(uuid,text,text,date,integer) from public,anon;
grant execute on function public.admin_member_info(uuid,text,text,date,integer) to authenticated;
notify pgrst,'reload schema';
commit;
