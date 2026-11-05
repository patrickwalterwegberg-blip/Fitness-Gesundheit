-- Apply after 001–007. Includes idempotent 008 setup. Existing roles remain unchanged.
begin;

-- Apply after 001–007. Shared homepage content; existing account roles stay intact.
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


create or replace function app_private.function_catalog() returns table(key text,label text,page text,roles text[],requires text[]) language sql immutable set search_path='' as $$ select key,label,page,roles,requires from jsonb_to_recordset('[{"group": "Aufgaben", "key": "tasks.team", "label": "Teamaufgaben ansehen", "page": "tasks", "roles": ["studio_manager"], "requires": []}, {"group": "Aufgaben", "key": "tasks.create", "label": "Aufgaben erstellen", "page": "tasks", "roles": ["studio_manager"], "requires": []}, {"group": "Aufgaben", "key": "tasks.edit", "label": "Aufgabentext, Frist und Priorität bearbeiten", "page": "tasks", "roles": ["studio_manager"], "requires": []}, {"group": "Aufgaben", "key": "tasks.assign", "label": "Aufgaben anderen Mitarbeitern zuweisen", "page": "tasks", "roles": ["studio_manager"], "requires": ["tasks.team"]}, {"group": "Aufgaben", "key": "tasks.status", "label": "Status eigener Aufgaben ändern", "page": "tasks", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Aufgaben", "key": "tasks.team_status", "label": "Status von Teamaufgaben ändern", "page": "tasks", "roles": ["studio_manager"], "requires": ["tasks.team"]}, {"group": "Aufgaben", "key": "tasks.comment", "label": "Aufgaben kommentieren", "page": "tasks", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Lernhub", "key": "learning.read", "label": "Eigene Lektionen lesen und bestätigen", "page": "learning", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Lernhub", "key": "learning.quiz", "label": "Eigene Quizfragen beantworten", "page": "learning", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Lernhub", "key": "learning.courses", "label": "Kurse erstellen", "page": "learning", "roles": [], "requires": []}, {"group": "Lernhub", "key": "learning.assign", "label": "Kurse zuweisen", "page": "learning", "roles": [], "requires": []}, {"group": "Lernhub", "key": "learning.practice", "label": "Praxiseinweisungen bestätigen", "page": "learning", "roles": [], "requires": []}, {"group": "Lernhub", "key": "learning.assess", "label": "Externe Wissensprüfungen dokumentieren", "page": "learning", "roles": [], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.read", "label": "Freigegebene Inhalte und Originaldateien öffnen", "page": "knowledge", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.article", "label": "Wissensartikel anlegen", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.upload", "label": "Dateien hochladen", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.edit", "label": "Eigene Inhalte bearbeiten", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.team", "label": "Inhalte anderer Mitarbeiter bearbeiten", "page": "files", "roles": ["studio_manager"], "requires": ["knowledge.edit"]}, {"group": "Dateien & Wissen", "key": "knowledge.publish", "label": "Inhalte veröffentlichen", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.access", "label": "Leserrollen und Standortfreigaben ändern", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.archive", "label": "Inhalte archivieren", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.cleanup", "label": "Unvollständige Uploads anderer Mitarbeiter bereinigen", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Modulbaukasten", "key": "modules.create", "label": "Neue Module erstellen", "page": "builder", "roles": [], "requires": ["modules.edit"]}, {"group": "Modulbaukasten", "key": "modules.edit", "label": "Modulaufbau bearbeiten", "page": "builder", "roles": [], "requires": []}, {"group": "Modulbaukasten", "key": "modules.publish", "label": "Modulversionen veröffentlichen", "page": "builder", "roles": [], "requires": ["modules.edit"]}, {"group": "Modulbaukasten", "key": "modules.restore", "label": "Frühere Modulversion wiederherstellen", "page": "builder", "roles": [], "requires": ["modules.publish"]}, {"group": "Modulbaukasten", "key": "modules.records", "label": "Freigegebene Moduleinträge speichern", "page": "modules", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Startseite", "key": "home.create", "label": "Startseiteneinträge anlegen", "page": "dashboard", "roles": [], "requires": []}, {"group": "Startseite", "key": "home.edit", "label": "Startseiteneinträge bearbeiten", "page": "dashboard", "roles": [], "requires": []}, {"group": "Startseite", "key": "home.publish", "label": "Startseiteneinträge veröffentlichen", "page": "dashboard", "roles": [], "requires": []}, {"group": "Startseite", "key": "home.archive", "label": "Startseiteneinträge ausblenden", "page": "dashboard", "roles": [], "requires": []}, {"group": "Chat", "key": "chat.send", "label": "Nachrichten senden", "page": "chat", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Chat", "key": "chat.channels", "label": "Studioübergreifende Chatkanäle verwalten", "page": "chat", "roles": [], "requires": []}, {"group": "Feedback", "key": "feedback.submit", "label": "Eigenes Feedback abgeben und verfolgen", "page": "feedback", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Feedback", "key": "feedback.manage", "label": "Feedback des eigenen Studios bearbeiten", "page": "feedback", "roles": [], "requires": []}, {"group": "Feedback", "key": "feedback.reassign", "label": "Zuständigkeit einer Meldung ändern", "page": "feedback", "roles": [], "requires": ["feedback.manage"]}, {"group": "Feedback", "key": "feedback.routes", "label": "Feedback-Zuständigkeiten festlegen", "page": "feedback", "roles": [], "requires": []}, {"group": "Nutzerverwaltung", "key": "users.view", "label": "Mitarbeiterprofile ansehen", "page": "access", "roles": [], "requires": []}, {"group": "Nutzerverwaltung", "key": "users.invite", "label": "Einzelne Mitarbeiter einladen", "page": "access", "roles": [], "requires": ["users.view"]}, {"group": "Nutzerverwaltung", "key": "users.import", "label": "Mitarbeiter per CSV oder Excel importieren", "page": "access", "roles": [], "requires": ["users.invite"]}, {"group": "Nutzerverwaltung", "key": "users.profile", "label": "Berufliche Profilinformationen bearbeiten", "page": "access", "roles": [], "requires": ["users.view"]}, {"group": "Nutzerverwaltung", "key": "users.access", "label": "Zugänge sperren und Studiozuordnungen verwalten", "page": "access", "roles": [], "requires": ["users.view"]}, {"group": "Nutzerverwaltung", "key": "users.login", "label": "Anmeldelinks anfordern", "page": "access", "roles": [], "requires": ["users.view"]}, {"group": "Controlling", "key": "controlling.view", "label": "Controlling für eigene Studios ansehen", "page": "controlling", "roles": [], "requires": []}, {"group": "Controlling", "key": "controlling.export", "label": "Controlling als CSV exportieren", "page": "controlling", "roles": [], "requires": ["controlling.view"]}]'::jsonb) as c(key text,label text,page text,roles text[],requires text[]); $$;

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


create or replace function public.admin_page_access(p_user uuid,p_pages text[] default null,p_revision integer default null,p_reset boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$ declare p public.profiles; a public.team_page_access; begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 select * into p from public.profiles where id=p_user for update;
 if not found then raise check_violation using message='Unknown employee'; end if;
 select * into a from public.team_page_access where user_id=p_user;
 if p_pages is not null or p_reset then
  if p.role='admin' then raise check_violation using message='Admin and management always have full access'; end if;
  if a.revision is distinct from p_revision then raise serialization_failure using message='Page access changed'; end if;
  if p_reset then delete from public.team_page_access where user_id=p_user;
  else
   if exists(select 1 from unnest(p_pages) x where x is null or x not in ('dashboard','tasks','calendar','learning','knowledge','files','modules','builder','chat','feedback','access','controlling')) or ('calendar'=any(p_pages) and not('tasks'=any(p_pages))) then raise check_violation using message='Invalid page permissions'; end if;
   insert into public.team_page_access(user_id,pages,updated_by) values(p_user,array(select distinct unnest(p_pages)),auth.uid())
   on conflict(user_id) do update set pages=excluded.pages,revision=team_page_access.revision+1,updated_at=clock_timestamp(),updated_by=auth.uid();
  end if;
 end if;
 select * into a from public.team_page_access where user_id=p_user;
 return jsonb_build_object('pages',case when p.role='admin' then app_private.default_team_pages('admin') else coalesce(a.pages,app_private.default_team_pages(p.role)) end,'revision',a.revision,'defaulted',a.user_id is null,'role',p.role);
end; $$;

create or replace function app_private.guard_task()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not app_private.is_active() then raise insufficient_privilege using message = 'Active employee profile required'; end if;
  if tg_op = 'INSERT' then
    if not app_private.function_studio('tasks.create',new.studio_id) then raise insufficient_privilege using message = 'Task creation requires a manager'; end if;
    if new.assignee_id<>auth.uid() and not app_private.function_studio('tasks.assign',new.studio_id) then raise insufficient_privilege using message='Task assignment not granted'; end if;
    new.created_by := auth.uid();
    new.created_at := clock_timestamp();
  else
    if not (app_private.function_studio('tasks.edit',old.studio_id) and app_private.function_studio('tasks.edit',new.studio_id)) and
      row(new.title, new.description, new.due_date, new.priority)
      is distinct from row(old.title, old.description, old.due_date, old.priority)
    then raise insufficient_privilege using message = 'Employees can change only task status'; end if;
    if row(new.studio_id,new.assignee_id) is distinct from row(old.studio_id,old.assignee_id) and not (app_private.function_studio('tasks.assign',old.studio_id) and app_private.function_studio('tasks.assign',new.studio_id)) then raise insufficient_privilege using message='Task assignment not granted'; end if;
    if new.status is distinct from old.status and not app_private.has_function(case when old.assignee_id=auth.uid() then 'tasks.status' else 'tasks.team_status' end) then raise insufficient_privilege using message='Task status not granted'; end if;
    new.id := old.id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  if not app_private.valid_assignee(new.assignee_id, new.studio_id) then raise check_violation using message = 'Assignee must be active and belong to the studio'; end if;
  new.updated_at := clock_timestamp();
  if new.status = 'done' then
    if tg_op = 'UPDATE' and old.status = 'done' then new.completed_at := old.completed_at;
    else new.completed_at := clock_timestamp(); end if;
  else new.completed_at := null; end if;
  return new;
end;
$$;

alter table public.learning_courses add column if not exists created_by uuid references public.profiles(id);
drop policy if exists learning_courses_read on public.learning_courses;
create policy learning_courses_read on public.learning_courses for select to authenticated using(app_private.is_admin() or (app_private.can_page('learning') and (app_private.has_function('learning.courses') or app_private.has_function('learning.assign') or app_private.has_function('learning.practice') or app_private.has_function('learning.assess'))) or exists(select 1 from public.learning_assignments a where a.course_id=learning_courses.id and app_private.learning_read(a.id)));
drop policy if exists material_read on public.learning_material;
create policy material_read on public.learning_material for select to authenticated using(app_private.is_admin() or (app_private.can_page('learning') and (app_private.has_function('learning.courses') or app_private.has_function('learning.assign') or app_private.has_function('learning.practice') or app_private.has_function('learning.assess'))) or exists(select 1 from public.learning_assignments a where a.course_id=learning_material.course_id and app_private.learning_read(a.id)));


create or replace function public.save_learning_course(p_course uuid,p_title text,p_lessons jsonb,p_questions jsonb,p_answers jsonb,p_expected_revision integer default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid; rev integer; item jsonb; i integer; normalized_lessons jsonb:='[]'; normalized_questions jsonb:='[]';
begin
 if not (app_private.has_function('learning.courses') and app_private.can_page('learning')) then raise insufficient_privilege using message='Administrator required'; end if;
 if p_title is null or length(trim(p_title)) not between 1 and 180
 or jsonb_typeof(p_lessons) is distinct from 'array' or jsonb_array_length(p_lessons) not between 1 and 50
 or jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions) not between 1 and 20
 or jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers)<>jsonb_array_length(p_questions)
 then raise check_violation using message='Invalid course'; end if;
 for item in select value from jsonb_array_elements(p_lessons) loop
  if jsonb_typeof(item->'title') is distinct from 'string' or length(trim(item->>'title')) not between 1 and 180
   or jsonb_typeof(item->'body') is distinct from 'string' or length(trim(item->>'body')) not between 1 and 20000
  then raise check_violation using message='Invalid lesson'; end if;
  normalized_lessons:=normalized_lessons||jsonb_build_array(jsonb_build_object('title',trim(item->>'title'),'body',item->>'body'));
 end loop;
 for i in 0..jsonb_array_length(p_questions)-1 loop
  item:=p_questions->i;
  if jsonb_typeof(item->'prompt') is distinct from 'string' or length(trim(item->>'prompt')) not between 1 and 1000
   or jsonb_typeof(item->'options') is distinct from 'array' or jsonb_array_length(item->'options') not between 2 and 6
  then raise check_violation using message='Invalid question'; end if;
  if exists(select 1 from jsonb_array_elements(item->'options') o where jsonb_typeof(o) is distinct from 'string' or length(trim(o#>>'{}')) not between 1 and 500)
   or jsonb_typeof(p_answers->i) is distinct from 'number' or (p_answers->>i)!~'^[0-9]+$'
   or (p_answers->>i)::integer not between 0 and jsonb_array_length(item->'options')-1
  then raise check_violation using message='Invalid answer'; end if;
  normalized_questions:=normalized_questions||jsonb_build_array(jsonb_build_object('prompt',trim(item->>'prompt'),'options',item->'options'));
 end loop;
 if p_course is null then
  insert into public.learning_courses(title,lesson_count,created_by) values(trim(p_title),jsonb_array_length(p_lessons),auth.uid()) returning id into cid;
 else
  cid:=p_course;
  if not app_private.is_admin() and not exists(select 1 from public.learning_courses where id=cid and created_by=auth.uid()) then raise insufficient_privilege using message='Only own unassigned courses may be edited'; end if;
  perform 1 from public.learning_courses where id=cid for update;
  select revision into rev from public.learning_material where course_id=cid;
  if rev is null or rev is distinct from p_expected_revision then raise serialization_failure using message='Course changed; reload'; end if;
  if exists(select 1 from public.learning_assignments where course_id=cid) then raise check_violation using message='Assigned courses are immutable; create a copy'; end if;
  update public.learning_courses set title=trim(p_title),lesson_count=jsonb_array_length(p_lessons) where id=cid;
 end if;
 insert into public.learning_material(course_id,lessons,questions) values(cid,normalized_lessons,normalized_questions)
 on conflict(course_id) do update set lessons=excluded.lessons,questions=excluded.questions,revision=learning_material.revision+1,updated_at=clock_timestamp();
 insert into app_private.learning_answer_keys(course_id,answers) values(cid,p_answers)
 on conflict(course_id) do update set answers=excluded.answers;
 return cid;
end; $$;

create or replace function public.create_learning_assignment(p_learner uuid,p_course uuid,p_studio uuid,p_due date,p_practice boolean)
returns uuid language plpgsql security definer set search_path='' as $$ declare aid uuid; begin
 if not app_private.function_studio('learning.assign',p_studio) then raise insufficient_privilege using message='Administrator required'; end if;
 perform 1 from public.learning_courses where id=p_course and active for update;
 if not found or not app_private.valid_assignee(p_learner,p_studio) then raise check_violation using message='Invalid learner, studio or course'; end if;
 insert into public.learning_assignments(learner_id,course_id,studio_id,due_date,requires_practice,created_by) values(p_learner,p_course,p_studio,p_due,p_practice,auth.uid()) returning id into aid;
 insert into public.learning_progress(assignment_id) values(aid); return aid;
end; $$;

create or replace function public.confirm_learning_practice(p_assignment uuid,p_notes text default '')
returns void language plpgsql security definer set search_path='' as $$ declare ready boolean; begin
 if not exists(select 1 from public.learning_assignments a where a.id=p_assignment and app_private.function_studio('learning.practice',a.studio_id)) then raise insufficient_privilege using message='Administrator required'; end if;
 select p.quiz_passed and p.lessons_read=c.lesson_count and a.requires_practice and not p.practice_confirmed into ready from public.learning_progress p join public.learning_assignments a on a.id=p.assignment_id join public.learning_courses c on c.id=a.course_id where a.id=p_assignment for update of p;
 if ready is distinct from true or length(p_notes)>2000 then raise check_violation using message='Learning prerequisites missing or practice already confirmed'; end if;
 update public.learning_progress set practice_confirmed=true,confirmed_by=auth.uid(),confirmed_at=clock_timestamp(),updated_at=clock_timestamp() where assignment_id=p_assignment;
 insert into public.learning_events(assignment_id,actor_id,event,notes) values(p_assignment,auth.uid(),'Practical instruction confirmed',p_notes);
 end; $$;

create or replace function public.record_learning_assessment(p_assignment uuid,p_passed boolean,p_notes text default '')
returns void language plpgsql security definer set search_path='' as $$ declare count_read integer; maximum integer; begin
 if not exists(select 1 from public.learning_assignments a where a.id=p_assignment and app_private.function_studio('learning.assess',a.studio_id)) then raise insufficient_privilege using message='Administrator required'; end if;
 select p.lessons_read,c.lesson_count into count_read,maximum from public.learning_progress p join public.learning_assignments a on a.id=p.assignment_id join public.learning_courses c on c.id=a.course_id where a.id=p_assignment;
 if maximum is null or (p_passed and count_read<>maximum) or length(p_notes)>2000 then raise check_violation using message='Reading incomplete or invalid assessment'; end if;
 update public.learning_progress set quiz_passed=p_passed,practice_confirmed=case when p_passed then practice_confirmed else false end,confirmed_by=case when p_passed then confirmed_by else null end,confirmed_at=case when p_passed then confirmed_at else null end,updated_at=clock_timestamp() where assignment_id=p_assignment;
 insert into public.learning_events(assignment_id,actor_id,event,notes) values(p_assignment,auth.uid(),case when p_passed then 'Knowledge assessment passed' else 'Knowledge assessment not passed' end,p_notes);
 end; $$;

create or replace function public.acknowledge_learning_lesson(p_assignment uuid,p_lesson integer)
returns integer language plpgsql security definer set search_path='' as $$ declare a public.learning_assignments; maximum integer; n integer; begin
 select * into a from public.learning_assignments where id=p_assignment;
 if not app_private.has_function('learning.read') then raise insufficient_privilege using message='Learning action not granted'; end if;
 if a.id is null or a.learner_id<>auth.uid() or not app_private.learning_read(a.id) then raise insufficient_privilege using message='Own learning assignment required'; end if;
 select jsonb_array_length(m.lessons) into maximum from public.learning_material m join public.learning_courses c on c.id=m.course_id where m.course_id=a.course_id and c.active;
 if maximum is null or p_lesson is null or p_lesson<0 or p_lesson>=maximum then raise check_violation using message='Invalid lesson'; end if;
 perform 1 from public.learning_progress where assignment_id=a.id for update;
 insert into public.learning_reads(assignment_id,lesson_index) values(a.id,p_lesson) on conflict do nothing;
 select count(*) into n from public.learning_reads where assignment_id=a.id;
 update public.learning_progress set lessons_read=n,updated_at=clock_timestamp() where assignment_id=a.id;
 return n;
end; $$;

create or replace function public.submit_learning_quiz(p_assignment uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.learning_assignments; p public.learning_progress; keys jsonb; qs jsonb; maximum integer; i integer; correct integer:=0; passed boolean;
begin
 select * into a from public.learning_assignments where id=p_assignment;
 if not app_private.has_function('learning.quiz') then raise insufficient_privilege using message='Learning action not granted'; end if;
 if a.id is null or a.learner_id<>auth.uid() or not app_private.learning_read(a.id) then raise insufficient_privilege using message='Own learning assignment required'; end if;
 select * into p from public.learning_progress where assignment_id=a.id for update;
 select k.answers,m.questions,c.lesson_count into keys,qs,maximum from app_private.learning_answer_keys k join public.learning_material m on m.course_id=k.course_id join public.learning_courses c on c.id=k.course_id where k.course_id=a.course_id and c.active;
 if keys is null or p.lessons_read is distinct from maximum then raise check_violation using message='Read every lesson before the quiz'; end if;
 if exists(select 1 from public.learning_attempts where assignment_id=a.id and at>clock_timestamp()-interval '10 seconds') then raise check_violation using message='Wait ten seconds before retrying'; end if;
 if jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers)<>jsonb_array_length(keys) then raise check_violation using message='Answer every question'; end if;
 for i in 0..jsonb_array_length(keys)-1 loop
  if jsonb_typeof(p_answers->i) is distinct from 'number' or (p_answers->>i)!~'^[0-9]+$' or (p_answers->>i)::integer not between 0 and jsonb_array_length(qs->i->'options')-1 then raise check_violation using message='Invalid quiz answer'; end if;
  if p_answers->i=keys->i then correct:=correct+1; end if;
 end loop;
 passed:=correct*100>=jsonb_array_length(keys)*80;
 insert into public.learning_attempts(assignment_id,correct,total,passed) values(a.id,correct,jsonb_array_length(keys),passed);
 update public.learning_progress set quiz_passed=quiz_passed or passed,updated_at=clock_timestamp() where assignment_id=a.id;
 insert into public.learning_events(assignment_id,actor_id,event,notes) values(a.id,auth.uid(),case when passed then 'Online quiz passed' else 'Online quiz not passed' end,correct||'/'||jsonb_array_length(keys));
 return jsonb_build_object('correct',correct,'total',jsonb_array_length(keys),'passed',passed);
end; $$;

create or replace function public.prepare_knowledge_version(p_document uuid,p_expected_revision integer,p_title text,p_summary text,p_category text,p_tags text[],p_studio uuid,p_roles text[],p_kind text,p_file_name text default null,p_mime_type text default null,p_file_size bigint default null,p_text text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.knowledge_documents; vid uuid:=gen_random_uuid(); number integer; path text; ext text; allowed_mime text;
begin
 if p_document is null and not app_private.has_function(case when p_kind='article' then 'knowledge.article' else 'knowledge.upload' end) then raise insufficient_privilege using message='Content creation not granted'; end if;
 if not app_private.can_page('files') then raise insufficient_privilege using message='File contribution not granted'; end if;
 if p_title is null or length(trim(p_title)) not between 1 and 180 or p_summary is null or length(p_summary)>2000 or p_text is null or length(p_text)>100000 or p_category is null or p_category not in ('Studioalltag','Empfang & Service','Geräte & Sicherheit','Marketing','Einarbeitung','Vorlagen','Sonstiges') or p_kind is null or p_kind not in ('article','file') then raise check_violation using message='Invalid document metadata'; end if;
 if p_tags is null or cardinality(p_tags)>12 or exists(select 1 from unnest(p_tags) t where t is null or length(trim(t)) not between 1 and 40) or p_roles is null or cardinality(p_roles)=0 or exists(select 1 from unnest(p_roles) r where r is null or r not in ('admin','studio_manager','employee')) then raise check_violation using message='Invalid tags or reader roles'; end if;
 if p_document is null then
  if not app_private.knowledge_scope(p_studio) or (p_studio is null and not app_private.is_admin()) then raise insufficient_privilege using message='Document studio not granted'; end if;
  insert into public.knowledge_documents(title,summary,category,tags,studio_id,reader_roles,created_by) values(trim(p_title),p_summary,p_category,p_tags,p_studio,p_roles,auth.uid()) returning * into d;
 else
  select * into d from public.knowledge_documents where id=p_document for update;
  if not found or not app_private.knowledge_contribute(p_document) then raise insufficient_privilege using message='Document editing not granted'; end if;
  if d.revision is distinct from p_expected_revision then raise serialization_failure using message='Document revision changed'; end if;
  if d.studio_id is distinct from p_studio or d.reader_roles is distinct from p_roles then raise check_violation using message='Use access settings to change document scope'; end if;
  update public.knowledge_documents set revision=revision+1,updated_at=clock_timestamp() where id=d.id returning * into d;
 end if;
 if p_kind='article' then
  if length(trim(p_text))=0 then raise check_violation using message='Article text required'; end if;
 else
  if p_file_name is null or length(p_file_name) not between 1 and 180 or p_file_name~'[/\\]' or p_file_size is null or p_file_size not between 1 and 52428800 then raise check_violation using message='Invalid file name or size'; end if;
  ext:=lower(substring(p_file_name from '\.([^.]+)$'));
  allowed_mime:=case ext when 'pdf' then 'application/pdf' when 'txt' then 'text/plain' when 'md' then 'text/markdown' when 'csv' then 'text/csv' when 'png' then 'image/png' when 'jpg' then 'image/jpeg' when 'jpeg' then 'image/jpeg' when 'webp' then 'image/webp' when 'mp4' then 'video/mp4' when 'webm' then 'video/webm' when 'doc' then 'application/msword' when 'docx' then 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' when 'xls' then 'application/vnd.ms-excel' when 'xlsx' then 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' when 'ppt' then 'application/vnd.ms-powerpoint' when 'pptx' then 'application/vnd.openxmlformats-officedocument.presentationml.presentation' else null end;
  if allowed_mime is null or p_mime_type is distinct from allowed_mime then raise check_violation using message='Unsupported file type'; end if;
  if ext not in ('txt','md','csv') and p_text<>'' then raise check_violation using message='Only plain text extraction is supported'; end if;
  path:=d.id::text||'/'||vid::text||'/original.'||ext;
 end if;
 select coalesce(max(version),0)+1 into number from public.knowledge_versions where document_id=d.id;
 insert into public.knowledge_versions(id,document_id,version,kind,state,title,summary,category,tags,text_content,file_name,mime_type,file_size,object_path,created_by)
 values(vid,d.id,number,p_kind,case when p_kind='file' then 'uploading' else 'ready' end,trim(p_title),p_summary,p_category,p_tags,p_text,case when p_kind='file' then p_file_name end,case when p_kind='file' then p_mime_type end,case when p_kind='file' then p_file_size end,path,auth.uid());
 insert into public.knowledge_events(document_id,version_id,actor_id,event) values(d.id,vid,auth.uid(),'version_prepared');
 return jsonb_build_object('document_id',d.id,'version_id',vid,'object_path',path,'revision',d.revision);
end; $$;

create or replace function app_private.knowledge_object_access(path text, operation text)
returns boolean language sql stable security definer set search_path='' as $$
 select app_private.is_active() and exists(select 1 from public.knowledge_versions v join public.knowledge_documents d on d.id=v.document_id where v.object_path=path and case operation
 when 'read' then app_private.knowledge_version_read(v.id)
 when 'insert' then v.state='uploading' and v.created_by=auth.uid() and v.created_at>now()-interval '24 hours' and app_private.knowledge_contribute(d.id)
 when 'delete' then v.state='uploading' and v.published_at is null and (app_private.function_studio('knowledge.cleanup',d.studio_id) or (v.created_by=auth.uid() and app_private.knowledge_contribute(d.id)))
 else false end); $$;

create or replace function public.cancel_knowledge_upload(p_version uuid)
returns void language plpgsql security definer set search_path='' as $$ declare v public.knowledge_versions; d public.knowledge_documents; begin
 select * into v from public.knowledge_versions where id=p_version;
 select * into d from public.knowledge_documents where id=v.document_id for update;
 select * into v from public.knowledge_versions where id=p_version for update;
 if v.id is null or not (app_private.function_studio('knowledge.cleanup',d.studio_id) or (v.created_by=auth.uid() and app_private.knowledge_contribute(v.document_id))) then raise insufficient_privilege using message='Upload cancellation not granted'; end if;
 if v.state<>'uploading' or v.published_at is not null or exists(select 1 from storage.objects where bucket_id='team-knowledge' and name=v.object_path) then raise check_violation using message='Remove unfinished Storage object first; ready versions are preserved'; end if;
 insert into public.knowledge_events(document_id,actor_id,event) values(d.id,auth.uid(),'unfinished_upload_cancelled');
 delete from public.knowledge_events where version_id=v.id;
 delete from public.knowledge_versions where id=v.id;
 update public.knowledge_documents set revision=revision+1,updated_at=clock_timestamp() where id=d.id;
end; $$;

create or replace function public.publish_knowledge_version(p_document uuid,p_version uuid,p_expected_revision integer)
returns void language plpgsql security definer set search_path='' as $$ declare d public.knowledge_documents; v public.knowledge_versions; begin
 select * into d from public.knowledge_documents where id=p_document for update;
 if not found or not app_private.function_studio('knowledge.publish',d.studio_id) then raise insufficient_privilege using message='Document publication requires its studio manager'; end if;
 if d.archived or d.revision is distinct from p_expected_revision then raise serialization_failure using message='Document revision changed or archived'; end if;
 select * into v from public.knowledge_versions where id=p_version and document_id=d.id for update;
 if not found or v.state<>'ready' then raise check_violation using message='Ready document version required'; end if;
 update public.knowledge_versions set published_at=coalesce(published_at,clock_timestamp()),published_by=coalesce(published_by,auth.uid()) where id=v.id;
 update public.knowledge_documents set title=v.title,summary=v.summary,category=v.category,tags=v.tags,search_text=v.text_content||' '||array_to_string(v.tags,' '),published_version_id=v.id,revision=revision+1,updated_at=clock_timestamp() where id=d.id;
 insert into public.knowledge_events(document_id,version_id,actor_id,event) values(d.id,v.id,auth.uid(),'version_published');
end; $$;

create or replace function public.set_knowledge_access(p_document uuid,p_expected_revision integer,p_studio uuid,p_roles text[],p_archived boolean)
returns void language plpgsql security definer set search_path='' as $$ declare d public.knowledge_documents; begin
 select * into d from public.knowledge_documents where id=p_document for update;
 if not found or not app_private.knowledge_manager(d.studio_id) or not app_private.knowledge_manager(p_studio) then raise insufficient_privilege using message='Document access changes require studio management'; end if;
 if (d.studio_id is distinct from p_studio or d.reader_roles is distinct from p_roles) and not (app_private.function_studio('knowledge.access',d.studio_id) and app_private.function_studio('knowledge.access',p_studio)) then raise insufficient_privilege using message='Document access change not granted'; end if;
 if d.archived is distinct from p_archived and not app_private.function_studio('knowledge.archive',d.studio_id) then raise insufficient_privilege using message='Document archiving not granted'; end if;
 if d.revision is distinct from p_expected_revision then raise serialization_failure using message='Document revision changed'; end if;
 if p_archived is null or p_roles is null or cardinality(p_roles)=0 or exists(select 1 from unnest(p_roles) r where r is null or r not in ('admin','studio_manager','employee')) then raise check_violation using message='Invalid document access'; end if;
 update public.knowledge_documents set studio_id=p_studio,reader_roles=p_roles,archived=p_archived,revision=revision+1,updated_at=clock_timestamp() where id=d.id;
 insert into public.knowledge_events(document_id,actor_id,event) values(d.id,auth.uid(),'access_updated');
end; $$;

create or replace function public.restore_module_version(p_module_id uuid,p_version_id uuid,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb; saved jsonb;
begin
 if not app_private.design_right('restore') then raise insufficient_privilege using message='Module publication not granted'; end if;
 select schema into s from public.module_versions where id=p_version_id and module_id=p_module_id;
 if s is null then raise check_violation using message='Unknown module version'; end if;
 saved:=public.save_module_draft(p_module_id,s,p_expected_revision);
 return public.publish_module(p_module_id,(saved->>'revision')::integer);
end;
$$;

create or replace function public.save_module_record(p_module_id uuid,p_version_id uuid,p_studio_id uuid,p_values jsonb,p_record_id uuid default null,p_expected_revision integer default null,p_entity_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.custom_modules; live jsonb; s jsonb; f jsonb; val jsonb; r public.module_records; member_role text; key text;
begin
 if not app_private.has_function('modules.records') then raise insufficient_privilege using message='Module entry writing not granted'; end if;
 select * into m from public.custom_modules where id=p_module_id for share;
 if not found or not app_private.module_read(p_module_id,p_studio_id) or not app_private.module_entity_read(p_module_id,p_studio_id,p_entity_id) then raise insufficient_privilege using message='Module entry not accessible'; end if;
 select schema into live from public.module_versions where id=m.published_version_id;
 select role into member_role from public.profiles where id=auth.uid();
 if not app_private.is_admin() and not (live->'writerRoles' ? member_role) then raise insufficient_privilege using message='Module write permission required'; end if;
 select schema into s from public.module_versions where id=p_version_id and module_id=p_module_id;
 if s is null or jsonb_typeof(p_values) is distinct from 'object' then raise check_violation using message='Invalid record schema or values'; end if;
 if p_record_id is null then
   if p_version_id<>m.published_version_id then raise serialization_failure using message='Published version changed'; end if;
 else
   select * into r from public.module_records where id=p_record_id for update;
   if not found or r.module_id<>p_module_id or r.version_id<>p_version_id or r.studio_id<>p_studio_id or r.entity_id is distinct from p_entity_id or r.revision is distinct from p_expected_revision then raise serialization_failure using message='Record assignment or revision changed'; end if;
 end if;
 for key in select jsonb_object_keys(p_values) loop if not exists(select 1 from jsonb_array_elements(s->'fields') fld where fld->>'id'=key) then raise check_violation using message='Unknown record field'; end if; end loop;
 for f in select jsonb_array_elements(s->'fields') loop
   val:=p_values->(f->>'id');
   if val is null or val='null'::jsonb or val='""'::jsonb or (f->>'type'='checkbox' and val='false'::jsonb) then
     if (f->>'required')::boolean then raise check_violation using message='Required field missing'; end if; continue;
   end if;
   case f->>'type'
   when 'text','textarea' then if jsonb_typeof(val)<>'string' or length(val#>>'{}')>5000 then raise check_violation using message='Invalid text'; end if;
   when 'number' then if jsonb_typeof(val)<>'number' then raise check_violation using message='Invalid number'; end if;
   when 'checkbox' then if jsonb_typeof(val)<>'boolean' then raise check_violation using message='Invalid checkbox'; end if;
   when 'select' then if jsonb_typeof(val)<>'string' or not (f->'options' ? (val#>>'{}')) then raise check_violation using message='Invalid selection'; end if;
   when 'date' then if jsonb_typeof(val)<>'string' or (val#>>'{}')!~'^\d{4}-\d{2}-\d{2}$' then raise check_violation using message='Invalid date'; end if; perform (val#>>'{}')::date;
   when 'member' then if jsonb_typeof(val)<>'string' or not app_private.valid_assignee((val#>>'{}')::uuid,p_studio_id) then raise check_violation using message='Invalid member'; end if;
   when 'file' then raise feature_not_supported using message='Authenticated file storage is not configured';
   end case;
 end loop;
 if p_record_id is null then
   insert into public.module_records(module_id,version_id,studio_id,entity_id,data,created_by) values(p_module_id,p_version_id,p_studio_id,p_entity_id,p_values,auth.uid()) returning * into r;
 else update public.module_records set data=p_values,revision=revision+1,updated_at=clock_timestamp() where id=p_record_id returning * into r; end if;
 return jsonb_build_object('id',r.id,'revision',r.revision);
end;
$$;

create or replace function public.team_home_data(p_manage boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare capable boolean; begin
 if not app_private.can_page('dashboard') then raise insufficient_privilege using message='Homepage not granted'; end if;
 capable:=app_private.has_function('home.create') or app_private.has_function('home.edit') or app_private.has_function('home.publish') or app_private.has_function('home.archive');
 if p_manage and not capable then raise insufficient_privilege using message='Homepage editing not granted'; end if;
 return jsonb_build_object('can_manage',capable,'items',(select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('editable',app_private.home_manage(i.studio_id)) order by i.position,i.created_at,i.id),'[]') from public.team_home_items i where case when p_manage then app_private.home_manage(i.studio_id) and not i.archived else app_private.home_read(i.studio_id,i.reader_roles,i.published,i.archived) end));
end; $$;

create or replace function public.save_team_home_item(p_id uuid,p_revision integer,p_kind text,p_title text,p_body text,p_href text,p_phone text,p_studio uuid,p_roles text[],p_published boolean,p_position integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$ declare old public.team_home_items; result public.team_home_items; begin
 if not app_private.home_manage(p_studio) then raise insufficient_privilege using message='Homepage editing not granted for this studio'; end if;
 if p_id is null and not app_private.function_studio('home.create',p_studio) then raise insufficient_privilege using message='Homepage creation not granted'; end if;
 if p_id is not null and not app_private.function_studio('home.edit',p_studio) then raise insufficient_privilege using message='Homepage editing not granted'; end if;
 if p_published and not app_private.function_studio('home.publish',p_studio) then raise insufficient_privilege using message='Homepage publication not granted'; end if;
 if p_id is not null then
  select * into old from public.team_home_items where id=p_id for update;
  if not found or old.archived or not app_private.home_manage(old.studio_id) then raise insufficient_privilege using message='Homepage item not editable'; end if;
  if old.published and not app_private.function_studio('home.publish',old.studio_id) then raise insufficient_privilege using message='Published homepage changes require publication access'; end if;
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
 if not found or not app_private.function_studio('home.archive',old.studio_id) then raise insufficient_privilege using message='Homepage item not editable'; end if;
 if old.revision is distinct from p_revision then raise serialization_failure using message='Homepage item changed'; end if;
 update public.team_home_items set archived=true,published=false,revision=revision+1,updated_by=auth.uid(),updated_at=clock_timestamp() where id=p_id;
end; $$;

create or replace function public.send_team_chat(p_channel uuid,p_body text,p_nonce uuid)
returns integer language plpgsql security definer set search_path='' as $$ declare old public.team_chat_messages; mid integer; begin
 if not app_private.has_function('chat.send') then raise insufficient_privilege using message='Chat sending not granted'; end if;
 if not app_private.chat_visible(p_channel) or not exists(select 1 from public.team_chat_channels where id=p_channel and active) then raise insufficient_privilege using message='Channel not granted or inactive'; end if;
 if p_body is null or length(trim(p_body)) not between 1 and 4000 or p_nonce is null then raise check_violation using message='Invalid message'; end if;
 perform pg_advisory_xact_lock(hashtextextended('chat:'||auth.uid()::text,0));
 select * into old from public.team_chat_messages where sender_id=auth.uid() and nonce=p_nonce;
 if found then
  if old.channel_id<>p_channel or old.body<>trim(p_body) then raise check_violation using message='Message retry changed'; end if;
  return old.id;
 end if;
 if exists(select 1 from public.team_chat_messages where sender_id=auth.uid() and created_at>clock_timestamp()-interval '1 second') then raise check_violation using message='Wait one second before sending again'; end if;
 -- Serialize allocation through commit within a channel, so read cursors cannot
 -- skip a lower identity that commits after a later message from another sender.
 perform pg_advisory_xact_lock(hashtextextended('chat-channel:'||p_channel::text,0));
 insert into public.team_chat_messages(channel_id,sender_id,body,nonce,created_at) values(p_channel,auth.uid(),trim(p_body),p_nonce,clock_timestamp()) returning id into mid;
 return mid;
end; $$;

create or replace function public.admin_chat_channel(p_channel uuid,p_title text,p_studios uuid[],p_active boolean,p_revision integer default null)
returns uuid language plpgsql security definer set search_path='' as $$ declare c public.team_chat_channels; normalized uuid[]; begin
 if not (app_private.has_function('chat.channels') and app_private.can_page('chat')) then raise insufficient_privilege using message='Administrator required'; end if;
 if p_title is null or length(trim(p_title)) not between 1 and 100 or p_active is null or p_studios is null or exists(select 1 from unnest(p_studios) s where s is null or not exists(select 1 from public.studios where id=s)) then raise check_violation using message='Invalid channel'; end if;
 select array_agg(s order by s) into normalized from(select distinct unnest(p_studios) s)x;
 normalized:=coalesce(normalized,'{}');
 if not app_private.is_admin() and (cardinality(normalized)=0 or exists(select 1 from unnest(normalized) site where not app_private.has_studio(site))) then raise insufficient_privilege using message='Only assigned studios may be managed'; end if;
 if p_channel is null then
  if cardinality(normalized) not between 2 and 7 then raise check_violation using message='Select at least two studios'; end if;
  insert into public.team_chat_channels(slug,title,kind,studio_ids,active,created_by) values('cross-'||gen_random_uuid()::text,trim(p_title),'cross',normalized,p_active,auth.uid()) returning * into c;
 else
  select * into c from public.team_chat_channels where id=p_channel for update;
  if not found or c.revision is distinct from p_revision then raise serialization_failure using message='Channel changed'; end if;
  if not app_private.is_admin() and (c.kind='all' or exists(select 1 from unnest(c.studio_ids) site where not app_private.has_studio(site))) then raise insufficient_privilege using message='Channel scope not granted'; end if;
  if c.kind<>'cross' and c.studio_ids is distinct from normalized then raise check_violation using message='System channel membership is fixed'; end if;
  if c.kind='cross' and cardinality(normalized) not between 2 and 7 then raise check_violation using message='Select at least two studios'; end if;
  update public.team_chat_channels set title=trim(p_title),studio_ids=normalized,active=p_active,revision=revision+1 where id=c.id;
 end if;
 return c.id;
end; $$;

create or replace function public.submit_team_feedback(p_request uuid,p_studio uuid,p_category text,p_title text,p_body text,p_anonymous boolean)
returns jsonb language plpgsql security definer set search_path='' as $$ declare f public.team_feedback; handler uuid; begin
 if not app_private.has_function('feedback.submit') then raise insufficient_privilege using message='Feedback submission not granted'; end if;
 if not app_private.can_page('feedback') or not app_private.has_studio(p_studio) then raise insufficient_privilege using message='Feedback or studio not granted'; end if;
 if p_request is null or p_category is null or p_category not in ('organisation','geraete','technik','marketing','idee','sonstiges') or p_title is null or length(trim(p_title)) not between 1 and 180 or p_body is null or length(trim(p_body)) not between 1 and 4000 or p_anonymous is null then raise check_violation using message='Invalid feedback'; end if;
 perform pg_advisory_xact_lock(hashtextextended('feedback:'||p_request::text,0));
 select * into f from public.team_feedback where id=p_request;
 if found then
  if f.studio_id<>p_studio or f.category<>p_category or f.title<>trim(p_title) or f.body<>trim(p_body) or f.anonymous<>p_anonymous or (not f.anonymous and f.author_id<>auth.uid()) then raise check_violation using message='Feedback retry changed'; end if;
 else
  select r.assignee_id into handler from public.team_feedback_routes r where r.category=p_category and (r.studio_id=p_studio or r.studio_id is null) and app_private.valid_feedback_handler(r.assignee_id,p_studio) order by (r.studio_id is not null) desc limit 1;
  insert into public.team_feedback(id,reference,studio_id,category,title,body,anonymous,author_id,assignee_id,created_at,updated_at)
  values(p_request,'FG-'||replace(p_request::text,'-',''),p_studio,p_category,trim(p_title),trim(p_body),p_anonymous,case when p_anonymous then null else auth.uid() end,handler,clock_timestamp(),clock_timestamp()) returning * into f;
 end if;
 return jsonb_build_object('id',f.id,'reference',f.reference,'anonymous',f.anonymous,'status',f.status,'routed',f.assignee_id is not null);
end; $$;

create or replace function public.update_team_feedback(p_feedback uuid,p_status text,p_reply text,p_assignee uuid,p_revision integer)
returns void language plpgsql security definer set search_path='' as $$ declare f public.team_feedback; begin
 select * into f from public.team_feedback where id=p_feedback for update;
 if not found or not app_private.feedback_manage(p_feedback) then raise insufficient_privilege using message='Feedback management not granted'; end if;
 if f.revision is distinct from p_revision then raise serialization_failure using message='Feedback changed'; end if;
 if p_status is null or p_status not in ('open','in_progress','done') or p_reply is null or length(p_reply)>3000 then raise check_violation using message='Invalid feedback update'; end if;
 if p_assignee is distinct from f.assignee_id and not app_private.function_studio('feedback.reassign',f.studio_id) then raise insufficient_privilege using message='Only admin can reassign feedback'; end if;
 if p_assignee is not null and not app_private.valid_feedback_handler(p_assignee,f.studio_id) then raise check_violation using message='Invalid feedback assignee'; end if;
 update public.team_feedback set status=p_status,reply=p_reply,assignee_id=p_assignee,revision=revision+1,updated_at=clock_timestamp() where id=f.id;
 insert into public.team_feedback_events(feedback_id,actor_id,status,reply,at) values(f.id,auth.uid(),p_status,p_reply,clock_timestamp());
end; $$;

create or replace function public.admin_feedback_routes()
returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not (app_private.has_function('feedback.routes') and app_private.can_page('feedback')) then raise insufficient_privilege using message='Administrator required'; end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from public.team_feedback_routes r where app_private.is_admin() or app_private.has_studio(r.studio_id)),'[]');
end; $$;

create or replace function public.admin_feedback_route(p_studio uuid,p_category text,p_assignee uuid,p_revision integer default null)
returns void language plpgsql security definer set search_path='' as $$ declare r public.team_feedback_routes; begin
 if not app_private.function_studio('feedback.routes',p_studio) then raise insufficient_privilege using message='Administrator required'; end if;
 if p_category is null or p_category not in ('organisation','geraete','technik','marketing','idee','sonstiges') or (p_studio is not null and not exists(select 1 from public.studios where id=p_studio)) then raise check_violation using message='Invalid feedback route'; end if;
 perform pg_advisory_xact_lock(hashtextextended('feedback-route:'||coalesce(p_studio::text,'global')||p_category,0));
 select * into r from public.team_feedback_routes where studio_id is not distinct from p_studio and category=p_category;
 if r.revision is distinct from p_revision then raise serialization_failure using message='Feedback route changed'; end if;
 if p_assignee is null then delete from public.team_feedback_routes where id=r.id; return; end if;
 if p_studio is null then
  if not exists(select 1 from public.profiles where id=p_assignee and active and role='admin') then raise check_violation using message='Global feedback route requires admin'; end if;
 elsif not app_private.valid_feedback_handler(p_assignee,p_studio) then raise check_violation using message='Invalid feedback assignee'; end if;
 insert into public.team_feedback_routes(studio_id,category,assignee_id) values(p_studio,p_category,p_assignee)
 on conflict(studio_id,category) do update set assignee_id=excluded.assignee_id,revision=team_feedback_routes.revision+1;
end; $$;

create or replace function public.admin_team_directory(p_page integer default 0,p_size integer default 50,p_query text default '',p_role text default '',p_status text default 'all',p_studio uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
 if not (app_private.has_function('users.view') and app_private.can_page('access')) then raise insufficient_privilege using message='Administrator required'; end if;
 if p_page is null or p_page not between 0 and 10000 or p_size is null or p_size not between 1 and 100 or p_query is null or length(p_query)>200 or p_role is null or p_role not in ('','admin','studio_manager','employee') or p_status is null or p_status not in ('all','active','inactive') then raise check_violation using message='Invalid directory filters'; end if;
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

create or replace function public.admin_team_member_detail(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare member jsonb; begin
 if not app_private.member_visible(p_user) then raise insufficient_privilege using message='Administrator required'; end if;
 select to_jsonb(p)||jsonb_build_object('email',u.email,'last_sign_in_at',u.last_sign_in_at,'invited_at',u.invited_at) into member from public.profiles p join auth.users u on u.id=p.id where p.id=p_user;
 if member is null then raise check_violation using message='Unknown team member'; end if;
 return jsonb_build_object('member',member,
  'tasks',(select jsonb_build_object('total',count(*),'done',count(*) filter(where t.status='done'),'open',count(*) filter(where t.status<>'done'),'overdue',count(*) filter(where t.status<>'done' and t.due_date<(now() at time zone 'Europe/Berlin')::date)) from public.tasks t where t.assignee_id=p_user and app_private.has_studio(t.studio_id)),
  'courses',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'title',c.title,'lesson_count',c.lesson_count,'lessons_read',coalesce(p.lessons_read,0),'quiz_passed',coalesce(p.quiz_passed,false),'practice_required',a.requires_practice,'practice_confirmed',coalesce(p.practice_confirmed,false),'due_date',a.due_date) order by c.title),'[]') from public.learning_assignments a join public.learning_courses c on c.id=a.course_id left join public.learning_progress p on p.assignment_id=a.id where a.learner_id=p_user and app_private.has_studio(a.studio_id)),
  'design_rights',(select jsonb_build_object('create',coalesce(g.can_create,false),'edit',coalesce(g.can_edit,false),'publish',coalesce(g.can_publish,false)) from (select 1) x left join public.module_permissions g on g.user_id=p_user)
 );
end; $$;

create or replace function public.admin_member_info(p_user uuid,p_job_title text default null,p_phone text default null,p_started_on date default null,p_revision integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$ declare info public.team_member_info; begin
 if not (app_private.member_visible(p_user) and (p_job_title is null or app_private.has_function('users.profile'))) then raise insufficient_privilege using message='Administrator required'; end if;
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

create or replace function public.admin_set_team_access(p_user uuid,p_full_name text,p_role text,p_studio_ids uuid[],p_active boolean,p_expected_updated_at timestamptz)
returns void language plpgsql security definer set search_path='' as $$ declare previous public.profiles; begin
 -- Serialize administrative access changes, then re-check the acting account.
 perform pg_advisory_xact_lock(732014,1);
 if not (app_private.is_admin() or (app_private.has_function('users.access') and app_private.member_editable(p_user) and app_private.can_page('access'))) then raise insufficient_privilege using message='Administrator required'; end if;
 perform app_private.assert_team_access(p_full_name,p_role,p_studio_ids,p_active);
 select * into previous from public.profiles where id=p_user for update;
 if not found or previous.access_updated_at is distinct from p_expected_updated_at then raise serialization_failure using message='Employee access changed; reload before saving'; end if;
 if not app_private.is_admin() and (p_user=auth.uid() or previous.role='admin' or p_role<>previous.role or exists(select 1 from unnest(p_studio_ids) site where not app_private.has_studio(site))) then raise insufficient_privilege using message='Role changes and administrative accounts require administrator'; end if;
 if p_user=auth.uid() and (p_role<>'admin' or not p_active) then raise check_violation using message='Cannot remove your own administrator access'; end if;
 if previous.active and previous.role='admin' and (not p_active or p_role<>'admin') and (select count(*) from public.profiles where active and role='admin')<=1 then raise check_violation using message='At least one active administrator required'; end if;
 update public.profiles set full_name=trim(p_full_name),role=p_role,active=p_active,access_updated_at=clock_timestamp() where id=p_user;
 delete from public.studio_memberships where user_id=p_user;
 insert into public.studio_memberships(user_id,studio_id) select p_user,s from unnest(p_studio_ids) s;
 insert into public.team_access_events(actor_id,target_id,event,details) values(auth.uid(),p_user,'access_updated',jsonb_build_object('role',p_role,'active',p_active,'studio_ids',p_studio_ids));
end; $$;

create or replace function public.admin_prepare_team_invitation(p_email text,p_full_name text,p_role text,p_studio_ids uuid[])
returns uuid language plpgsql security definer set search_path='' as $$ declare invitation uuid; normalized text:=lower(trim(p_email)); begin
 if not (app_private.has_function('users.invite') and app_private.can_page('access')) then raise insufficient_privilege using message='Administrator required'; end if;
 if not app_private.is_admin() and (p_role<>'employee' or cardinality(p_studio_ids)=0 or exists(select 1 from unnest(p_studio_ids) site where not app_private.has_studio(site))) then raise insufficient_privilege using message='Only employee invitations in assigned studios are allowed'; end if;
 perform app_private.assert_team_access(p_full_name,p_role,p_studio_ids,true);
 if normalized is null or length(normalized)>254 or normalized!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise check_violation using message='Invalid employee email'; end if;
 if exists(select 1 from auth.users where lower(email)=normalized) then raise unique_violation using message='Account already exists; use the directory to send a login link'; end if;
 insert into app_private.team_invitations(email,full_name,role,studio_ids,created_by) values(normalized,trim(p_full_name),p_role,p_studio_ids,auth.uid())
 on conflict(email) do update set id=gen_random_uuid(),full_name=excluded.full_name,role=excluded.role,studio_ids=excluded.studio_ids,created_by=excluded.created_by,created_at=clock_timestamp(),expires_at=clock_timestamp()+interval '1 hour',provisioned_user_id=null
 returning id into invitation;
 insert into public.team_access_events(actor_id,event,details) values(auth.uid(),'invitation_prepared',jsonb_build_object('invitation_id',invitation));
 return invitation;
end; $$;

create or replace function app_private.provision_invited_employee()
returns trigger language plpgsql security definer set search_path='' as $$ declare invitation app_private.team_invitations; begin
 select * into invitation from app_private.team_invitations i where i.email=lower(new.email) and i.id::text=new.raw_user_meta_data->>'team_invitation_id' and i.expires_at>clock_timestamp() and i.provisioned_user_id is null for update;
 if not found then return new; end if;
 -- The request may have been staged earlier; its creator must still be admin.
 if not (app_private.function_allowed(invitation.created_by,'users.invite') and exists(select 1 from public.profiles actor where actor.id=invitation.created_by and active and (actor.role='admin' or (invitation.role='employee' and 'access'=any(coalesce((select pages from public.team_page_access where user_id=actor.id),app_private.default_team_pages(actor.role))) and not exists(select 1 from unnest(invitation.studio_ids) site where not exists(select 1 from public.studio_memberships m where m.user_id=actor.id and m.studio_id=site)))))) then raise insufficient_privilege using message='Invitation creator is no longer an administrator'; end if;
 perform app_private.assert_team_access(invitation.full_name,invitation.role,invitation.studio_ids,true);
 insert into public.profiles(id,full_name,role,active) values(new.id,invitation.full_name,invitation.role,true);
 insert into public.studio_memberships(user_id,studio_id) select new.id,s from unnest(invitation.studio_ids) s;
 update app_private.team_invitations set provisioned_user_id=new.id where id=invitation.id;
 insert into public.team_access_events(actor_id,target_id,event) values(invitation.created_by,new.id,'account_provisioned');
 return new;
end; $$;

create or replace function public.admin_team_login_target(p_user uuid)
returns text language plpgsql security definer set search_path='' as $$ declare address text; begin
 if not (app_private.has_function('users.login') and app_private.member_visible(p_user) and app_private.can_page('access')) then raise insufficient_privilege using message='Administrator required'; end if;
 select u.email into address from public.profiles p join auth.users u on u.id=p.id where p.id=p_user and p.active and (p.role='admin' or exists(select 1 from public.studio_memberships where user_id=p.id));
 if address is null then raise check_violation using message='Active provisioned employee required'; end if;
 insert into app_private.team_mail_limits(user_id,requested_at) values(p_user,clock_timestamp())
 on conflict(user_id) do update set requested_at=excluded.requested_at where app_private.team_mail_limits.requested_at<clock_timestamp()-interval '60 seconds';
 if not found then raise check_violation using message='Wait 60 seconds before requesting another email'; end if;
 insert into public.team_access_events(actor_id,target_id,event) values(auth.uid(),p_user,'login_link_requested');
 return address;
end; $$;

drop policy if exists member_info_read on public.team_member_info; create policy member_info_read on public.team_member_info for select to authenticated using(app_private.is_active() and (user_id=auth.uid() or app_private.member_visible(user_id)));

create or replace function public.admin_controlling()
returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not (app_private.has_function('controlling.view') and app_private.can_page('controlling')) then raise insufficient_privilege using message='Controlling requires an administrator'; end if;
 return jsonb_build_object('profiles',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from public.profiles p where app_private.is_admin() or exists(select 1 from public.studio_memberships m where m.user_id=p.id and app_private.has_studio(m.studio_id))),'studios',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from public.studios s where app_private.has_studio(s.id)),'tasks',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.tasks t where app_private.has_studio(t.studio_id)),'courses',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from public.learning_courses c),'assignments',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.learning_assignments a where app_private.has_studio(a.studio_id)),'progress',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from public.learning_progress p where exists(select 1 from public.learning_assignments a where a.id=p.assignment_id and app_private.has_studio(a.studio_id))));
 end; $$;

revoke all on function public.admin_function_access(uuid,text[],integer) from public,anon;
grant execute on function public.admin_function_access(uuid,text[],integer) to authenticated;
revoke all on function app_private.function_catalog(),app_private.function_grants(uuid),app_private.function_effective(uuid),app_private.function_allowed(uuid,text),app_private.has_function(text),app_private.function_studio(text,uuid),app_private.member_visible(uuid),app_private.member_editable(uuid) from public,anon,authenticated;
grant execute on function app_private.has_function(text),app_private.function_studio(text,uuid),app_private.member_visible(uuid),app_private.member_editable(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
