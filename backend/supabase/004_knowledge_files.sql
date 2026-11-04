-- Apply after 001, 002 and 003 in the Supabase SQL editor.
-- Storage is private. File contents are managed through the Storage API only.
begin;

create table if not exists public.knowledge_documents (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 summary text not null default '',
 category text not null,
 tags text[] not null default '{}',
 studio_id uuid references public.studios(id),
 reader_roles text[] not null default array['admin','studio_manager','employee'],
 created_by uuid not null references public.profiles(id),
 published_version_id uuid,
 archived boolean not null default false,
 revision integer not null default 1,
 updated_at timestamptz not null default now(),
 search_text text not null default '',
 search_vector tsvector generated always as (to_tsvector('german'::regconfig,title||' '||summary||' '||search_text)) stored
);
create table if not exists public.knowledge_versions (
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null references public.knowledge_documents(id),
 version integer not null,
 kind text not null check(kind in ('file','article')),
 state text not null check(state in ('uploading','ready')),
 title text not null,
 summary text not null default '',
 category text not null,
 tags text[] not null default '{}',
 text_content text not null default '',
 file_name text,
 mime_type text,
 file_size bigint,
 object_path text unique,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 published_by uuid references public.profiles(id),
 published_at timestamptz,
 unique(document_id,version),
 check((kind='article' and object_path is null and file_name is null and state='ready') or (kind='file' and object_path is not null and file_name is not null and file_size between 1 and 52428800))
);
do $$ begin
 if not exists(select 1 from pg_constraint where conname='knowledge_published_version_fk' and conrelid='public.knowledge_documents'::regclass) then
  alter table public.knowledge_documents add constraint knowledge_published_version_fk foreign key(published_version_id) references public.knowledge_versions(id);
 end if;
end $$;
create table if not exists public.knowledge_events (
 id uuid primary key default gen_random_uuid(), document_id uuid not null references public.knowledge_documents(id),
 version_id uuid references public.knowledge_versions(id), actor_id uuid not null references public.profiles(id),
 event text not null, at timestamptz not null default now()
);
create index if not exists knowledge_documents_search on public.knowledge_documents using gin(search_vector);
create index if not exists knowledge_documents_scope on public.knowledge_documents(studio_id,updated_at);
create index if not exists knowledge_versions_document on public.knowledge_versions(document_id,version desc);

create or replace function app_private.knowledge_scope(site uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.is_active() and (site is null or app_private.has_studio(site)); $$;
create or replace function app_private.knowledge_manager(site uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.is_admin() or (site is not null and app_private.can_manage_studio(site)); $$;
create or replace function app_private.knowledge_document_read(doc uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select app_private.is_active() and exists(select 1 from public.knowledge_documents d where d.id=doc and (
  app_private.knowledge_manager(d.studio_id) or (not d.archived and app_private.knowledge_scope(d.studio_id) and (
   (d.created_by=auth.uid() and d.published_version_id is null) or (d.published_version_id is not null and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role=any(d.reader_roles)))
  ))
 )); $$;
create or replace function app_private.knowledge_contribute(doc uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select app_private.is_active() and exists(select 1 from public.knowledge_documents d where d.id=doc and not d.archived and (
  app_private.knowledge_manager(d.studio_id) or (d.created_by=auth.uid() and app_private.knowledge_scope(d.studio_id) and app_private.knowledge_document_read(d.id))
 )); $$;
create or replace function app_private.knowledge_version_read(vid uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select app_private.is_active() and exists(select 1 from public.knowledge_versions v join public.knowledge_documents d on d.id=v.document_id where v.id=vid and (
  app_private.knowledge_manager(d.studio_id) or (not d.archived and app_private.knowledge_scope(d.studio_id) and (
   (v.created_by=auth.uid() and d.created_by=auth.uid() and app_private.knowledge_document_read(d.id)) or
   (v.published_at is not null and d.published_version_id is not null and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role=any(d.reader_roles)))
  ))
 )); $$;
create or replace function app_private.knowledge_object_access(path text, operation text)
returns boolean language sql stable security definer set search_path='' as $$
 select app_private.is_active() and exists(select 1 from public.knowledge_versions v join public.knowledge_documents d on d.id=v.document_id where v.object_path=path and case operation
 when 'read' then app_private.knowledge_version_read(v.id)
 when 'insert' then v.state='uploading' and v.created_by=auth.uid() and v.created_at>now()-interval '24 hours' and app_private.knowledge_contribute(d.id)
 when 'delete' then v.state='uploading' and v.published_at is null and (app_private.knowledge_manager(d.studio_id) or (v.created_by=auth.uid() and app_private.knowledge_contribute(d.id)))
 else false end); $$;

alter table public.knowledge_documents enable row level security;
alter table public.knowledge_versions enable row level security;
alter table public.knowledge_events enable row level security;
drop policy if exists knowledge_documents_read on public.knowledge_documents;
create policy knowledge_documents_read on public.knowledge_documents for select to authenticated using(app_private.knowledge_document_read(id));
drop policy if exists knowledge_versions_read on public.knowledge_versions;
create policy knowledge_versions_read on public.knowledge_versions for select to authenticated using(app_private.knowledge_version_read(id));
drop policy if exists knowledge_events_manage on public.knowledge_events;
create policy knowledge_events_manage on public.knowledge_events for select to authenticated using(exists(select 1 from public.knowledge_documents d where d.id=document_id and app_private.knowledge_manager(d.studio_id)));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('team-knowledge','team-knowledge',false,52428800,array[
 'application/pdf','text/plain','text/markdown','text/csv','image/png','image/jpeg','image/webp','video/mp4','video/webm',
 'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'
]) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists team_knowledge_storage_read on storage.objects;
create policy team_knowledge_storage_read on storage.objects for select to authenticated using(bucket_id='team-knowledge' and app_private.knowledge_object_access(name,'read'));
drop policy if exists team_knowledge_storage_insert on storage.objects;
create policy team_knowledge_storage_insert on storage.objects for insert to authenticated with check(bucket_id='team-knowledge' and app_private.knowledge_object_access(name,'insert'));
drop policy if exists team_knowledge_storage_delete on storage.objects;
create policy team_knowledge_storage_delete on storage.objects for delete to authenticated using(bucket_id='team-knowledge' and app_private.knowledge_object_access(name,'delete'));
-- Restrictive policies keep this bucket protected even if another application
-- later adds a permissive policy for all Storage objects in the same project.
drop policy if exists team_knowledge_anon_guard on storage.objects;
create policy team_knowledge_anon_guard on storage.objects as restrictive for all to anon using(bucket_id<>'team-knowledge') with check(bucket_id<>'team-knowledge');
drop policy if exists team_knowledge_read_guard on storage.objects;
create policy team_knowledge_read_guard on storage.objects as restrictive for select to authenticated using(bucket_id<>'team-knowledge' or app_private.knowledge_object_access(name,'read'));
drop policy if exists team_knowledge_insert_guard on storage.objects;
create policy team_knowledge_insert_guard on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'team-knowledge' or app_private.knowledge_object_access(name,'insert'));
drop policy if exists team_knowledge_delete_guard on storage.objects;
create policy team_knowledge_delete_guard on storage.objects as restrictive for delete to authenticated using(bucket_id<>'team-knowledge' or app_private.knowledge_object_access(name,'delete'));
drop policy if exists team_knowledge_update_guard on storage.objects;
create policy team_knowledge_update_guard on storage.objects as restrictive for update to authenticated using(bucket_id<>'team-knowledge') with check(bucket_id<>'team-knowledge');

create or replace function public.prepare_knowledge_version(p_document uuid,p_expected_revision integer,p_title text,p_summary text,p_category text,p_tags text[],p_studio uuid,p_roles text[],p_kind text,p_file_name text default null,p_mime_type text default null,p_file_size bigint default null,p_text text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.knowledge_documents; vid uuid:=gen_random_uuid(); number integer; path text; ext text; allowed_mime text;
begin
 if not app_private.is_active() then raise insufficient_privilege using message='Active employee required'; end if;
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

create or replace function public.finish_knowledge_upload(p_version uuid)
returns void language plpgsql security definer set search_path='' as $$ declare v public.knowledge_versions; d public.knowledge_documents; meta jsonb; begin
 select * into v from public.knowledge_versions where id=p_version;
 select * into d from public.knowledge_documents where id=v.document_id for update;
 select * into v from public.knowledge_versions where id=p_version for update;
 if v.id is null or not app_private.knowledge_contribute(v.document_id) or (v.created_by<>auth.uid() and not app_private.knowledge_manager(d.studio_id)) then raise insufficient_privilege using message='Upload finalization not granted'; end if;
 if v.kind<>'file' then raise check_violation using message='File upload required'; end if;
 if v.state='ready' then return; end if;
 select metadata into meta from storage.objects where bucket_id='team-knowledge' and name=v.object_path;
 if meta is null or (meta->>'size')::bigint is distinct from v.file_size or meta->>'mimetype' is distinct from v.mime_type then raise check_violation using message='Uploaded file metadata not confirmed'; end if;
 update public.knowledge_versions set state='ready' where id=v.id;
 update public.knowledge_documents set revision=revision+1,updated_at=clock_timestamp() where id=d.id;
 insert into public.knowledge_events(document_id,version_id,actor_id,event) values(d.id,v.id,auth.uid(),'upload_completed');
end; $$;

create or replace function public.cancel_knowledge_upload(p_version uuid)
returns void language plpgsql security definer set search_path='' as $$ declare v public.knowledge_versions; d public.knowledge_documents; begin
 select * into v from public.knowledge_versions where id=p_version;
 select * into d from public.knowledge_documents where id=v.document_id for update;
 select * into v from public.knowledge_versions where id=p_version for update;
 if v.id is null or not (app_private.knowledge_manager(d.studio_id) or (v.created_by=auth.uid() and app_private.knowledge_contribute(v.document_id))) then raise insufficient_privilege using message='Upload cancellation not granted'; end if;
 if v.state<>'uploading' or v.published_at is not null or exists(select 1 from storage.objects where bucket_id='team-knowledge' and name=v.object_path) then raise check_violation using message='Remove unfinished Storage object first; ready versions are preserved'; end if;
 insert into public.knowledge_events(document_id,actor_id,event) values(d.id,auth.uid(),'unfinished_upload_cancelled');
 delete from public.knowledge_events where version_id=v.id;
 delete from public.knowledge_versions where id=v.id;
 update public.knowledge_documents set revision=revision+1,updated_at=clock_timestamp() where id=d.id;
end; $$;

create or replace function public.publish_knowledge_version(p_document uuid,p_version uuid,p_expected_revision integer)
returns void language plpgsql security definer set search_path='' as $$ declare d public.knowledge_documents; v public.knowledge_versions; begin
 select * into d from public.knowledge_documents where id=p_document for update;
 if not found or not app_private.knowledge_manager(d.studio_id) then raise insufficient_privilege using message='Document publication requires its studio manager'; end if;
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
 if d.revision is distinct from p_expected_revision then raise serialization_failure using message='Document revision changed'; end if;
 if p_archived is null or p_roles is null or cardinality(p_roles)=0 or exists(select 1 from unnest(p_roles) r where r is null or r not in ('admin','studio_manager','employee')) then raise check_violation using message='Invalid document access'; end if;
 update public.knowledge_documents set studio_id=p_studio,reader_roles=p_roles,archived=p_archived,revision=revision+1,updated_at=clock_timestamp() where id=d.id;
 insert into public.knowledge_events(document_id,actor_id,event) values(d.id,auth.uid(),'access_updated');
end; $$;

create or replace function public.search_knowledge(p_query text default '',p_studio uuid default null,p_category text default '',p_state text default 'published',p_page integer default 0,p_size integer default 20)
returns jsonb language plpgsql stable security invoker set search_path='' as $$ declare result jsonb; begin
 if p_query is null or length(p_query)>300 or p_page is null or p_page not between 0 and 10000 or p_size is null or p_size not between 1 and 50 or p_state is null or p_state not in ('all','published','draft','archived','review') then raise check_violation using message='Invalid knowledge search'; end if;
 with scoped as (
  select d.id,d.title,d.summary,d.category,d.tags,d.studio_id,d.reader_roles,d.created_by,d.published_version_id,d.archived,d.revision,d.updated_at,
   left(d.search_text,220) as excerpt,
   (select count(*) from public.knowledge_versions v where v.document_id=d.id and v.published_at is null and v.state='ready') as review_count
  from public.knowledge_documents d
  where (p_studio is null or d.studio_id=p_studio or d.studio_id is null) and (p_category='' or d.category=p_category)
   and (trim(p_query)='' or d.search_vector@@websearch_to_tsquery('german'::regconfig,p_query))
   and case p_state when 'published' then d.published_version_id is not null and not d.archived when 'draft' then d.published_version_id is null and not d.archived when 'archived' then d.archived when 'review' then not d.archived and exists(select 1 from public.knowledge_versions v where v.document_id=d.id and v.published_at is null and v.state='ready') else not d.archived end
 ), paged as (select * from scoped order by updated_at desc,id offset p_page*p_size limit p_size)
 select jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from paged p),'total',(select count(*) from scoped)) into result;
 return result;
end; $$;

revoke all on public.knowledge_documents,public.knowledge_versions,public.knowledge_events from public,anon,authenticated;
grant select on public.knowledge_documents,public.knowledge_versions,public.knowledge_events to authenticated;
revoke all on all functions in schema app_private from public;
grant execute on all functions in schema app_private to authenticated;
revoke all on function public.prepare_knowledge_version(uuid,integer,text,text,text,text[],uuid,text[],text,text,text,bigint,text),public.finish_knowledge_upload(uuid),public.cancel_knowledge_upload(uuid),public.publish_knowledge_version(uuid,uuid,integer),public.set_knowledge_access(uuid,integer,uuid,text[],boolean),public.search_knowledge(text,uuid,text,text,integer,integer) from public,anon;
grant execute on function public.prepare_knowledge_version(uuid,integer,text,text,text,text[],uuid,text[],text,text,text,bigint,text),public.finish_knowledge_upload(uuid),public.cancel_knowledge_upload(uuid),public.publish_knowledge_version(uuid,uuid,integer),public.set_knowledge_access(uuid,integer,uuid,text[],boolean),public.search_knowledge(text,uuid,text,text,integer,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
