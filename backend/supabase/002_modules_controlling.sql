-- Apply after 001_team.sql. No demo employee or learning data is imported.
begin;

create table if not exists public.module_permissions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_publish boolean not null default false,
  check ((not can_create and not can_publish) or can_edit)
);
create table if not exists public.custom_modules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  revision integer not null default 1,
  published_version_id uuid,
  updated_at timestamptz not null default now()
);
create table if not exists public.module_drafts (
  module_id uuid primary key references public.custom_modules(id) on delete cascade,
  schema jsonb not null
);
create table if not exists public.module_versions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.custom_modules(id),
  version integer not null,
  schema jsonb not null,
  published_by uuid not null references public.profiles(id),
  published_at timestamptz not null default now(),
  unique(module_id,version)
);
do $$ begin
  if not exists(select 1 from pg_constraint where conname='custom_modules_published_fk' and conrelid='public.custom_modules'::regclass) then
    alter table public.custom_modules add constraint custom_modules_published_fk foreign key(published_version_id) references public.module_versions(id);
  end if;
end $$;
create table if not exists public.module_records (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.custom_modules(id),
  version_id uuid not null references public.module_versions(id),
  studio_id uuid not null references public.studios(id),
  entity_id uuid,
  data jsonb not null,
  revision integer not null default 1,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists module_records_module_studio on public.module_records(module_id,studio_id);

create or replace function app_private.design_right(permission text)
returns boolean language sql stable security definer set search_path='' as $$
 select app_private.is_active() and (app_private.is_admin() or exists(select 1 from public.module_permissions p where p.user_id=auth.uid() and case permission when 'create' then p.can_create when 'edit' then p.can_edit when 'publish' then p.can_publish else false end));
$$;
create or replace function app_private.assert_module_schema(s jsonb, publishing boolean)
returns void language plpgsql set search_path='' as $$
declare f jsonb; r text; name text; labels text[] := '{}'; ids text[] := '{}';
begin
 if jsonb_typeof(s)<>'object' or jsonb_typeof(s->'title')<>'string' or length(trim(s->>'title')) not between 1 and 80 or length(coalesce(s->>'description',''))>2000 then raise check_violation using message='Invalid module title or description'; end if;
 if coalesce(s->>'target','') not in ('standalone','tasks','equipment','inventory','team','crm','marketing','knowledge','contacts') then raise check_violation using message='Unsupported module target'; end if;
 if jsonb_typeof(s->'studios') is distinct from 'array' or jsonb_typeof(s->'readerRoles') is distinct from 'array' or jsonb_typeof(s->'writerRoles') is distinct from 'array' or jsonb_typeof(s->'fields') is distinct from 'array' then raise check_violation using message='Invalid module collections'; end if;
 if jsonb_array_length(s->'studios')=0 or jsonb_array_length(s->'readerRoles')=0 or jsonb_array_length(s->'fields')>30 or (publishing and jsonb_array_length(s->'fields')=0) then raise check_violation using message='Missing module studios, readers or fields'; end if;
 for r in select jsonb_array_elements_text(s->'readerRoles') union select jsonb_array_elements_text(s->'writerRoles') loop if r not in ('admin','studio_manager','employee') then raise check_violation using message='Invalid module role'; end if; end loop;
 for r in select jsonb_array_elements_text(s->'writerRoles') loop if not (s->'readerRoles' ? r) then raise check_violation using message='Writers must also be readers'; end if; end loop;
 for r in select jsonb_array_elements_text(s->'studios') loop if r<>'Alle Studios' and not exists(select 1 from public.studios where public.studios.name=r) then raise check_violation using message='Unknown studio'; end if; end loop;
 for f in select jsonb_array_elements(s->'fields') loop
   if coalesce(f->>'id','')!~'^[A-Za-z0-9_-]{1,80}$' or f->>'id'=any(ids) or coalesce(f->>'type','') not in ('text','textarea','number','date','select','checkbox','member','file') then raise check_violation using message='Invalid field identifier or type'; end if;
   ids:=array_append(ids,f->>'id'); name:=lower(trim(coalesce(f->>'label','')));
   if publishing and (jsonb_typeof(f->'label') is distinct from 'string' or length(name) not between 1 and 80 or name=any(labels)) then raise check_violation using message='Field names must be nonempty and unique'; end if; labels:=array_append(labels,name);
   if jsonb_typeof(f->'required') is distinct from 'boolean' then raise check_violation using message='Required must be a boolean'; end if;
   if publishing and f->>'type'='select' then
     if jsonb_typeof(f->'options') is distinct from 'array' then raise check_violation using message='Missing selection options'; end if;
     if jsonb_array_length(f->'options')=0 or jsonb_array_length(f->'options')>100 or exists(select 1 from jsonb_array_elements(f->'options') o where jsonb_typeof(o) is distinct from 'string' or length(trim(o#>>'{}')) not between 1 and 100) or (select count(*)<>count(distinct o) from jsonb_array_elements_text(f->'options') o) then raise check_violation using message='Invalid selection options'; end if;
   end if;
 end loop;
end;
$$;
create or replace function app_private.module_read(mid uuid, site uuid default null)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare s jsonb; member_role text; site_name text;
begin
 if not app_private.is_active() then return false; end if;
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
create or replace function app_private.module_entity_read(mid uuid, site uuid, entity uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare target text;
begin
 select v.schema->>'target' into target from public.custom_modules m join public.module_versions v on v.id=m.published_version_id where m.id=mid;
 if target='standalone' then return entity is null; end if;
 if target='tasks' then return exists(select 1 from public.tasks t where t.id=entity and t.studio_id=site and app_private.can_view_task(t.studio_id,t.assignee_id)); end if;
 -- Other core modules are still local demonstrations, not authenticated tables.
 return false;
end;
$$;

alter table public.module_permissions enable row level security;
alter table public.custom_modules enable row level security;
alter table public.module_drafts enable row level security;
alter table public.module_versions enable row level security;
alter table public.module_records enable row level security;
drop policy if exists module_permissions_read on public.module_permissions;
create policy module_permissions_read on public.module_permissions for select to authenticated using(app_private.is_active() and (user_id=auth.uid() or app_private.is_admin()));
drop policy if exists module_permissions_admin on public.module_permissions;
create policy module_permissions_admin on public.module_permissions for all to authenticated using(app_private.is_admin()) with check(app_private.is_admin());
drop policy if exists custom_modules_read on public.custom_modules;
create policy custom_modules_read on public.custom_modules for select to authenticated using(app_private.design_right('edit') or app_private.module_read(id));
drop policy if exists module_drafts_read on public.module_drafts;
create policy module_drafts_read on public.module_drafts for select to authenticated using(app_private.design_right('edit'));
drop policy if exists module_versions_read on public.module_versions;
create policy module_versions_read on public.module_versions for select to authenticated using(app_private.design_right('edit') or app_private.module_read(module_id));
drop policy if exists module_records_read on public.module_records;
create policy module_records_read on public.module_records for select to authenticated using(app_private.module_read(module_id,studio_id) and app_private.module_entity_read(module_id,studio_id,entity_id));

create or replace function public.save_module_draft(p_module_id uuid,p_schema jsonb,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.custom_modules; target text;
begin
 perform app_private.assert_module_schema(p_schema,false);
 if p_module_id is null then
   if not app_private.design_right('create') then raise insufficient_privilege using message='Module creation not granted'; end if;
   insert into public.custom_modules(owner_id) values(auth.uid()) returning * into m;
 else
   if not app_private.design_right('edit') then raise insufficient_privilege using message='Module editing not granted'; end if;
   select * into m from public.custom_modules where id=p_module_id for update;
   if not found or m.revision is distinct from p_expected_revision then raise serialization_failure using message='Module revision changed'; end if;
   if m.published_version_id is not null then select schema->>'target' into target from public.module_versions where id=m.published_version_id; if target<>p_schema->>'target' then raise check_violation using message='Published module target is immutable'; end if; end if;
   update public.custom_modules set revision=revision+1,updated_at=clock_timestamp() where id=m.id returning * into m;
 end if;
 insert into public.module_drafts(module_id,schema) values(m.id,p_schema) on conflict(module_id) do update set schema=excluded.schema;
 return jsonb_build_object('id',m.id,'revision',m.revision);
end;
$$;
create or replace function public.publish_module(p_module_id uuid,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.custom_modules; s jsonb; vid uuid; number integer;
begin
 if not app_private.design_right('publish') then raise insufficient_privilege using message='Module publication not granted'; end if;
 select * into m from public.custom_modules where id=p_module_id for update;
 if not found or m.revision is distinct from p_expected_revision then raise serialization_failure using message='Module revision changed'; end if;
 select schema into s from public.module_drafts where module_id=m.id;
 if s is null then raise check_violation using message='No saved draft'; end if;
 perform app_private.assert_module_schema(s,true);
 select coalesce(max(version),0)+1 into number from public.module_versions where module_id=m.id;
 insert into public.module_versions(module_id,version,schema,published_by) values(m.id,number,s,auth.uid()) returning id into vid;
 update public.custom_modules set published_version_id=vid,revision=revision+1,updated_at=clock_timestamp() where id=m.id returning * into m;
 delete from public.module_drafts where module_id=m.id;
 return jsonb_build_object('id',m.id,'revision',m.revision,'published_version_id',vid);
end;
$$;
create or replace function public.release_module(p_module_id uuid,p_schema jsonb,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$ declare saved jsonb; begin
 if not app_private.design_right('publish') then raise insufficient_privilege using message='Module publication not granted'; end if;
 saved:=public.save_module_draft(p_module_id,p_schema,p_expected_revision);
 return public.publish_module((saved->>'id')::uuid,(saved->>'revision')::integer);
end; $$;
create or replace function public.restore_module_version(p_module_id uuid,p_version_id uuid,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb; saved jsonb;
begin
 if not app_private.design_right('publish') then raise insufficient_privilege using message='Module publication not granted'; end if;
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

alter table public.tasks add column if not exists completed_by uuid references public.profiles(id);
create or replace function app_private.stamp_task_completion()
returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.status='done' then
   if tg_op='UPDATE' and old.status='done' then new.completed_by:=old.completed_by; else new.completed_by:=auth.uid(); end if;
 else new.completed_by:=null; end if;
 return new;
end; $$;
drop trigger if exists task_completion_actor on public.tasks;
create trigger task_completion_actor before insert or update on public.tasks for each row execute function app_private.stamp_task_completion();

-- Learning outcomes are separate: self-reported reading, assessed knowledge,
-- and a practical confirmation made by an administrator.
create table if not exists public.learning_courses(id uuid primary key default gen_random_uuid(),title text not null,lesson_count integer not null check(lesson_count between 1 and 500),active boolean not null default true);
create table if not exists public.learning_assignments(id uuid primary key default gen_random_uuid(),learner_id uuid not null references public.profiles(id),course_id uuid not null references public.learning_courses(id),studio_id uuid not null references public.studios(id),due_date date,requires_practice boolean not null default false,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),unique(learner_id,course_id));
create table if not exists public.learning_progress(assignment_id uuid primary key references public.learning_assignments(id),lessons_read integer not null default 0,quiz_passed boolean not null default false,practice_confirmed boolean not null default false,confirmed_by uuid references public.profiles(id),confirmed_at timestamptz,updated_at timestamptz not null default now());
create table if not exists public.learning_events(id uuid primary key default gen_random_uuid(),assignment_id uuid not null references public.learning_assignments(id),actor_id uuid not null references public.profiles(id),event text not null,notes text not null default '',at timestamptz not null default now());
create or replace function app_private.learning_read(aid uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.is_active() and (app_private.is_admin() or exists(select 1 from public.learning_assignments a where a.id=aid and a.learner_id=auth.uid() and app_private.has_studio(a.studio_id))); $$;
alter table public.learning_courses enable row level security;
alter table public.learning_assignments enable row level security;
alter table public.learning_progress enable row level security;
alter table public.learning_events enable row level security;
drop policy if exists learning_courses_read on public.learning_courses;
create policy learning_courses_read on public.learning_courses for select to authenticated using(app_private.is_admin() or exists(select 1 from public.learning_assignments a where a.course_id=learning_courses.id and app_private.learning_read(a.id)));
drop policy if exists learning_courses_admin on public.learning_courses;
create policy learning_courses_admin on public.learning_courses for all to authenticated using(app_private.is_admin()) with check(app_private.is_admin());
drop policy if exists learning_assignments_read on public.learning_assignments;
create policy learning_assignments_read on public.learning_assignments for select to authenticated using(app_private.learning_read(id));
drop policy if exists learning_progress_read on public.learning_progress;
create policy learning_progress_read on public.learning_progress for select to authenticated using(app_private.learning_read(assignment_id));
drop policy if exists learning_events_read on public.learning_events;
create policy learning_events_read on public.learning_events for select to authenticated using(app_private.learning_read(assignment_id));

create or replace function public.create_learning_assignment(p_learner uuid,p_course uuid,p_studio uuid,p_due date,p_practice boolean)
returns uuid language plpgsql security definer set search_path='' as $$ declare aid uuid; begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 if not app_private.valid_assignee(p_learner,p_studio) or not exists(select 1 from public.learning_courses where id=p_course and active) then raise check_violation using message='Invalid learner, studio or course'; end if;
 insert into public.learning_assignments(learner_id,course_id,studio_id,due_date,requires_practice,created_by) values(p_learner,p_course,p_studio,p_due,p_practice,auth.uid()) returning id into aid;
 insert into public.learning_progress(assignment_id) values(aid); return aid; end; $$;
create or replace function public.report_learning_reads(p_assignment uuid,p_count integer)
returns void language plpgsql security definer set search_path='' as $$ declare a public.learning_assignments; maximum integer; begin
 select * into a from public.learning_assignments where id=p_assignment;
 if a.id is null or not app_private.learning_read(p_assignment) or a.learner_id<>auth.uid() then raise insufficient_privilege using message='Own learning assignment required'; end if;
 select lesson_count into maximum from public.learning_courses where id=a.course_id;
 if p_count<0 or p_count>maximum then raise check_violation using message='Invalid reading count'; end if;
 update public.learning_progress set lessons_read=greatest(lessons_read,p_count),updated_at=clock_timestamp() where assignment_id=p_assignment;
 end; $$;
create or replace function public.record_learning_assessment(p_assignment uuid,p_passed boolean,p_notes text default '')
returns void language plpgsql security definer set search_path='' as $$ declare count_read integer; maximum integer; begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 select p.lessons_read,c.lesson_count into count_read,maximum from public.learning_progress p join public.learning_assignments a on a.id=p.assignment_id join public.learning_courses c on c.id=a.course_id where a.id=p_assignment;
 if maximum is null or (p_passed and count_read<>maximum) or length(p_notes)>2000 then raise check_violation using message='Reading incomplete or invalid assessment'; end if;
 update public.learning_progress set quiz_passed=p_passed,practice_confirmed=case when p_passed then practice_confirmed else false end,confirmed_by=case when p_passed then confirmed_by else null end,confirmed_at=case when p_passed then confirmed_at else null end,updated_at=clock_timestamp() where assignment_id=p_assignment;
 insert into public.learning_events(assignment_id,actor_id,event,notes) values(p_assignment,auth.uid(),case when p_passed then 'Knowledge assessment passed' else 'Knowledge assessment not passed' end,p_notes);
 end; $$;
create or replace function public.confirm_learning_practice(p_assignment uuid,p_notes text default '')
returns void language plpgsql security definer set search_path='' as $$ declare ready boolean; begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 select p.quiz_passed and p.lessons_read=c.lesson_count and a.requires_practice and not p.practice_confirmed into ready from public.learning_progress p join public.learning_assignments a on a.id=p.assignment_id join public.learning_courses c on c.id=a.course_id where a.id=p_assignment for update of p;
 if ready is distinct from true or length(p_notes)>2000 then raise check_violation using message='Learning prerequisites missing or practice already confirmed'; end if;
 update public.learning_progress set practice_confirmed=true,confirmed_by=auth.uid(),confirmed_at=clock_timestamp(),updated_at=clock_timestamp() where assignment_id=p_assignment;
 insert into public.learning_events(assignment_id,actor_id,event,notes) values(p_assignment,auth.uid(),'Practical instruction confirmed',p_notes);
 end; $$;
create or replace function public.admin_controlling()
returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Controlling requires an administrator'; end if;
 return jsonb_build_object('profiles',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from public.profiles p),'studios',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from public.studios s),'tasks',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.tasks t),'courses',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from public.learning_courses c),'assignments',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.learning_assignments a),'progress',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from public.learning_progress p));
 end; $$;

revoke all on public.module_permissions,public.custom_modules,public.module_drafts,public.module_versions,public.module_records,public.learning_courses,public.learning_assignments,public.learning_progress,public.learning_events from anon,authenticated;
grant select on public.module_permissions,public.custom_modules,public.module_drafts,public.module_versions,public.module_records,public.learning_courses,public.learning_assignments,public.learning_progress,public.learning_events to authenticated;
grant insert,update,delete on public.module_permissions to authenticated;
grant insert,update on public.learning_courses to authenticated;
revoke all on all functions in schema app_private from public;
grant execute on all functions in schema app_private to authenticated;
revoke all on function public.save_module_draft(uuid,jsonb,integer),public.publish_module(uuid,integer),public.release_module(uuid,jsonb,integer),public.restore_module_version(uuid,uuid,integer),public.save_module_record(uuid,uuid,uuid,jsonb,uuid,integer,uuid),public.create_learning_assignment(uuid,uuid,uuid,date,boolean),public.report_learning_reads(uuid,integer),public.record_learning_assessment(uuid,boolean,text),public.confirm_learning_practice(uuid,text),public.admin_controlling() from public,anon;
grant execute on function public.save_module_draft(uuid,jsonb,integer),public.publish_module(uuid,integer),public.release_module(uuid,jsonb,integer),public.restore_module_version(uuid,uuid,integer),public.save_module_record(uuid,uuid,uuid,jsonb,uuid,integer,uuid),public.create_learning_assignment(uuid,uuid,uuid,date,boolean),public.report_learning_reads(uuid,integer),public.record_learning_assessment(uuid,boolean,text),public.confirm_learning_practice(uuid,text),public.admin_controlling() to authenticated;
commit;
