-- Apply AFTER 001–006. Keeps existing accounts and data. No demo messages are seeded.
begin;

create table if not exists public.team_page_access(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 pages text[] not null, revision integer not null default 1,
 updated_at timestamptz not null default now(),updated_by uuid not null references public.profiles(id),
 check(pages<@array['dashboard','tasks','calendar','learning','knowledge','files','modules','builder','chat','feedback']::text[]),
 check(not('calendar'=any(pages)) or 'tasks'=any(pages))
);
alter table public.team_page_access enable row level security;
drop policy if exists team_pages_read on public.team_page_access;
create policy team_pages_read on public.team_page_access for select to authenticated using(app_private.is_active() and (user_id=auth.uid() or app_private.is_admin()));
revoke all on public.team_page_access from public,anon,authenticated;
grant select on public.team_page_access to authenticated;

create or replace function app_private.default_team_pages(p_role text)
returns text[] language sql immutable set search_path='' as $$
 select case p_role when 'admin' then array['dashboard','tasks','calendar','learning','knowledge','files','modules','builder','chat','feedback','access','controlling'] when 'studio_manager' then array['dashboard','tasks','calendar','learning','knowledge','files','modules','builder','chat','feedback'] else array['dashboard','tasks','calendar','learning','knowledge','chat','feedback'] end;
$$;
create or replace function app_private.can_page(p_page text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p left join public.team_page_access a on a.user_id=p.id where p.id=auth.uid() and p.active and (p.role='admin' or p_page=any(coalesce(a.pages,app_private.default_team_pages(p.role)))));
$$;
create or replace function public.team_access_context()
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare p public.profiles; a public.team_page_access; begin
 select * into p from public.profiles where id=auth.uid() and active;
 if not found then raise insufficient_privilege using message='Active employee required'; end if;
 select * into a from public.team_page_access where user_id=p.id;
 return jsonb_build_object('version',7,'pages',case when p.role='admin' then app_private.default_team_pages('admin') else coalesce(a.pages,app_private.default_team_pages(p.role)) end,'can_design',app_private.design_right('edit'));
end; $$;
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
   if exists(select 1 from unnest(p_pages) x where x is null or x not in ('dashboard','tasks','calendar','learning','knowledge','files','modules','builder','chat','feedback')) or ('calendar'=any(p_pages) and not('tasks'=any(p_pages))) then raise check_violation using message='Invalid page permissions'; end if;
   insert into public.team_page_access(user_id,pages,updated_by) values(p_user,array(select distinct unnest(p_pages)),auth.uid())
   on conflict(user_id) do update set pages=excluded.pages,revision=team_page_access.revision+1,updated_at=clock_timestamp(),updated_by=auth.uid();
  end if;
 end if;
 select * into a from public.team_page_access where user_id=p_user;
 return jsonb_build_object('pages',case when p.role='admin' then app_private.default_team_pages('admin') else coalesce(a.pages,app_private.default_team_pages(p.role)) end,'revision',a.revision,'defaulted',a.user_id is null,'role',p.role);
end; $$;

-- Data access is enforced here as well as in navigation.
create or replace function app_private.can_view_task(site uuid,assignee uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('tasks') and (app_private.can_manage_studio(site) or (assignee=auth.uid() and app_private.has_studio(site))); $$;
drop policy if exists tasks_page_guard on public.tasks;
create policy tasks_page_guard on public.tasks as restrictive for all to authenticated using(app_private.can_page('tasks')) with check(app_private.can_page('tasks'));
create or replace function app_private.learning_read(aid uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('learning') and (app_private.is_admin() or exists(select 1 from public.learning_assignments a where a.id=aid and a.learner_id=auth.uid() and app_private.has_studio(a.studio_id))); $$;
create or replace function app_private.design_right(permission text)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('builder') and (app_private.is_admin() or exists(select 1 from public.module_permissions p where p.user_id=auth.uid() and case permission when 'create' then p.can_create when 'edit' then p.can_edit when 'publish' then p.can_publish else false end)); $$;
create or replace function app_private.knowledge_scope(site uuid)
returns boolean language sql stable security definer set search_path='' as $$ select (app_private.can_page('knowledge') or app_private.can_page('files')) and (site is null or app_private.has_studio(site)); $$;
create or replace function app_private.knowledge_manager(site uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('files') and (app_private.is_admin() or (site is not null and app_private.can_manage_studio(site))); $$;
create or replace function app_private.knowledge_document_read(doc uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select app_private.is_active() and exists(select 1 from public.knowledge_documents d where d.id=doc and (app_private.knowledge_manager(d.studio_id) or (not d.archived and app_private.knowledge_scope(d.studio_id) and ((d.created_by=auth.uid() and d.published_version_id is null and app_private.can_page('files')) or (d.published_version_id is not null and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role=any(d.reader_roles)))))));
$$;
create or replace function app_private.knowledge_contribute(doc uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('files') and exists(select 1 from public.knowledge_documents d where d.id=doc and not d.archived and (app_private.knowledge_manager(d.studio_id) or (d.created_by=auth.uid() and app_private.knowledge_scope(d.studio_id) and app_private.knowledge_document_read(d.id)))); $$;
create or replace function app_private.knowledge_version_read(vid uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.is_active() and exists(select 1 from public.knowledge_versions v join public.knowledge_documents d on d.id=v.document_id where v.id=vid and (app_private.knowledge_manager(d.studio_id) or (not d.archived and app_private.knowledge_scope(d.studio_id) and ((app_private.can_page('files') and v.created_by=auth.uid() and d.created_by=auth.uid() and app_private.knowledge_document_read(d.id)) or (v.published_at is not null and d.published_version_id is not null and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role=any(d.reader_roles))))))); $$;

create or replace function app_private.module_read(mid uuid, site uuid default null)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare s jsonb; member_role text; site_name text;
begin
 if not app_private.can_page('modules') and not app_private.design_right('edit') then return false; end if;
 select v.schema into s from public.custom_modules m join public.module_versions v on v.id=m.published_version_id where m.id=mid;
 if s is null then return false; end if;
 if app_private.is_admin() then return true; end if;
 select role into member_role from public.profiles where id=auth.uid();
 if not (s->'readerRoles' ? member_role) then return false; end if;
 if site is not null then
   select name into site_name from public.studios where id=site;
   return app_private.has_studio(site) and (s->'studios' ? 'Alle Studios' or s->'studios' ? site_name);
 end if;
 return exists(select 1 from public.studio_memberships m join public.studios st on st.id=m.studio_id where m.user_id=auth.uid() and (s->'studios' ? 'Alle Studios' or s->'studios' ? st.name));
end;
$$;
create or replace function public.prepare_knowledge_version(p_document uuid,p_expected_revision integer,p_title text,p_summary text,p_category text,p_tags text[],p_studio uuid,p_roles text[],p_kind text,p_file_name text default null,p_mime_type text default null,p_file_size bigint default null,p_text text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.knowledge_documents; vid uuid:=gen_random_uuid(); number integer; path text; ext text; allowed_mime text;
begin
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

create or replace function public.my_team_dashboard()
returns jsonb language plpgsql stable security invoker set search_path='' as $$ declare today date:=(current_timestamp at time zone 'Europe/Berlin')::date; begin
 if not app_private.can_page('dashboard') then raise insufficient_privilege using message='Active employee profile required'; end if;
 return jsonb_build_object('today',today,
 'counts',(select jsonb_build_object('open',count(*) filter(where status<>'done'),'overdue',count(*) filter(where status<>'done' and due_date<today),'today',count(*) filter(where status<>'done' and due_date=today),'done',count(*) filter(where status='done')) from public.tasks where assignee_id=auth.uid()),
 'tasks',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from (select * from public.tasks where assignee_id=auth.uid() and status<>'done' order by due_date,case when priority='high' then 0 else 1 end,id limit 8)t),
 'learning',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'title',c.title,'due_date',a.due_date,'lesson_count',c.lesson_count,'lessons_read',p.lessons_read,'quiz_passed',p.quiz_passed,'requires_practice',a.requires_practice,'practice_confirmed',p.practice_confirmed)),'[]') from public.learning_assignments a join public.learning_courses c on c.id=a.course_id join public.learning_progress p on p.assignment_id=a.id where a.learner_id=auth.uid()),
 'knowledge',(select coalesce(jsonb_agg(to_jsonb(d)),'[]') from (select id,title,category,updated_at from public.knowledge_documents where published_version_id is not null and not archived order by updated_at desc,id limit 5)d));
end; $$;

create or replace function public.team_task_calendar(p_month date,p_studio uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$ declare start_day date:=date_trunc('month',p_month)::date; end_day date:=(date_trunc('month',p_month)+interval '1 month')::date; begin
 if not app_private.can_page('calendar') then raise insufficient_privilege using message='Active employee profile required'; end if;
 if p_month is null then raise check_violation using message='Month required'; end if;
 return jsonb_build_object('days',(select coalesce(jsonb_agg(to_jsonb(d)),'[]') from (select due_date,count(*) as total,count(*) filter(where status='done') as done from public.tasks where due_date>=start_day and due_date<end_day and (p_studio is null or studio_id=p_studio) group by due_date order by due_date)d));
end; $$;

-- Shared channels: one per studio, the entire team, and selected-studio groups.
create table if not exists public.team_chat_channels(
 id uuid primary key default gen_random_uuid(),slug text not null unique,
 title text not null check(length(trim(title)) between 1 and 100),
 kind text not null check(kind in ('all','studio','cross')),studio_ids uuid[] not null default '{}',
 active boolean not null default true,revision integer not null default 1,
 created_by uuid references public.profiles(id),created_at timestamptz not null default now(),
 check((kind='all' and cardinality(studio_ids)=0) or (kind='studio' and cardinality(studio_ids)=1) or (kind='cross' and cardinality(studio_ids) between 2 and 7))
);
create table if not exists public.team_chat_messages(
 id integer generated always as identity primary key,
 channel_id uuid not null references public.team_chat_channels(id),sender_id uuid not null references public.profiles(id),
 body text not null check(length(trim(body)) between 1 and 4000),nonce uuid not null,
 created_at timestamptz not null default now(),unique(sender_id,nonce)
);
create index if not exists chat_channel_messages on public.team_chat_messages(channel_id,id desc);
create table if not exists public.team_chat_reads(
 user_id uuid not null references public.profiles(id),channel_id uuid not null references public.team_chat_channels(id),
 last_read_id integer not null default 0,updated_at timestamptz not null default now(),primary key(user_id,channel_id)
);
create or replace function app_private.chat_visible(cid uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select app_private.can_page('chat') and exists(select 1 from public.team_chat_channels c where c.id=cid and ((app_private.is_admin()) or (c.active and (c.kind='all' or exists(select 1 from unnest(c.studio_ids) s where app_private.has_studio(s))))));
$$;
alter table public.team_chat_channels enable row level security;
alter table public.team_chat_messages enable row level security;
alter table public.team_chat_reads enable row level security;
drop policy if exists chat_channels_read on public.team_chat_channels;
create policy chat_channels_read on public.team_chat_channels for select to authenticated using(app_private.chat_visible(id));
drop policy if exists chat_messages_read on public.team_chat_messages;
create policy chat_messages_read on public.team_chat_messages for select to authenticated using(app_private.chat_visible(channel_id));
drop policy if exists chat_reads_read on public.team_chat_reads;
create policy chat_reads_read on public.team_chat_reads for select to authenticated using(user_id=auth.uid() and app_private.chat_visible(channel_id));
revoke all on public.team_chat_channels,public.team_chat_messages,public.team_chat_reads from public,anon,authenticated;
grant select on public.team_chat_channels,public.team_chat_messages,public.team_chat_reads to authenticated;

insert into public.team_chat_channels(slug,title,kind) values('team','Gesamtes Team','all') on conflict(slug) do nothing;
insert into public.team_chat_channels(slug,title,kind,studio_ids) select 'studio-'||id::text,name,'studio',array[id] from public.studios on conflict(slug) do nothing;

create or replace function public.team_chat_inbox()
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
 if not app_private.can_page('chat') then raise insufficient_privilege using message='Chat not granted'; end if;
 with channels as (
  select c.id,c.title,c.kind,c.studio_ids,c.active,c.revision,
   (select count(*) from public.team_chat_messages m where m.channel_id=c.id and m.sender_id<>auth.uid() and m.id>coalesce(r.last_read_id,0)) as unread,
   (select max(m.created_at) from public.team_chat_messages m where m.channel_id=c.id) as last_message_at
  from public.team_chat_channels c left join public.team_chat_reads r on r.channel_id=c.id and r.user_id=auth.uid() where app_private.chat_visible(c.id)
 ) select jsonb_build_object('channels',coalesce(jsonb_agg(to_jsonb(channels) order by kind,title),'[]'),'unread',coalesce(sum(unread),0)) into result from channels;
 return result;
end; $$;
create or replace function public.team_chat_history(p_channel uuid,p_before integer default null,p_size integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
 if not app_private.chat_visible(p_channel) then raise insufficient_privilege using message='Channel not granted'; end if;
 if p_size is null or p_size not between 1 and 100 or p_before is not null and p_before<1 then raise check_violation using message='Invalid message cursor'; end if;
 with messages as (select m.id,m.channel_id,m.sender_id,m.body,m.created_at,p.full_name as sender_name from public.team_chat_messages m join public.profiles p on p.id=m.sender_id where m.channel_id=p_channel and (p_before is null or m.id<p_before) order by m.id desc limit p_size)
 select jsonb_build_object('messages',coalesce(jsonb_agg(to_jsonb(messages) order by id),'[]'),'has_more',exists(select 1 from public.team_chat_messages where channel_id=p_channel and id<(select min(id) from messages))) into result from messages;
 return result;
end; $$;
create or replace function public.send_team_chat(p_channel uuid,p_body text,p_nonce uuid)
returns integer language plpgsql security definer set search_path='' as $$ declare old public.team_chat_messages; mid integer; begin
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
create or replace function public.mark_team_chat_read(p_channel uuid,p_last integer)
returns void language plpgsql security definer set search_path='' as $$ begin
 if not app_private.chat_visible(p_channel) then raise insufficient_privilege using message='Channel not granted'; end if;
 if p_last is null or p_last<0 or (p_last>0 and not exists(select 1 from public.team_chat_messages where channel_id=p_channel and id=p_last)) then raise check_violation using message='Only loaded channel messages can be marked read'; end if;
 insert into public.team_chat_reads(user_id,channel_id,last_read_id) values(auth.uid(),p_channel,p_last)
 on conflict(user_id,channel_id) do update set last_read_id=greatest(team_chat_reads.last_read_id,excluded.last_read_id),updated_at=clock_timestamp();
end; $$;
create or replace function public.admin_chat_channel(p_channel uuid,p_title text,p_studios uuid[],p_active boolean,p_revision integer default null)
returns uuid language plpgsql security definer set search_path='' as $$ declare c public.team_chat_channels; normalized uuid[]; begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 if p_title is null or length(trim(p_title)) not between 1 and 100 or p_active is null or p_studios is null or exists(select 1 from unnest(p_studios) s where s is null or not exists(select 1 from public.studios where id=s)) then raise check_violation using message='Invalid channel'; end if;
 select array_agg(s order by s) into normalized from(select distinct unnest(p_studios) s)x;
 normalized:=coalesce(normalized,'{}');
 if p_channel is null then
  if cardinality(normalized) not between 2 and 7 then raise check_violation using message='Select at least two studios'; end if;
  insert into public.team_chat_channels(slug,title,kind,studio_ids,active,created_by) values('cross-'||gen_random_uuid()::text,trim(p_title),'cross',normalized,p_active,auth.uid()) returning * into c;
 else
  select * into c from public.team_chat_channels where id=p_channel for update;
  if not found or c.revision is distinct from p_revision then raise serialization_failure using message='Channel changed'; end if;
  if c.kind<>'cross' and c.studio_ids is distinct from normalized then raise check_violation using message='System channel membership is fixed'; end if;
  if c.kind='cross' and cardinality(normalized) not between 2 and 7 then raise check_violation using message='Select at least two studios'; end if;
  update public.team_chat_channels set title=trim(p_title),studio_ids=normalized,active=p_active,revision=revision+1 where id=c.id;
 end if;
 return c.id;
end; $$;
-- Feedback keeps reports out of staff performance controlling.
create table if not exists public.team_feedback_routes(
 id uuid primary key default gen_random_uuid(),studio_id uuid references public.studios(id),
 category text not null check(category in ('organisation','geraete','technik','marketing','idee','sonstiges')),
 assignee_id uuid not null references public.profiles(id),revision integer not null default 1,
 unique nulls not distinct(studio_id,category)
);
create table if not exists public.team_feedback(
 id uuid primary key,reference text not null unique,
 studio_id uuid not null references public.studios(id),category text not null check(category in ('organisation','geraete','technik','marketing','idee','sonstiges')),
 title text not null check(length(trim(title)) between 1 and 180),body text not null check(length(trim(body)) between 1 and 4000),
 anonymous boolean not null,author_id uuid references public.profiles(id),assignee_id uuid references public.profiles(id),
 status text not null default 'open' check(status in ('open','in_progress','done')),
 reply text not null default '' check(length(reply)<=3000),revision integer not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((anonymous and author_id is null) or (not anonymous and author_id is not null))
);
create index if not exists feedback_author on public.team_feedback(author_id,created_at desc);
create index if not exists feedback_assignee on public.team_feedback(assignee_id,status);
create table if not exists public.team_feedback_events(
 id uuid primary key default gen_random_uuid(),feedback_id uuid not null references public.team_feedback(id),
 actor_id uuid not null references public.profiles(id),status text not null,reply text not null,at timestamptz not null default now()
);
create or replace function app_private.feedback_visible(fid uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('feedback') and exists(select 1 from public.team_feedback f where f.id=fid and (app_private.is_admin() or f.author_id=auth.uid() or (f.assignee_id=auth.uid() and app_private.has_studio(f.studio_id)))); $$;
create or replace function app_private.feedback_manage(fid uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('feedback') and exists(select 1 from public.team_feedback f where f.id=fid and (app_private.is_admin() or (f.assignee_id=auth.uid() and app_private.has_studio(f.studio_id)))); $$;
alter table public.team_feedback_routes enable row level security;
alter table public.team_feedback enable row level security;
alter table public.team_feedback_events enable row level security;
drop policy if exists feedback_routes_admin on public.team_feedback_routes;
create policy feedback_routes_admin on public.team_feedback_routes for select to authenticated using(app_private.is_admin());
drop policy if exists feedback_read on public.team_feedback;
create policy feedback_read on public.team_feedback for select to authenticated using(app_private.feedback_visible(id));
drop policy if exists feedback_events_read on public.team_feedback_events;
create policy feedback_events_read on public.team_feedback_events for select to authenticated using(app_private.feedback_visible(feedback_id));
revoke all on public.team_feedback_routes,public.team_feedback,public.team_feedback_events from public,anon,authenticated;
grant select on public.team_feedback_routes,public.team_feedback,public.team_feedback_events to authenticated;

create or replace function app_private.valid_feedback_handler(target uuid,site uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.valid_assignee(target,site) and exists(select 1 from public.profiles p left join public.team_page_access a on a.user_id=p.id where p.id=target and p.active and (p.role='admin' or 'feedback'=any(coalesce(a.pages,app_private.default_team_pages(p.role))))); $$;
create or replace function public.submit_team_feedback(p_request uuid,p_studio uuid,p_category text,p_title text,p_body text,p_anonymous boolean)
returns jsonb language plpgsql security definer set search_path='' as $$ declare f public.team_feedback; handler uuid; begin
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
create or replace function public.team_feedback_list(p_page integer default 0,p_size integer default 20,p_status text default 'all',p_studio uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
 if not app_private.can_page('feedback') then raise insufficient_privilege using message='Feedback not granted'; end if;
 if p_page is null or p_page not between 0 and 10000 or p_size is null or p_size not between 1 and 50 or p_status is null or p_status not in ('all','open','in_progress','done') then raise check_violation using message='Invalid feedback filters'; end if;
 with scoped as (
  select f.id,f.reference,f.studio_id,f.category,f.title,f.body,f.anonymous,f.assignee_id,f.status,f.reply,f.revision,f.created_at,f.updated_at,
   case when f.anonymous then null else author.full_name end as author_name,handler.full_name as assignee_name,
   coalesce(f.author_id=auth.uid(),false) as own,app_private.feedback_manage(f.id) as can_manage
  from public.team_feedback f left join public.profiles author on author.id=f.author_id left join public.profiles handler on handler.id=f.assignee_id
  where app_private.feedback_visible(f.id) and (p_status='all' or f.status=p_status) and (p_studio is null or f.studio_id=p_studio)
 ), paged as(select * from scoped order by created_at desc,id offset p_page*p_size limit p_size)
 select jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from paged p),'total',(select count(*) from scoped)) into result;
 return result;
end; $$;
create or replace function public.track_team_feedback(p_reference text)
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare f public.team_feedback; begin
 if not app_private.can_page('feedback') then raise insufficient_privilege using message='Feedback not granted'; end if;
 if p_reference is null or length(trim(p_reference))>40 then raise check_violation using message='Invalid reference'; end if;
 select * into f from public.team_feedback where lower(reference)=lower(trim(p_reference));
 if not found or (not f.anonymous and not app_private.feedback_visible(f.id)) then return null; end if;
 -- The unguessable reference lets an anonymous reporter retrieve only status/reply.
 return jsonb_build_object('reference',f.reference,'status',f.status,'reply',f.reply,'updated_at',f.updated_at);
end; $$;
create or replace function public.update_team_feedback(p_feedback uuid,p_status text,p_reply text,p_assignee uuid,p_revision integer)
returns void language plpgsql security definer set search_path='' as $$ declare f public.team_feedback; begin
 select * into f from public.team_feedback where id=p_feedback for update;
 if not found or not app_private.feedback_manage(p_feedback) then raise insufficient_privilege using message='Feedback management not granted'; end if;
 if f.revision is distinct from p_revision then raise serialization_failure using message='Feedback changed'; end if;
 if p_status is null or p_status not in ('open','in_progress','done') or p_reply is null or length(p_reply)>3000 then raise check_violation using message='Invalid feedback update'; end if;
 if p_assignee is distinct from f.assignee_id and not app_private.is_admin() then raise insufficient_privilege using message='Only admin can reassign feedback'; end if;
 if p_assignee is not null and not app_private.valid_feedback_handler(p_assignee,f.studio_id) then raise check_violation using message='Invalid feedback assignee'; end if;
 update public.team_feedback set status=p_status,reply=p_reply,assignee_id=p_assignee,revision=revision+1,updated_at=clock_timestamp() where id=f.id;
 insert into public.team_feedback_events(feedback_id,actor_id,status,reply,at) values(f.id,auth.uid(),p_status,p_reply,clock_timestamp());
end; $$;
create or replace function public.admin_feedback_routes()
returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from public.team_feedback_routes r),'[]');
end; $$;
create or replace function public.admin_feedback_route(p_studio uuid,p_category text,p_assignee uuid,p_revision integer default null)
returns void language plpgsql security definer set search_path='' as $$ declare r public.team_feedback_routes; begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
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

create or replace function public.admin_pilot_status()
returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 return jsonb_build_object('migration',7,'chat_channels',(select count(*) from public.team_chat_channels where active),'feedback_open',(select count(*) from public.team_feedback where status<>'done'),'active_users',(select count(*) from public.profiles where active),
 'tasks',(select count(*) from public.tasks),'courses',(select count(*) from public.learning_material),
 'storage_private',coalesce((select not public from storage.buckets where id='team-knowledge'),false),
 'documents',(select count(*) from public.knowledge_documents),
 'published',(select count(*) from public.knowledge_documents where published_version_id is not null and not archived),
 'drafts',(select count(*) from public.knowledge_documents where published_version_id is null and not archived),
 'pending_uploads',(select count(*) from public.knowledge_versions where state='uploading'),
 'unlinked_objects',(select count(*) from storage.objects o where o.bucket_id='team-knowledge' and not exists(select 1 from public.knowledge_versions v where v.object_path=o.name)));
end; $$;


revoke all on all functions in schema app_private from public;
grant execute on function app_private.default_team_pages(text),app_private.can_page(text),app_private.chat_visible(uuid),app_private.feedback_visible(uuid),app_private.feedback_manage(uuid) to authenticated;
revoke all on function public.team_access_context(),public.admin_page_access(uuid,text[],integer,boolean),public.team_chat_inbox(),public.team_chat_history(uuid,integer,integer),public.send_team_chat(uuid,text,uuid),public.mark_team_chat_read(uuid,integer),public.admin_chat_channel(uuid,text,uuid[],boolean,integer),public.submit_team_feedback(uuid,uuid,text,text,text,boolean),public.team_feedback_list(integer,integer,text,uuid),public.track_team_feedback(text),public.update_team_feedback(uuid,text,text,uuid,integer),public.admin_feedback_routes(),public.admin_feedback_route(uuid,text,uuid,integer) from public,anon;
grant execute on function public.team_access_context(),public.admin_page_access(uuid,text[],integer,boolean),public.team_chat_inbox(),public.team_chat_history(uuid,integer,integer),public.send_team_chat(uuid,text,uuid),public.mark_team_chat_read(uuid,integer),public.admin_chat_channel(uuid,text,uuid[],boolean,integer),public.submit_team_feedback(uuid,uuid,text,text,text,boolean),public.team_feedback_list(integer,integer,text,uuid),public.track_team_feedback(text),public.update_team_feedback(uuid,text,text,uuid,integer),public.admin_feedback_routes(),public.admin_feedback_route(uuid,text,uuid,integer) to authenticated;
notify pgrst,'reload schema';
commit;
