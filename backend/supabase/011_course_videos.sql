-- Nach Erweiterungen 001–010 vollständig in einer neuen SQL-Abfrage ausführen.
-- Private Kursvideos, fortsetzbare Uploads und unveränderliche Kurszuordnungen.
begin;
do $prerequisite$ begin
 if to_regclass('public.calendar_events') is null or to_regclass('public.maintenance_plans') is null then raise exception 'Bitte zuerst Erweiterung 010_calendar_tasks_notifications.sql vollstaendig ausfuehren.';end if;
end $prerequisite$;
create or replace function app_private.function_catalog() returns table(key text,label text,page text,roles text[],requires text[]) language sql immutable set search_path='' as $$ select key,label,page,roles,requires from jsonb_to_recordset('[{"group": "Aufgaben", "key": "tasks.team", "label": "Teamaufgaben ansehen", "page": "tasks", "roles": ["studio_manager"], "requires": []}, {"group": "Aufgaben", "key": "tasks.create", "label": "Aufgaben erstellen", "page": "tasks", "roles": ["studio_manager"], "requires": []}, {"group": "Aufgaben", "key": "tasks.edit", "label": "Aufgabentext, Frist und Priorität bearbeiten", "page": "tasks", "roles": ["studio_manager"], "requires": []}, {"group": "Aufgaben", "key": "tasks.assign", "label": "Aufgaben anderen Mitarbeitern zuweisen", "page": "tasks", "roles": ["studio_manager"], "requires": ["tasks.team"]}, {"group": "Aufgaben", "key": "tasks.status", "label": "Status eigener Aufgaben ändern", "page": "tasks", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Aufgaben", "key": "tasks.team_status", "label": "Status von Teamaufgaben ändern", "page": "tasks", "roles": ["studio_manager"], "requires": ["tasks.team"]}, {"group": "Aufgaben", "key": "tasks.comment", "label": "Aufgaben kommentieren", "page": "tasks", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Lernhub", "key": "learning.read", "label": "Eigene Lektionen lesen und bestätigen", "page": "learning", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Lernhub", "key": "learning.quiz", "label": "Eigene Quizfragen beantworten", "page": "learning", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Lernhub", "key": "learning.courses", "label": "Kurse erstellen", "page": "learning", "roles": [], "requires": []}, {"group": "Lernhub", "key": "learning.assign", "label": "Kurse zuweisen", "page": "learning", "roles": [], "requires": []}, {"group": "Lernhub", "key": "learning.practice", "label": "Praxiseinweisungen bestätigen", "page": "learning", "roles": [], "requires": []}, {"group": "Lernhub", "key": "learning.assess", "label": "Externe Wissensprüfungen dokumentieren", "page": "learning", "roles": [], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.read", "label": "Freigegebene Inhalte und Originaldateien öffnen", "page": "knowledge", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.article", "label": "Wissensartikel anlegen", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.upload", "label": "Dateien hochladen", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.edit", "label": "Eigene Inhalte bearbeiten", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.team", "label": "Inhalte anderer Mitarbeiter bearbeiten", "page": "files", "roles": ["studio_manager"], "requires": ["knowledge.edit"]}, {"group": "Dateien & Wissen", "key": "knowledge.publish", "label": "Inhalte veröffentlichen", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.access", "label": "Leserrollen und Standortfreigaben ändern", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.archive", "label": "Inhalte archivieren", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.cleanup", "label": "Unvollständige Uploads anderer Mitarbeiter bereinigen", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Modulbaukasten", "key": "modules.create", "label": "Neue Module erstellen", "page": "builder", "roles": [], "requires": ["modules.edit"]}, {"group": "Modulbaukasten", "key": "modules.edit", "label": "Modulaufbau bearbeiten", "page": "builder", "roles": [], "requires": []}, {"group": "Modulbaukasten", "key": "modules.publish", "label": "Modulversionen veröffentlichen", "page": "builder", "roles": [], "requires": ["modules.edit"]}, {"group": "Modulbaukasten", "key": "modules.restore", "label": "Frühere Modulversion wiederherstellen", "page": "builder", "roles": [], "requires": ["modules.publish"]}, {"group": "Modulbaukasten", "key": "modules.records", "label": "Freigegebene Moduleinträge speichern", "page": "modules", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Startseite", "key": "home.create", "label": "Startseiteneinträge anlegen", "page": "dashboard", "roles": [], "requires": []}, {"group": "Startseite", "key": "home.edit", "label": "Startseiteneinträge bearbeiten", "page": "dashboard", "roles": [], "requires": []}, {"group": "Startseite", "key": "home.publish", "label": "Startseiteneinträge veröffentlichen", "page": "dashboard", "roles": [], "requires": []}, {"group": "Startseite", "key": "home.archive", "label": "Startseiteneinträge ausblenden", "page": "dashboard", "roles": [], "requires": []}, {"group": "Chat", "key": "chat.send", "label": "Nachrichten senden", "page": "chat", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Chat", "key": "chat.channels", "label": "Studioübergreifende Chatkanäle verwalten", "page": "chat", "roles": [], "requires": []}, {"group": "Feedback", "key": "feedback.submit", "label": "Eigenes Feedback abgeben und verfolgen", "page": "feedback", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Feedback", "key": "feedback.manage", "label": "Feedback des eigenen Studios bearbeiten", "page": "feedback", "roles": [], "requires": []}, {"group": "Feedback", "key": "feedback.reassign", "label": "Zuständigkeit einer Meldung ändern", "page": "feedback", "roles": [], "requires": ["feedback.manage"]}, {"group": "Feedback", "key": "feedback.routes", "label": "Feedback-Zuständigkeiten festlegen", "page": "feedback", "roles": [], "requires": []}, {"group": "Nutzerverwaltung", "key": "users.view", "label": "Mitarbeiterprofile ansehen", "page": "access", "roles": [], "requires": []}, {"group": "Nutzerverwaltung", "key": "users.invite", "label": "Einzelne Mitarbeiter einladen", "page": "access", "roles": [], "requires": ["users.view"]}, {"group": "Nutzerverwaltung", "key": "users.import", "label": "Mitarbeiter per CSV oder Excel importieren", "page": "access", "roles": [], "requires": ["users.invite"]}, {"group": "Nutzerverwaltung", "key": "users.profile", "label": "Berufliche Profilinformationen bearbeiten", "page": "access", "roles": [], "requires": ["users.view"]}, {"group": "Nutzerverwaltung", "key": "users.access", "label": "Zugänge sperren und Studiozuordnungen verwalten", "page": "access", "roles": [], "requires": ["users.view"]}, {"group": "Nutzerverwaltung", "key": "users.login", "label": "Anmeldelinks anfordern", "page": "access", "roles": [], "requires": ["users.view"]}, {"group": "Controlling", "key": "controlling.view", "label": "Controlling für eigene Studios ansehen", "page": "controlling", "roles": [], "requires": []}, {"group": "Controlling", "key": "controlling.export", "label": "Controlling als CSV exportieren", "page": "controlling", "roles": [], "requires": ["controlling.view"]}, {"group": "Aufgaben", "key": "tasks.private", "label": "Private Aufgaben für mich erstellen und bearbeiten", "page": "tasks", "roles": ["employee", "studio_manager"], "requires": [], "since": 10}, {"group": "Aufgaben", "key": "tasks.repeat", "label": "Wiederkehrende Aufgaben anlegen", "page": "tasks", "roles": ["employee", "studio_manager"], "requires": [], "since": 10}, {"group": "Kalender", "key": "calendar.create", "label": "Eigene Termine anlegen und bearbeiten", "page": "calendar", "roles": ["employee", "studio_manager"], "requires": [], "since": 10}, {"group": "Kalender", "key": "calendar.team", "label": "Termine für das Studio anlegen und bearbeiten", "page": "calendar", "roles": ["studio_manager"], "requires": ["calendar.create"], "since": 10}, {"group": "Gerätewartung", "key": "maintenance.manage", "label": "Gerätewartungen planen und bearbeiten", "page": "calendar", "roles": ["studio_manager"], "requires": ["tasks.create", "tasks.assign", "tasks.repeat"], "since": 10}, {"group": "Lernhub", "key": "learning.videos", "label": "Kursvideos aufnehmen, hochladen und zuordnen", "page": "learning", "roles": [], "requires": ["learning.courses"], "since": 11}]'::jsonb) as c(key text,label text,page text,roles text[],requires text[]); $$;
create or replace function public.team_access_context()
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare p public.profiles; a public.team_page_access; begin
 select * into p from public.profiles where id=auth.uid() and active;
 if not found then raise insufficient_privilege using message='Active employee required'; end if;
 select * into a from public.team_page_access where user_id=p.id;
 return jsonb_build_object('version',11,'pages',case when p.role='admin' then app_private.default_team_pages('admin') else coalesce(a.pages,app_private.default_team_pages(p.role)) end,'can_design',app_private.design_right('edit'),'capabilities',app_private.function_effective(p.id));
end; $$;
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
 return jsonb_build_object('version',11,'grants',app_private.function_grants(p_user),'effective',app_private.function_effective(p_user),'role_defaults',(select coalesce(array_agg(c.key),'{}') from app_private.function_catalog() c where member.role='admin' or member.role=any(c.roles)),'revision',previous.revision,'role',member.role);
end; $$;

create table if not exists public.learning_videos(
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 1 and 180),
 studio_id uuid references public.studios(id),created_by uuid not null references public.profiles(id),
 file_name text not null check(length(file_name) between 1 and 180),
 mime_type text not null check(mime_type in ('video/mp4','video/webm','video/quicktime')),
 file_size bigint not null check(file_size between 1 and 52428800),
 object_path text not null unique,
 state text not null default 'uploading' check(state in ('uploading','ready','deleting')),
 created_at timestamptz not null default now(),ready_at timestamptz
);
create index if not exists learning_videos_owner on public.learning_videos(created_by,created_at desc);
create table if not exists public.learning_course_videos(
 course_id uuid not null references public.learning_courses(id),lesson_index integer not null check(lesson_index between 0 and 49),
 video_id uuid not null references public.learning_videos(id),primary key(course_id,lesson_index)
);
alter table public.learning_material add column if not exists pass_percent integer not null default 80 check(pass_percent between 1 and 100);
alter table public.learning_attempts add column if not exists pass_percent integer not null default 80 check(pass_percent between 1 and 100);
create index if not exists learning_video_courses on public.learning_course_videos(video_id);
alter table public.learning_videos enable row level security;
alter table public.learning_course_videos enable row level security;

create or replace function app_private.video_scope(site uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('learning') and (site is null or app_private.has_studio(site)); $$;
create or replace function app_private.video_manage(v public.learning_videos)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('learning') and app_private.has_function('learning.videos') and app_private.video_scope(v.studio_id) and (app_private.is_admin() or v.created_by=auth.uid()); $$;
create or replace function app_private.video_course_read(cid uuid,site uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select app_private.video_scope(site) and (
 app_private.is_admin() or
 (app_private.has_function('learning.courses') and exists(select 1 from public.learning_courses where id=cid and created_by=auth.uid())) or
 app_private.has_function('learning.assign') or app_private.has_function('learning.practice') or app_private.has_function('learning.assess') or
 exists(select 1 from public.learning_assignments a where a.course_id=cid and (site is null or a.studio_id=site) and app_private.learning_read(a.id)));
$$;
create or replace function app_private.video_read(v public.learning_videos)
returns boolean language sql stable security definer set search_path='' as $$
 select v.state='ready' and (app_private.video_manage(v) or exists(select 1 from public.learning_course_videos l where l.video_id=v.id and app_private.video_course_read(l.course_id,v.studio_id)));
$$;
drop policy if exists learning_videos_read on public.learning_videos;
create policy learning_videos_read on public.learning_videos for select to authenticated using(app_private.video_manage(learning_videos) or app_private.video_read(learning_videos));
drop policy if exists learning_course_videos_read on public.learning_course_videos;
create policy learning_course_videos_read on public.learning_course_videos for select to authenticated using(exists(select 1 from public.learning_videos v where v.id=video_id and app_private.video_course_read(course_id,v.studio_id)));
revoke all on public.learning_videos,public.learning_course_videos from public,anon,authenticated;
grant select on public.learning_videos,public.learning_course_videos to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('course-videos','course-videos',false,52428800,array['video/mp4','video/webm','video/quicktime'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create or replace function app_private.video_object_access(path text,action text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.learning_videos v where v.object_path=path and case action
 when 'read' then app_private.video_read(v) or app_private.video_manage(v)
 when 'insert' then v.state='uploading' and v.created_at>now()-interval '7 days' and app_private.video_manage(v)
 when 'delete' then v.state='deleting' and app_private.video_manage(v)
 else false end);
$$;
drop policy if exists course_video_storage_read on storage.objects;
create policy course_video_storage_read on storage.objects for select to authenticated using(bucket_id='course-videos' and app_private.video_object_access(name,'read'));
drop policy if exists course_video_storage_insert on storage.objects;
create policy course_video_storage_insert on storage.objects for insert to authenticated with check(bucket_id='course-videos' and app_private.video_object_access(name,'insert'));
drop policy if exists course_video_storage_delete on storage.objects;
create policy course_video_storage_delete on storage.objects for delete to authenticated using(bucket_id='course-videos' and app_private.video_object_access(name,'delete'));
drop policy if exists course_video_anon_guard on storage.objects;
create policy course_video_anon_guard on storage.objects as restrictive for all to anon using(bucket_id<>'course-videos') with check(bucket_id<>'course-videos');
drop policy if exists course_video_read_guard on storage.objects;
create policy course_video_read_guard on storage.objects as restrictive for select to authenticated using(bucket_id<>'course-videos' or app_private.video_object_access(name,'read'));
drop policy if exists course_video_insert_guard on storage.objects;
create policy course_video_insert_guard on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'course-videos' or app_private.video_object_access(name,'insert'));
drop policy if exists course_video_delete_guard on storage.objects;
create policy course_video_delete_guard on storage.objects as restrictive for delete to authenticated using(bucket_id<>'course-videos' or app_private.video_object_access(name,'delete'));
drop policy if exists course_video_update_guard on storage.objects;
create policy course_video_update_guard on storage.objects as restrictive for update to authenticated using(bucket_id<>'course-videos') with check(bucket_id<>'course-videos');

create or replace function public.prepare_learning_video(p_title text,p_studio uuid,p_file_name text,p_mime_type text,p_file_size bigint,p_nonce uuid)
returns jsonb language plpgsql security definer set search_path='' as $$ declare v public.learning_videos;ext text;path text;begin
 if not (app_private.can_page('learning') and app_private.has_function('learning.videos') and app_private.video_scope(p_studio)) or (p_studio is null and not app_private.is_admin()) then raise insufficient_privilege using message='Video upload not granted';end if;
 if p_title is null or length(trim(p_title)) not between 1 and 180 or p_file_name is null or length(p_file_name) not between 1 and 180 or p_file_size is null or p_file_size not between 1 and 52428800 or p_nonce is null then raise check_violation using message='Invalid video metadata';end if;
 ext:=lower(substring(p_file_name from '\.([a-zA-Z0-9]+)$'));
 if p_mime_type is null or p_mime_type is distinct from (case ext when 'mp4' then 'video/mp4' when 'webm' then 'video/webm' when 'mov' then 'video/quicktime' end) then raise check_violation using message='Unsupported video format';end if;
 perform pg_advisory_xact_lock(hashtextextended('video:'||p_nonce::text,0));
 select * into v from public.learning_videos where id=p_nonce;
 if found then
  if v.created_by<>auth.uid() or row(v.title,v.studio_id,v.file_name,v.mime_type,v.file_size) is distinct from row(trim(p_title),p_studio,p_file_name,p_mime_type,p_file_size) or v.state='deleting' then raise check_violation using message='Video retry changed';end if;
  return to_jsonb(v);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('video-owner:'||auth.uid()::text,0));
 if (select count(*) from public.learning_videos where created_by=auth.uid() and state='uploading')>=10 then raise check_violation using message='Remove unfinished video uploads first';end if;
 path:=auth.uid()::text||'/'||p_nonce::text||'/original.'||ext;
 insert into public.learning_videos(id,title,studio_id,created_by,file_name,mime_type,file_size,object_path) values(p_nonce,trim(p_title),p_studio,auth.uid(),p_file_name,p_mime_type,p_file_size,path) returning * into v;
 return to_jsonb(v);
end; $$;
create or replace function public.finish_learning_video(p_video uuid)
returns void language plpgsql security definer set search_path='' as $$ declare v public.learning_videos;meta jsonb;begin
 select * into v from public.learning_videos where id=p_video for update;
 if v.id is null or not app_private.video_manage(v) then raise insufficient_privilege using message='Video upload not granted';end if;
 if v.state='ready' then return;end if;
 if v.state<>'uploading' then raise check_violation using message='Video is being deleted';end if;
 select metadata into meta from storage.objects where bucket_id='course-videos' and name=v.object_path;
 if meta is null or (meta->>'size')::bigint is distinct from v.file_size or meta->>'mimetype' is distinct from v.mime_type then raise check_violation using message='Uploaded video metadata not confirmed';end if;
 update public.learning_videos set state='ready',ready_at=clock_timestamp() where id=v.id;
end; $$;
create or replace function public.prepare_delete_learning_video(p_video uuid)
returns text language plpgsql security definer set search_path='' as $$ declare v public.learning_videos;begin
 select * into v from public.learning_videos where id=p_video for update;
 if v.id is null or not app_private.video_manage(v) then raise insufficient_privilege using message='Video deletion not granted';end if;
 if exists(select 1 from public.learning_course_videos where video_id=v.id) then raise check_violation using message='Course videos in use are preserved';end if;
 update public.learning_videos set state='deleting' where id=v.id;return v.object_path;
end; $$;
create or replace function public.finish_delete_learning_video(p_video uuid)
returns void language plpgsql security definer set search_path='' as $$ declare v public.learning_videos;begin
 select * into v from public.learning_videos where id=p_video for update;
 if v.id is null or not app_private.video_manage(v) then raise insufficient_privilege using message='Video deletion not granted';end if;
 if v.state<>'deleting' or exists(select 1 from public.learning_course_videos where video_id=v.id) or exists(select 1 from storage.objects where bucket_id='course-videos' and name=v.object_path) then raise check_violation using message='Remove video object before finalizing deletion';end if;
 delete from public.learning_videos where id=v.id;
end; $$;
create or replace function public.learning_video_library(p_page integer default 0,p_size integer default 12,p_query text default '')
returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not (app_private.has_function('learning.videos') and app_private.can_page('learning')) then raise insufficient_privilege using message='Video library not granted';end if;
 if p_page is null or p_page<0 or p_size is null or p_size not between 1 and 50 or p_query is null or length(p_query)>180 then raise check_violation using message='Invalid video page';end if;
 return jsonb_build_object('total',(select count(*) from public.learning_videos v where app_private.video_manage(v) and (p_query='' or strpos(lower(v.title),lower(p_query))>0)),
 'items',(select coalesce(jsonb_agg(to_jsonb(x) order by created_at desc,id),'[]') from (select v.*,(select count(*) from public.learning_course_videos l where l.video_id=v.id) as used_count from public.learning_videos v where app_private.video_manage(v) and (p_query='' or strpos(lower(v.title),lower(p_query))>0) order by v.created_at desc,v.id offset p_page*p_size limit p_size)x));
end; $$;

create or replace function public.attach_learning_video(p_course uuid,p_lesson integer,p_video uuid,p_revision integer)
returns void language plpgsql security definer set search_path='' as $$ declare c public.learning_courses;m public.learning_material;v public.learning_videos;begin
 if not (app_private.has_function('learning.videos') and app_private.has_function('learning.courses') and app_private.can_page('learning')) then raise insufficient_privilege using message='Course video editing not granted';end if;
 select * into c from public.learning_courses where id=p_course for update;
 if c.id is null or (not app_private.is_admin() and c.created_by<>auth.uid()) then raise insufficient_privilege using message='Only own unassigned courses may be edited';end if;
 select * into m from public.learning_material where course_id=c.id for update;
 if m.revision is distinct from p_revision then raise serialization_failure using message='Course changed; reload';end if;
 if exists(select 1 from public.learning_assignments where course_id=c.id) then raise check_violation using message='Assigned courses are immutable; create a copy';end if;
 if p_lesson is null or p_lesson<0 or p_lesson>=jsonb_array_length(m.lessons) then raise check_violation using message='Invalid lesson';end if;
 if p_video is not null then
  select * into v from public.learning_videos where id=p_video for update;
  if v.id is null or v.state<>'ready' or not app_private.video_manage(v) then raise insufficient_privilege using message='Ready own video required';end if;
  insert into public.learning_course_videos(course_id,lesson_index,video_id) values(c.id,p_lesson,v.id) on conflict(course_id,lesson_index) do update set video_id=excluded.video_id;
 else
  if length(trim(m.lessons->p_lesson->>'body'))=0 then raise check_violation using message='Video-only lesson cannot be empty';end if;
  delete from public.learning_course_videos where course_id=c.id and lesson_index=p_lesson;
 end if;
 update public.learning_material set lessons=jsonb_set(lessons,array[p_lesson::text],case when p_video is null then (lessons->p_lesson)-'video_id' else (lessons->p_lesson)||jsonb_build_object('video_id',p_video) end),revision=revision+1,updated_at=clock_timestamp() where course_id=c.id;
end; $$;

-- Preserve course validation, answer-key separation and assignment immutability.
-- The extra optional argument keeps existing six-argument SQL callers working.
drop function if exists public.save_learning_course(uuid,text,jsonb,jsonb,jsonb,integer);
create or replace function public.save_learning_course(p_course uuid,p_title text,p_lessons jsonb,p_questions jsonb,p_answers jsonb,p_expected_revision integer default null,p_pass_percent integer default 80)
returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid; rev integer; item jsonb; i integer; media public.learning_videos; kind text; normalized_answers jsonb:='[]'; normalized_lessons jsonb:='[]'; normalized_questions jsonb:='[]';
begin
 if not (app_private.has_function('learning.courses') and app_private.can_page('learning')) then raise insufficient_privilege using message='Administrator required'; end if;
 if p_pass_percent is null or p_pass_percent not between 1 and 100 then raise check_violation using message='Invalid passing threshold';end if;
 if p_title is null or length(trim(p_title)) not between 1 and 180
 or jsonb_typeof(p_lessons) is distinct from 'array' or jsonb_array_length(p_lessons) not between 1 and 50
 or jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions) not between 1 and 20
 or jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers)<>jsonb_array_length(p_questions)
 then raise check_violation using message='Invalid course'; end if;
 for item in select value from jsonb_array_elements(p_lessons) loop
  if jsonb_typeof(item->'title') is distinct from 'string' or length(trim(item->>'title')) not between 1 and 180
   or jsonb_typeof(item->'body') is distinct from 'string' or length(trim(item->>'body')) not between 0 and 20000 or (length(trim(item->>'body'))=0 and coalesce(item->>'video_id','')='')
  then raise check_violation using message='Invalid lesson'; end if;
  if item->>'video_id' is not null then
   select * into media from public.learning_videos where id=(item->>'video_id')::uuid for update;
   if media.id is null or media.state<>'ready' or not app_private.video_manage(media) then raise insufficient_privilege using message='Ready own video required';end if;
  end if;
  normalized_lessons:=normalized_lessons||jsonb_build_array(jsonb_build_object('title',trim(item->>'title'),'body',item->>'body')||case when item->>'video_id' is null then '{}'::jsonb else jsonb_build_object('video_id',(item->>'video_id')::uuid) end);
 end loop;
 for i in 0..jsonb_array_length(p_questions)-1 loop
  item:=p_questions->i;kind:=coalesce(item->>'type','single');
  if kind not in ('single','multiple','text') or jsonb_typeof(item->'prompt') is distinct from 'string' or length(trim(item->>'prompt')) not between 1 and 1000 then raise check_violation using message='Invalid question';end if;
  if kind in ('single','multiple') then
   if jsonb_typeof(item->'options') is distinct from 'array' then raise check_violation using message='Invalid question options';end if;
   if jsonb_array_length(item->'options') not between 2 and 6 or exists(select 1 from jsonb_array_elements(item->'options') o where jsonb_typeof(o) is distinct from 'string' or length(trim(o#>>'{}')) not between 1 and 500) then raise check_violation using message='Invalid question options';end if;
   if kind='single' then
    if jsonb_typeof(p_answers->i) is distinct from 'number' or (p_answers->>i)!~'^[0-9]+$' or (p_answers->>i)::integer not between 0 and jsonb_array_length(item->'options')-1 then raise check_violation using message='Invalid answer';end if;
    normalized_answers:=normalized_answers||jsonb_build_array(p_answers->i);
   else
    if jsonb_typeof(p_answers->i) is distinct from 'array' then raise check_violation using message='Invalid multiple answer';end if;
    if jsonb_array_length(p_answers->i) not between 1 and jsonb_array_length(item->'options') or exists(select 1 from jsonb_array_elements(p_answers->i) o where jsonb_typeof(o) is distinct from 'number' or (o#>>'{}')!~'^[0-9]+$' or (o#>>'{}')::integer not between 0 and jsonb_array_length(item->'options')-1) or (select count(distinct o) from jsonb_array_elements(p_answers->i) o)<>jsonb_array_length(p_answers->i) then raise check_violation using message='Invalid multiple answer';end if;
    normalized_answers:=normalized_answers||jsonb_build_array((select jsonb_agg((o#>>'{}')::integer order by (o#>>'{}')::integer) from jsonb_array_elements(p_answers->i) o));
   end if;
   normalized_questions:=normalized_questions||jsonb_build_array(jsonb_build_object('prompt',trim(item->>'prompt'),'options',item->'options')||case when item ? 'type' then jsonb_build_object('type',kind) else '{}'::jsonb end);
  else
   if jsonb_typeof(p_answers->i) is distinct from 'string' or length(trim(p_answers->>i)) not between 1 and 500 then raise check_violation using message='Invalid text answer';end if;
   normalized_answers:=normalized_answers||jsonb_build_array(lower(regexp_replace(trim(p_answers->>i),'\s+',' ','g')));
   normalized_questions:=normalized_questions||jsonb_build_array(jsonb_build_object('type','text','prompt',trim(item->>'prompt'),'options','[]'::jsonb));
  end if;
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
 insert into public.learning_material(course_id,lessons,questions,pass_percent) values(cid,normalized_lessons,normalized_questions,p_pass_percent)
 on conflict(course_id) do update set lessons=excluded.lessons,questions=excluded.questions,pass_percent=excluded.pass_percent,revision=learning_material.revision+1,updated_at=clock_timestamp();
 insert into app_private.learning_answer_keys(course_id,answers) values(cid,normalized_answers)
 on conflict(course_id) do update set answers=excluded.answers;
 delete from public.learning_course_videos where course_id=cid;
 for i in 0..jsonb_array_length(normalized_lessons)-1 loop
  if normalized_lessons->i->>'video_id' is not null then insert into public.learning_course_videos(course_id,lesson_index,video_id) values(cid,i,(normalized_lessons->i->>'video_id')::uuid);end if;
 end loop;
 return cid;
end; $$;
create or replace function public.create_learning_assignment(p_learner uuid,p_course uuid,p_studio uuid,p_due date,p_practice boolean)
returns uuid language plpgsql security definer set search_path='' as $$ declare aid uuid; begin
 if not app_private.function_studio('learning.assign',p_studio) then raise insufficient_privilege using message='Administrator required'; end if;
 perform 1 from public.learning_courses where id=p_course and active for update;
 if not found or not app_private.valid_assignee(p_learner,p_studio) then raise check_violation using message='Invalid learner, studio or course'; end if;
 if exists(select 1 from public.learning_course_videos l join public.learning_videos v on v.id=l.video_id where l.course_id=p_course and (v.state<>'ready' or v.studio_id is not null and v.studio_id<>p_studio)) then raise check_violation using message='Course videos belong to another studio';end if;
 insert into public.learning_assignments(learner_id,course_id,studio_id,due_date,requires_practice,created_by) values(p_learner,p_course,p_studio,p_due,p_practice,auth.uid()) returning id into aid;
 insert into public.learning_progress(assignment_id) values(aid); return aid;
end; $$;

create or replace function public.submit_learning_quiz(p_assignment uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.learning_assignments; p public.learning_progress; keys jsonb; qs jsonb; maximum integer; i integer; correct integer:=0; passed boolean; threshold integer; kind text; choice jsonb;
begin
 select * into a from public.learning_assignments where id=p_assignment;
 if not app_private.has_function('learning.quiz') then raise insufficient_privilege using message='Learning action not granted'; end if;
 if a.id is null or a.learner_id<>auth.uid() or not app_private.learning_read(a.id) then raise insufficient_privilege using message='Own learning assignment required'; end if;
 select * into p from public.learning_progress where assignment_id=a.id for update;
 select k.answers,m.questions,c.lesson_count,m.pass_percent into keys,qs,maximum,threshold from app_private.learning_answer_keys k join public.learning_material m on m.course_id=k.course_id join public.learning_courses c on c.id=k.course_id where k.course_id=a.course_id and c.active;
 if keys is null or p.lessons_read is distinct from maximum then raise check_violation using message='Read every lesson before the quiz'; end if;
 if exists(select 1 from public.learning_attempts where assignment_id=a.id and at>clock_timestamp()-interval '10 seconds') then raise check_violation using message='Wait ten seconds before retrying'; end if;
 if jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers)<>jsonb_array_length(keys) then raise check_violation using message='Answer every question'; end if;
 for i in 0..jsonb_array_length(keys)-1 loop
  kind:=coalesce(qs->i->>'type','single');choice:=p_answers->i;
  if kind='single' then
   if jsonb_typeof(choice) is distinct from 'number' or (choice#>>'{}')!~'^[0-9]+$' or (choice#>>'{}')::integer not between 0 and jsonb_array_length(qs->i->'options')-1 then raise check_violation using message='Invalid quiz answer';end if;
  elsif kind='multiple' then
   if jsonb_typeof(choice) is distinct from 'array' then raise check_violation using message='Invalid quiz answer';end if;
   if jsonb_array_length(choice) not between 1 and jsonb_array_length(qs->i->'options') or exists(select 1 from jsonb_array_elements(choice) o where jsonb_typeof(o) is distinct from 'number' or (o#>>'{}')!~'^[0-9]+$' or (o#>>'{}')::integer not between 0 and jsonb_array_length(qs->i->'options')-1) or (select count(distinct o) from jsonb_array_elements(choice) o)<>jsonb_array_length(choice) then raise check_violation using message='Invalid quiz answer';end if;
   select jsonb_agg((o#>>'{}')::integer order by (o#>>'{}')::integer) into choice from jsonb_array_elements(choice) o;
  else
   if jsonb_typeof(choice) is distinct from 'string' or length(trim(choice#>>'{}')) not between 1 and 500 then raise check_violation using message='Invalid quiz answer';end if;
   choice:=to_jsonb(lower(regexp_replace(trim(choice#>>'{}'),'\s+',' ','g')));
  end if;
  if choice=keys->i then correct:=correct+1;end if;
 end loop;
 passed:=correct*100>=jsonb_array_length(keys)*threshold;
 insert into public.learning_attempts(assignment_id,correct,total,passed,pass_percent) values(a.id,correct,jsonb_array_length(keys),passed,threshold);
 update public.learning_progress set quiz_passed=quiz_passed or passed,updated_at=clock_timestamp() where assignment_id=a.id;
 insert into public.learning_events(assignment_id,actor_id,event,notes) values(a.id,auth.uid(),case when passed then 'Online quiz passed' else 'Online quiz not passed' end,correct||'/'||jsonb_array_length(keys));
 return jsonb_build_object('correct',correct,'total',jsonb_array_length(keys),'passed',passed,'pass_percent',threshold,'percent',round(correct*100.0/jsonb_array_length(keys),1));
end; $$;

revoke all on function app_private.video_scope(uuid),app_private.video_manage(public.learning_videos),app_private.video_course_read(uuid,uuid),app_private.video_read(public.learning_videos),app_private.video_object_access(text,text) from public,anon,authenticated;
grant execute on function app_private.video_scope(uuid),app_private.video_manage(public.learning_videos),app_private.video_course_read(uuid,uuid),app_private.video_read(public.learning_videos),app_private.video_object_access(text,text) to authenticated;
revoke all on function public.prepare_learning_video(text,uuid,text,text,bigint,uuid),public.finish_learning_video(uuid),public.prepare_delete_learning_video(uuid),public.finish_delete_learning_video(uuid),public.learning_video_library(integer,integer,text),public.attach_learning_video(uuid,integer,uuid,integer) from public,anon,authenticated;
grant execute on function public.prepare_learning_video(text,uuid,text,text,bigint,uuid),public.finish_learning_video(uuid),public.prepare_delete_learning_video(uuid),public.finish_delete_learning_video(uuid),public.learning_video_library(integer,integer,text),public.attach_learning_video(uuid,integer,uuid,integer) to authenticated;
revoke all on function public.save_learning_course(uuid,text,jsonb,jsonb,jsonb,integer,integer) from public,anon,authenticated;
grant execute on function public.save_learning_course(uuid,text,jsonb,jsonb,jsonb,integer,integer) to authenticated;
notify pgrst,'reload schema';
commit;
