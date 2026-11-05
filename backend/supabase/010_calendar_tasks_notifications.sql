-- Kalender, private/wiederkehrende Aufgaben, Gerätewartung und Benachrichtigungen.
-- Nach 001–009 vollständig in einer neuen Supabase-SQL-Abfrage ausführen.
begin;
create or replace function app_private.function_catalog() returns table(key text,label text,page text,roles text[],requires text[]) language sql immutable set search_path='' as $$ select key,label,page,roles,requires from jsonb_to_recordset('[{"group": "Aufgaben", "key": "tasks.team", "label": "Teamaufgaben ansehen", "page": "tasks", "roles": ["studio_manager"], "requires": []}, {"group": "Aufgaben", "key": "tasks.create", "label": "Aufgaben erstellen", "page": "tasks", "roles": ["studio_manager"], "requires": []}, {"group": "Aufgaben", "key": "tasks.edit", "label": "Aufgabentext, Frist und Priorität bearbeiten", "page": "tasks", "roles": ["studio_manager"], "requires": []}, {"group": "Aufgaben", "key": "tasks.assign", "label": "Aufgaben anderen Mitarbeitern zuweisen", "page": "tasks", "roles": ["studio_manager"], "requires": ["tasks.team"]}, {"group": "Aufgaben", "key": "tasks.status", "label": "Status eigener Aufgaben ändern", "page": "tasks", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Aufgaben", "key": "tasks.team_status", "label": "Status von Teamaufgaben ändern", "page": "tasks", "roles": ["studio_manager"], "requires": ["tasks.team"]}, {"group": "Aufgaben", "key": "tasks.comment", "label": "Aufgaben kommentieren", "page": "tasks", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Lernhub", "key": "learning.read", "label": "Eigene Lektionen lesen und bestätigen", "page": "learning", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Lernhub", "key": "learning.quiz", "label": "Eigene Quizfragen beantworten", "page": "learning", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Lernhub", "key": "learning.courses", "label": "Kurse erstellen", "page": "learning", "roles": [], "requires": []}, {"group": "Lernhub", "key": "learning.assign", "label": "Kurse zuweisen", "page": "learning", "roles": [], "requires": []}, {"group": "Lernhub", "key": "learning.practice", "label": "Praxiseinweisungen bestätigen", "page": "learning", "roles": [], "requires": []}, {"group": "Lernhub", "key": "learning.assess", "label": "Externe Wissensprüfungen dokumentieren", "page": "learning", "roles": [], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.read", "label": "Freigegebene Inhalte und Originaldateien öffnen", "page": "knowledge", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.article", "label": "Wissensartikel anlegen", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.upload", "label": "Dateien hochladen", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.edit", "label": "Eigene Inhalte bearbeiten", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.team", "label": "Inhalte anderer Mitarbeiter bearbeiten", "page": "files", "roles": ["studio_manager"], "requires": ["knowledge.edit"]}, {"group": "Dateien & Wissen", "key": "knowledge.publish", "label": "Inhalte veröffentlichen", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.access", "label": "Leserrollen und Standortfreigaben ändern", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.archive", "label": "Inhalte archivieren", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.cleanup", "label": "Unvollständige Uploads anderer Mitarbeiter bereinigen", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Modulbaukasten", "key": "modules.create", "label": "Neue Module erstellen", "page": "builder", "roles": [], "requires": ["modules.edit"]}, {"group": "Modulbaukasten", "key": "modules.edit", "label": "Modulaufbau bearbeiten", "page": "builder", "roles": [], "requires": []}, {"group": "Modulbaukasten", "key": "modules.publish", "label": "Modulversionen veröffentlichen", "page": "builder", "roles": [], "requires": ["modules.edit"]}, {"group": "Modulbaukasten", "key": "modules.restore", "label": "Frühere Modulversion wiederherstellen", "page": "builder", "roles": [], "requires": ["modules.publish"]}, {"group": "Modulbaukasten", "key": "modules.records", "label": "Freigegebene Moduleinträge speichern", "page": "modules", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Startseite", "key": "home.create", "label": "Startseiteneinträge anlegen", "page": "dashboard", "roles": [], "requires": []}, {"group": "Startseite", "key": "home.edit", "label": "Startseiteneinträge bearbeiten", "page": "dashboard", "roles": [], "requires": []}, {"group": "Startseite", "key": "home.publish", "label": "Startseiteneinträge veröffentlichen", "page": "dashboard", "roles": [], "requires": []}, {"group": "Startseite", "key": "home.archive", "label": "Startseiteneinträge ausblenden", "page": "dashboard", "roles": [], "requires": []}, {"group": "Chat", "key": "chat.send", "label": "Nachrichten senden", "page": "chat", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Chat", "key": "chat.channels", "label": "Studioübergreifende Chatkanäle verwalten", "page": "chat", "roles": [], "requires": []}, {"group": "Feedback", "key": "feedback.submit", "label": "Eigenes Feedback abgeben und verfolgen", "page": "feedback", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Feedback", "key": "feedback.manage", "label": "Feedback des eigenen Studios bearbeiten", "page": "feedback", "roles": [], "requires": []}, {"group": "Feedback", "key": "feedback.reassign", "label": "Zuständigkeit einer Meldung ändern", "page": "feedback", "roles": [], "requires": ["feedback.manage"]}, {"group": "Feedback", "key": "feedback.routes", "label": "Feedback-Zuständigkeiten festlegen", "page": "feedback", "roles": [], "requires": []}, {"group": "Nutzerverwaltung", "key": "users.view", "label": "Mitarbeiterprofile ansehen", "page": "access", "roles": [], "requires": []}, {"group": "Nutzerverwaltung", "key": "users.invite", "label": "Einzelne Mitarbeiter einladen", "page": "access", "roles": [], "requires": ["users.view"]}, {"group": "Nutzerverwaltung", "key": "users.import", "label": "Mitarbeiter per CSV oder Excel importieren", "page": "access", "roles": [], "requires": ["users.invite"]}, {"group": "Nutzerverwaltung", "key": "users.profile", "label": "Berufliche Profilinformationen bearbeiten", "page": "access", "roles": [], "requires": ["users.view"]}, {"group": "Nutzerverwaltung", "key": "users.access", "label": "Zugänge sperren und Studiozuordnungen verwalten", "page": "access", "roles": [], "requires": ["users.view"]}, {"group": "Nutzerverwaltung", "key": "users.login", "label": "Anmeldelinks anfordern", "page": "access", "roles": [], "requires": ["users.view"]}, {"group": "Controlling", "key": "controlling.view", "label": "Controlling für eigene Studios ansehen", "page": "controlling", "roles": [], "requires": []}, {"group": "Controlling", "key": "controlling.export", "label": "Controlling als CSV exportieren", "page": "controlling", "roles": [], "requires": ["controlling.view"]}, {"group": "Aufgaben", "key": "tasks.private", "label": "Private Aufgaben für mich erstellen und bearbeiten", "page": "tasks", "roles": ["employee", "studio_manager"], "requires": [], "since": 10}, {"group": "Aufgaben", "key": "tasks.repeat", "label": "Wiederkehrende Aufgaben anlegen", "page": "tasks", "roles": ["employee", "studio_manager"], "requires": [], "since": 10}, {"group": "Kalender", "key": "calendar.create", "label": "Eigene Termine anlegen und bearbeiten", "page": "calendar", "roles": ["employee", "studio_manager"], "requires": [], "since": 10}, {"group": "Kalender", "key": "calendar.team", "label": "Termine für das Studio anlegen und bearbeiten", "page": "calendar", "roles": ["studio_manager"], "requires": ["calendar.create"], "since": 10}, {"group": "Gerätewartung", "key": "maintenance.manage", "label": "Gerätewartungen planen und bearbeiten", "page": "calendar", "roles": ["studio_manager"], "requires": ["tasks.create", "tasks.assign", "tasks.repeat"], "since": 10}]'::jsonb) as c(key text,label text,page text,roles text[],requires text[]); $$;
create or replace function public.team_access_context()
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare p public.profiles; a public.team_page_access; begin
 select * into p from public.profiles where id=auth.uid() and active;
 if not found then raise insufficient_privilege using message='Active employee required'; end if;
 select * into a from public.team_page_access where user_id=p.id;
 return jsonb_build_object('version',10,'pages',case when p.role='admin' then app_private.default_team_pages('admin') else coalesce(a.pages,app_private.default_team_pages(p.role)) end,'can_design',app_private.design_right('edit'),'capabilities',app_private.function_effective(p.id));
end; $$;

alter table public.tasks add column if not exists private boolean not null default false;
alter table public.tasks add column if not exists repeat_unit text not null default 'none' check(repeat_unit in ('none','day','week','month','year'));
alter table public.tasks add column if not exists repeat_every integer not null default 1 check(repeat_every between 1 and 120);
alter table public.tasks add column if not exists repeat_anchor integer check(repeat_anchor between 1 and 31);
alter table public.tasks add column if not exists previous_task_id uuid references public.tasks(id);
create unique index if not exists tasks_one_successor on public.tasks(previous_task_id) where previous_task_id is not null;
create index if not exists tasks_pending_due on public.tasks(due_date,assignee_id) where status<>'done';

create table if not exists public.maintenance_plans(
 id uuid primary key default gen_random_uuid(),
 device text not null check(length(trim(device)) between 1 and 170),
 serial text not null default '' check(length(serial)<=120),
 instructions text not null default '' check(length(instructions)<=5000),
 studio_id uuid not null references public.studios(id),
 assignee_id uuid not null references public.profiles(id),
 due_date date not null,
 interval_months integer not null default 6 check(interval_months between 1 and 120),
 created_by uuid not null default auth.uid() references public.profiles(id),
 updated_at timestamptz not null default now()
);
alter table public.tasks add column if not exists maintenance_plan_id uuid references public.maintenance_plans(id);
create index if not exists tasks_maintenance on public.tasks(maintenance_plan_id) where maintenance_plan_id is not null;
alter table public.maintenance_plans enable row level security;
drop policy if exists maintenance_read on public.maintenance_plans;
create policy maintenance_read on public.maintenance_plans for select to authenticated using(app_private.function_studio('maintenance.manage',studio_id));
revoke all on public.maintenance_plans from public,anon,authenticated;
grant select on public.maintenance_plans to authenticated;

create or replace function app_private.task_visible(t public.tasks)
returns boolean language sql stable security definer set search_path='' as $$
 select app_private.can_view_task(t.studio_id,t.assignee_id) and (not t.private or (t.created_by=auth.uid() and t.assignee_id=auth.uid()));
$$;
drop policy if exists tasks_private_guard on public.tasks;
create policy tasks_private_guard on public.tasks as restrictive for all to authenticated using(not private or (created_by=auth.uid() and assignee_id=auth.uid())) with check(not private or (created_by=auth.uid() and assignee_id=auth.uid()));
drop policy if exists tasks_create on public.tasks;
create policy tasks_create on public.tasks for insert to authenticated with check(created_by=auth.uid() and app_private.valid_assignee(assignee_id,studio_id) and ((private and assignee_id=auth.uid() and app_private.function_studio('tasks.private',studio_id)) or (not private and app_private.function_studio('tasks.create',studio_id))));
drop policy if exists comments_read on public.task_comments;
create policy comments_read on public.task_comments for select to authenticated using(exists(select 1 from public.tasks t where t.id=task_id and app_private.task_visible(t)));
drop policy if exists comments_insert on public.task_comments;
create policy comments_insert on public.task_comments for insert to authenticated with check(author_id=auth.uid() and app_private.has_function('tasks.comment') and exists(select 1 from public.tasks t where t.id=task_id and app_private.task_visible(t)));

create or replace function app_private.next_task_date(d date,u text,n integer,anchor integer)
returns date language sql immutable set search_path='' as $$
 select case u when 'day' then d+n when 'week' then d+7*n
 when 'month' then (date_trunc('month',d)+make_interval(months=>n))::date + least(anchor,extract(day from date_trunc('month',d)+make_interval(months=>n+1)-interval '1 day')::integer)-1
 when 'year' then (date_trunc('month',d)+make_interval(years=>n))::date + least(anchor,extract(day from date_trunc('month',d)+make_interval(years=>n,months=>1)-interval '1 day')::integer)-1 end;
$$;

create or replace function app_private.guard_task()
returns trigger language plpgsql security definer set search_path='' as $$
declare parent public.tasks; plan public.maintenance_plans; internal_copy boolean:=false; internal_plan boolean:=false; own_private boolean;
begin
 if not app_private.is_active() then raise insufficient_privilege using message='Active employee required'; end if;
 if tg_op='INSERT' and pg_trigger_depth()>1 and new.previous_task_id is not null then
  select * into parent from public.tasks where id=new.previous_task_id;
  internal_copy:=parent.id is not null and parent.status='done' and parent.repeat_unit<>'none' and row(new.title,new.description,new.studio_id,new.assignee_id,new.private,new.repeat_unit,new.repeat_every,new.repeat_anchor,new.maintenance_plan_id,new.due_date) is not distinct from row(parent.title,parent.description,parent.studio_id,parent.assignee_id,parent.private,parent.repeat_unit,parent.repeat_every,parent.repeat_anchor,parent.maintenance_plan_id,app_private.next_task_date(parent.due_date,parent.repeat_unit,parent.repeat_every,parent.repeat_anchor));
 end if;
 if pg_trigger_depth()>1 and new.maintenance_plan_id is not null then
  select * into plan from public.maintenance_plans where id=new.maintenance_plan_id;
  internal_plan:=plan.id is not null and app_private.function_studio('maintenance.manage',plan.studio_id) and not new.private and row(new.title,new.description,new.studio_id,new.assignee_id,new.due_date,new.repeat_unit,new.repeat_every) is not distinct from row('Wartung: '||plan.device,plan.instructions,plan.studio_id,plan.assignee_id,plan.due_date,'month'::text,plan.interval_months);
 end if;
 if tg_op='INSERT' then
  if not internal_copy and not internal_plan then
   if new.previous_task_id is not null or new.maintenance_plan_id is not null then raise insufficient_privilege using message='Linked tasks are server managed'; end if;
   if new.private then
    if new.assignee_id<>auth.uid() or not app_private.function_studio('tasks.private',new.studio_id) then raise insufficient_privilege using message='Private task permission required'; end if;
   else
    if not app_private.function_studio('tasks.create',new.studio_id) then raise insufficient_privilege using message='Task creation requires a manager';end if;
    if new.assignee_id<>auth.uid() and not app_private.function_studio('tasks.assign',new.studio_id) then raise insufficient_privilege using message='Task assignment not granted';end if;
   end if;
   if new.repeat_unit<>'none' and not app_private.has_function('tasks.repeat') then raise insufficient_privilege using message='Task repetition not granted'; end if;
  end if;
  new.created_by:=case when internal_copy then parent.created_by else auth.uid() end;
  new.created_at:=clock_timestamp();
  new.repeat_anchor:=case when internal_copy then parent.repeat_anchor else extract(day from new.due_date)::integer end;
 else
  if not app_private.task_visible(old) then raise insufficient_privilege using message='Task not granted'; end if;
  if row(new.private,new.previous_task_id,new.maintenance_plan_id) is distinct from row(old.private,old.previous_task_id,old.maintenance_plan_id) then raise insufficient_privilege using message='Task visibility and links are immutable'; end if;
  own_private:=old.private and old.created_by=auth.uid() and app_private.function_studio('tasks.private',old.studio_id);
  if not own_private and not internal_plan and not (app_private.function_studio('tasks.edit',old.studio_id) and app_private.function_studio('tasks.edit',new.studio_id)) and row(new.title,new.description,new.due_date,new.priority,new.repeat_unit,new.repeat_every) is distinct from row(old.title,old.description,old.due_date,old.priority,old.repeat_unit,old.repeat_every) then raise insufficient_privilege using message='Employees can change only task status'; end if;
  if not internal_plan and row(new.studio_id,new.assignee_id) is distinct from row(old.studio_id,old.assignee_id) and (old.private or not (app_private.function_studio('tasks.assign',old.studio_id) and app_private.function_studio('tasks.assign',new.studio_id))) then raise insufficient_privilege using message='Task assignment not granted'; end if;
  if not internal_plan and row(new.repeat_unit,new.repeat_every) is distinct from row(old.repeat_unit,old.repeat_every) and not app_private.has_function('tasks.repeat') then raise insufficient_privilege using message='Task repetition not granted'; end if;
  if old.maintenance_plan_id is not null and not internal_plan and row(new.title,new.description,new.due_date,new.repeat_unit,new.repeat_every,new.studio_id,new.assignee_id) is distinct from row(old.title,old.description,old.due_date,old.repeat_unit,old.repeat_every,old.studio_id,old.assignee_id) then raise insufficient_privilege using message='Edit maintenance through its plan'; end if;
  if new.status is distinct from old.status and not app_private.has_function(case when old.assignee_id=auth.uid() then 'tasks.status' else 'tasks.team_status' end) then raise insufficient_privilege using message='Task status not granted'; end if;
  if old.status='done' and new.status<>'done' and exists(select 1 from public.tasks where previous_task_id=old.id) then raise check_violation using message='Recurring task already has a successor'; end if;
  new.id:=old.id;new.created_by:=old.created_by;new.created_at:=old.created_at;
  new.repeat_anchor:=case when new.due_date is distinct from old.due_date then extract(day from new.due_date)::integer else coalesce(old.repeat_anchor,extract(day from new.due_date)::integer) end;
 end if;
 if not app_private.valid_assignee(new.assignee_id,new.studio_id) then raise check_violation using message='Assignee must be active and belong to the studio'; end if;
 new.updated_at:=clock_timestamp();
 if new.status='done' then
  if tg_op='UPDATE' and old.status='done' then new.completed_at:=old.completed_at;else new.completed_at:=clock_timestamp();end if;
 else new.completed_at:=null;end if;
 return new;
end; $$;

create or replace function app_private.advance_task()
returns trigger language plpgsql security definer set search_path='' as $$ declare next_date date; begin
 if new.status='done' and old.status<>'done' and new.repeat_unit<>'none' then
  next_date:=app_private.next_task_date(new.due_date,new.repeat_unit,new.repeat_every,coalesce(new.repeat_anchor,extract(day from new.due_date)::integer));
  insert into public.tasks(title,description,studio_id,assignee_id,due_date,priority,private,repeat_unit,repeat_every,repeat_anchor,previous_task_id,maintenance_plan_id)
  values(new.title,new.description,new.studio_id,new.assignee_id,next_date,new.priority,new.private,new.repeat_unit,new.repeat_every,coalesce(new.repeat_anchor,extract(day from new.due_date)::integer),new.id,new.maintenance_plan_id) on conflict do nothing;
  if new.maintenance_plan_id is not null then update public.maintenance_plans set due_date=next_date,updated_at=clock_timestamp() where id=new.maintenance_plan_id;end if;
 end if;
 return new;
end; $$;
drop trigger if exists task_advance on public.tasks;
create trigger task_advance after update of status on public.tasks for each row execute function app_private.advance_task();

create or replace function app_private.sync_maintenance_task()
returns trigger language plpgsql security definer set search_path='' as $$ begin
 if tg_op='UPDATE' and pg_trigger_depth()>1 then return new;end if;
 if tg_op='INSERT' then
  insert into public.tasks(title,description,studio_id,assignee_id,due_date,repeat_unit,repeat_every,maintenance_plan_id) values('Wartung: '||new.device,new.instructions,new.studio_id,new.assignee_id,new.due_date,'month',new.interval_months,new.id);
 else
  update public.tasks set title='Wartung: '||new.device,description=new.instructions,studio_id=new.studio_id,assignee_id=new.assignee_id,due_date=new.due_date,repeat_unit='month',repeat_every=new.interval_months where maintenance_plan_id=new.id and status<>'done';
 end if;
 return new;
end; $$;
drop trigger if exists maintenance_sync on public.maintenance_plans;
create trigger maintenance_sync after insert or update on public.maintenance_plans for each row execute function app_private.sync_maintenance_task();
create or replace function public.save_maintenance_plan(p_id uuid,p_device text,p_serial text,p_instructions text,p_studio uuid,p_assignee uuid,p_due date,p_interval integer,p_updated timestamptz default null)
returns uuid language plpgsql security definer set search_path='' as $$ declare old public.maintenance_plans; result uuid; begin
 if not app_private.function_studio('maintenance.manage',p_studio) then raise insufficient_privilege using message='Maintenance planning not granted';end if;
 if not app_private.valid_assignee(p_assignee,p_studio) then raise check_violation using message='Assignee must be active and belong to the studio';end if;
 if p_id is null then
  insert into public.maintenance_plans(device,serial,instructions,studio_id,assignee_id,due_date,interval_months) values(trim(p_device),p_serial,p_instructions,p_studio,p_assignee,p_due,p_interval) returning id into result;
 else
  select * into old from public.maintenance_plans where id=p_id for update;
  if old.id is null or not app_private.function_studio('maintenance.manage',old.studio_id) then raise insufficient_privilege using message='Maintenance not granted';end if;
  if old.updated_at is distinct from p_updated then raise serialization_failure using message='Maintenance changed';end if;
  update public.maintenance_plans set device=trim(p_device),serial=p_serial,instructions=p_instructions,studio_id=p_studio,assignee_id=p_assignee,due_date=p_due,interval_months=p_interval,updated_at=clock_timestamp() where id=p_id returning id into result;
 end if;
 return result;
end; $$;

create table if not exists public.calendar_events(
 id uuid primary key default gen_random_uuid(),title text not null check(length(trim(title)) between 1 and 180),
 description text not null default '' check(length(description)<=5000),location text not null default '' check(length(location)<=300),
 studio_id uuid not null references public.studios(id),private boolean not null default true,
 starts_at timestamptz not null,ends_at timestamptz not null, cancelled boolean not null default false,
 created_by uuid not null default auth.uid() references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(ends_at>starts_at and ends_at<=starts_at+interval '31 days')
);
create index if not exists calendar_dates on public.calendar_events(studio_id,starts_at,ends_at);
alter table public.calendar_events enable row level security;
create or replace function app_private.event_visible(e public.calendar_events)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('calendar') and app_private.has_studio(e.studio_id) and (not e.private or e.created_by=auth.uid()); $$;
create or replace function app_private.event_editable(e public.calendar_events)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.event_visible(e) and ((e.private and e.created_by=auth.uid() and app_private.has_function('calendar.create')) or (not e.private and app_private.has_function('calendar.team'))); $$;
drop policy if exists events_read on public.calendar_events;
create policy events_read on public.calendar_events for select to authenticated using(app_private.event_visible(calendar_events));
drop policy if exists events_insert on public.calendar_events;
create policy events_insert on public.calendar_events for insert to authenticated with check(created_by=auth.uid() and app_private.event_editable(calendar_events));
drop policy if exists events_update on public.calendar_events;
create policy events_update on public.calendar_events for update to authenticated using(app_private.event_editable(calendar_events)) with check(app_private.event_editable(calendar_events));
create or replace function app_private.guard_event()
returns trigger language plpgsql security definer set search_path='' as $$ begin
 if tg_op='INSERT' then new.created_by:=auth.uid();new.created_at:=clock_timestamp();
 else
  if row(new.id,new.private,new.created_by,new.created_at) is distinct from row(old.id,old.private,old.created_by,old.created_at) then raise insufficient_privilege using message='Event ownership and visibility are immutable';end if;
 end if;
 new.updated_at:=clock_timestamp();return new;
end; $$;
drop trigger if exists event_guard on public.calendar_events;
create trigger event_guard before insert or update on public.calendar_events for each row execute function app_private.guard_event();
revoke all on public.calendar_events from public,anon,authenticated;
grant select,insert,update on public.calendar_events to authenticated;

-- Month aggregation runs as the caller, so private tasks/events keep their RLS.
create or replace function public.team_schedule_month(p_month date,p_studio uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$ declare first_day date:=date_trunc('month',p_month)::date;last_day date:=(date_trunc('month',p_month)+interval '1 month')::date;begin
 if not app_private.can_page('calendar') then raise insufficient_privilege using message='Calendar not granted';end if;
 if p_month is null or p_month not between date '2000-01-01' and date '2200-12-31' then raise check_violation using message='Invalid month';end if;
 return jsonb_build_object('days',(select coalesce(jsonb_agg(to_jsonb(x) order by day),'[]') from (
 select d::date as day,
 (select count(*) from public.tasks t where t.due_date=d::date and (p_studio is null or t.studio_id=p_studio)) as tasks,
 (select count(*) from public.tasks t where t.due_date=d::date and t.status<>'done' and (p_studio is null or t.studio_id=p_studio)) as open,
 (select count(*) from public.tasks t where t.due_date=d::date and t.maintenance_plan_id is not null and (p_studio is null or t.studio_id=p_studio)) as maintenance,
 (select count(*) from public.calendar_events e where not cancelled and e.starts_at<((d::date+1)::timestamp at time zone 'Europe/Berlin') and e.ends_at>(d::date::timestamp at time zone 'Europe/Berlin') and (p_studio is null or e.studio_id=p_studio)) as events
 from generate_series(first_day::timestamp,(last_day-1)::timestamp,interval '1 day') d)x));
end; $$;

-- Append-only per-person inbox. Only read markers may be changed via its RPC.
create table if not exists public.team_notifications(
 id bigint generated always as identity primary key,user_id uuid not null references public.profiles(id),
 event_key text not null,kind text not null check(kind in ('task','event','chat','feedback','learning')),
 target_id uuid,channel_id uuid,message_id integer,title text not null,body text not null default '',
 occurred_at timestamptz not null default now(),read_at timestamptz,unique(user_id,event_key)
);
create index if not exists notifications_person_time on public.team_notifications(user_id,occurred_at desc,id desc);
alter table public.team_notifications enable row level security;
create or replace function app_private.notification_visible(n public.team_notifications)
returns boolean language sql stable security definer set search_path='' as $$
 select n.user_id=auth.uid() and app_private.is_active() and case n.kind
 when 'task' then exists(select 1 from public.tasks t where t.id=n.target_id and app_private.task_visible(t))
 when 'event' then exists(select 1 from public.calendar_events e where e.id=n.target_id and app_private.event_visible(e))
 when 'chat' then app_private.chat_visible(n.channel_id)
 when 'feedback' then app_private.can_page('feedback') and exists(select 1 from public.team_feedback f where f.id=n.target_id and (f.author_id=auth.uid() or f.assignee_id=auth.uid() or app_private.is_admin()))
 when 'learning' then app_private.can_page('learning') and exists(select 1 from public.learning_assignments a where a.id=n.target_id and a.learner_id=auth.uid())
 else false end;
$$;
drop policy if exists notifications_read on public.team_notifications;
create policy notifications_read on public.team_notifications for select to authenticated using(app_private.notification_visible(team_notifications));
revoke all on public.team_notifications from public,anon,authenticated;
grant select on public.team_notifications to authenticated;

create or replace function app_private.enqueue_task_due(t public.tasks)
returns void language plpgsql security definer set search_path='' as $$ begin
 if t.status<>'done' and t.due_date<=(now() at time zone 'Europe/Berlin')::date then
 insert into public.team_notifications(user_id,event_key,kind,target_id,title,body,occurred_at)
 select t.assignee_id,'task-due:'||t.id||':'||t.assignee_id||':'||t.due_date,'task',t.id,case when t.maintenance_plan_id is null then 'Aufgabe fällig' else 'Gerätewartung fällig' end,t.title,(t.due_date::timestamp at time zone 'Europe/Berlin')
 from public.profiles p where p.id=t.assignee_id and p.active on conflict do nothing;
 end if;
end; $$;
create or replace function app_private.task_notifications()
returns trigger language plpgsql security definer set search_path='' as $$ begin
 if tg_op='UPDATE' then perform app_private.enqueue_task_due(old);end if;
 if tg_op='INSERT' or new.assignee_id is distinct from old.assignee_id then
  if new.assignee_id<>auth.uid() then insert into public.team_notifications(user_id,event_key,kind,target_id,title,body) values(new.assignee_id,'task-assigned:'||new.id||':'||new.assignee_id||':'||new.updated_at,'task',new.id,'Neue Aufgabe zugewiesen',new.title) on conflict do nothing;end if;
 end if;
 perform app_private.enqueue_task_due(new);return new;
end; $$;
drop trigger if exists task_notifications on public.tasks;
create trigger task_notifications after insert or update on public.tasks for each row execute function app_private.task_notifications();

create or replace function app_private.chat_notifications()
returns trigger language plpgsql security definer set search_path='' as $$ begin
 insert into public.team_notifications(user_id,event_key,kind,channel_id,message_id,title,body,occurred_at)
 select p.id,'chat:'||new.id,'chat',new.channel_id,new.id,'Neue Chatnachricht',c.title||' · '||sender.full_name,new.created_at
 from public.profiles p cross join public.team_chat_channels c cross join public.profiles sender
 left join public.team_page_access a on a.user_id=p.id
 where c.id=new.channel_id and sender.id=new.sender_id and p.id<>new.sender_id and p.active and c.active
 and (p.role='admin' or 'chat'=any(coalesce(a.pages,app_private.default_team_pages(p.role))))
 and (p.role='admin' or c.kind='all' or exists(select 1 from public.studio_memberships m where m.user_id=p.id and m.studio_id=any(c.studio_ids))) on conflict do nothing;
 return new;
end; $$;
drop trigger if exists chat_notifications on public.team_chat_messages;
create trigger chat_notifications after insert on public.team_chat_messages for each row execute function app_private.chat_notifications();

create or replace function app_private.event_notifications()
returns trigger language plpgsql security definer set search_path='' as $$ begin
 insert into public.team_notifications(user_id,event_key,kind,target_id,title,body)
 select p.id,'event-changed:'||new.id||':'||new.updated_at,'event',new.id,case when new.cancelled then 'Termin abgesagt' when tg_op='INSERT' then 'Neuer Studiotermin' else 'Termin geändert' end,new.title
 from public.profiles p left join public.team_page_access a on a.user_id=p.id
 where p.active and p.id<>auth.uid() and not new.private and (p.role='admin' or ('calendar'=any(coalesce(a.pages,app_private.default_team_pages(p.role))) and exists(select 1 from public.studio_memberships m where m.user_id=p.id and m.studio_id=new.studio_id))) on conflict do nothing;
 return new;
end; $$;
drop trigger if exists event_notifications on public.calendar_events;
create trigger event_notifications after insert or update on public.calendar_events for each row execute function app_private.event_notifications();

create or replace function app_private.sync_due_notifications(p_user uuid default null)
returns void language plpgsql security definer set search_path='' as $$ declare t public.tasks;begin
 for t in select * from public.tasks where status<>'done' and due_date<=(now() at time zone 'Europe/Berlin')::date and (p_user is null or assignee_id=p_user) loop perform app_private.enqueue_task_due(t);end loop;
 insert into public.team_notifications(user_id,event_key,kind,target_id,title,body,occurred_at)
 select p.id,'event-due:'||e.id||':'||e.starts_at,'event',e.id,'Termin beginnt',e.title,e.starts_at
 from public.calendar_events e join public.profiles p on p.active left join public.team_page_access a on a.user_id=p.id
 where not e.cancelled and e.starts_at<=now() and e.ends_at>now()-interval '7 days' and (p_user is null or p.id=p_user)
 and (p.role='admin' or 'calendar'=any(coalesce(a.pages,app_private.default_team_pages(p.role))))
 and ((e.private and e.created_by=p.id) or (not e.private and (p.role='admin' or exists(select 1 from public.studio_memberships m where m.user_id=p.id and m.studio_id=e.studio_id)))) on conflict do nothing;
end; $$;
create or replace function public.team_notification_inbox(p_offset integer default 0,p_size integer default 25)
returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if not app_private.is_active() then raise insufficient_privilege using message='Active employee required';end if;
 if p_offset is null or p_offset<0 or p_size is null or p_size not between 1 and 100 then raise check_violation using message='Invalid notification page';end if;
 perform app_private.sync_due_notifications(auth.uid());
 return jsonb_build_object('unread',(select count(*) from public.team_notifications n where n.user_id=auth.uid() and n.read_at is null and app_private.notification_visible(n)),
 'total',(select count(*) from public.team_notifications n where n.user_id=auth.uid() and app_private.notification_visible(n)),
 'items',(select coalesce(jsonb_agg(to_jsonb(x) order by occurred_at desc,id desc),'[]') from (select n.* from public.team_notifications n where n.user_id=auth.uid() and app_private.notification_visible(n) order by occurred_at desc,id desc limit p_size offset p_offset)x));
end; $$;
create or replace function public.mark_team_notifications_read(p_ids bigint[])
returns void language plpgsql security definer set search_path='' as $$ begin
 if not app_private.is_active() then raise insufficient_privilege using message='Active employee required';end if;
 if p_ids is null or cardinality(p_ids)>100 then raise check_violation using message='Invalid notification selection';end if;
 update public.team_notifications n set read_at=coalesce(read_at,clock_timestamp()) where n.id=any(p_ids) and n.user_id=auth.uid() and app_private.notification_visible(n);
end; $$;

-- Preserve privacy in older management and module RPCs.
create or replace function public.admin_team_member_detail(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare member jsonb; begin
 if not app_private.member_visible(p_user) then raise insufficient_privilege using message='Administrator required'; end if;
 select to_jsonb(p)||jsonb_build_object('email',u.email,'last_sign_in_at',u.last_sign_in_at,'invited_at',u.invited_at) into member from public.profiles p join auth.users u on u.id=p.id where p.id=p_user;
 if member is null then raise check_violation using message='Unknown team member'; end if;
 return jsonb_build_object('member',member,
  'tasks',(select jsonb_build_object('total',count(*),'done',count(*) filter(where t.status='done'),'open',count(*) filter(where t.status<>'done'),'overdue',count(*) filter(where t.status<>'done' and t.due_date<(now() at time zone 'Europe/Berlin')::date)) from public.tasks t where t.assignee_id=p_user and app_private.has_studio(t.studio_id) and (not t.private or t.created_by=auth.uid())),
  'courses',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'title',c.title,'lesson_count',c.lesson_count,'lessons_read',coalesce(p.lessons_read,0),'quiz_passed',coalesce(p.quiz_passed,false),'practice_required',a.requires_practice,'practice_confirmed',coalesce(p.practice_confirmed,false),'due_date',a.due_date) order by c.title),'[]') from public.learning_assignments a join public.learning_courses c on c.id=a.course_id left join public.learning_progress p on p.assignment_id=a.id where a.learner_id=p_user and app_private.has_studio(a.studio_id)),
  'design_rights',(select jsonb_build_object('create',coalesce(g.can_create,false),'edit',coalesce(g.can_edit,false),'publish',coalesce(g.can_publish,false)) from (select 1) x left join public.module_permissions g on g.user_id=p_user)
 );
end; $$;

-- Preserve privacy in older management and module RPCs.
create or replace function public.admin_controlling()
returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not (app_private.has_function('controlling.view') and app_private.can_page('controlling')) then raise insufficient_privilege using message='Controlling requires an administrator'; end if;
 return jsonb_build_object('profiles',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from public.profiles p where app_private.is_admin() or exists(select 1 from public.studio_memberships m where m.user_id=p.id and app_private.has_studio(m.studio_id))),'studios',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from public.studios s where app_private.has_studio(s.id)),'tasks',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.tasks t where app_private.has_studio(t.studio_id) and (not t.private or t.created_by=auth.uid())),'courses',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from public.learning_courses c),'assignments',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.learning_assignments a where app_private.has_studio(a.studio_id)),'progress',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from public.learning_progress p where exists(select 1 from public.learning_assignments a where a.id=p.assignment_id and app_private.has_studio(a.studio_id))));
 end; $$;

-- Preserve privacy in older management and module RPCs.
create or replace function app_private.module_entity_read(mid uuid, site uuid, entity uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare target text;
begin
 select v.schema->>'target' into target from public.custom_modules m join public.module_versions v on v.id=m.published_version_id where m.id=mid;
 if target='standalone' then return entity is null; end if;
 if target='tasks' then return exists(select 1 from public.tasks t where t.id=entity and t.studio_id=site and app_private.task_visible(t)); end if;
 -- Other core modules are still local demonstrations, not authenticated tables.
 return false;
end;
$$;

create or replace function app_private.feedback_notifications()
returns trigger language plpgsql security definer set search_path='' as $$ begin
 if tg_op='INSERT' or new.assignee_id is distinct from old.assignee_id then
  if new.assignee_id is not null and new.assignee_id<>auth.uid() then insert into public.team_notifications(user_id,event_key,kind,target_id,title,body) values(new.assignee_id,'feedback-assigned:'||new.id||':'||new.updated_at,'feedback',new.id,'Feedback zugewiesen',new.title) on conflict do nothing;end if;
 end if;
 if tg_op='UPDATE' and new.status is distinct from old.status and new.author_id is not null and new.author_id<>auth.uid() then insert into public.team_notifications(user_id,event_key,kind,target_id,title,body) values(new.author_id,'feedback-status:'||new.id||':'||new.updated_at,'feedback',new.id,'Feedback aktualisiert',new.title) on conflict do nothing;end if;
 return new;
end; $$;
drop trigger if exists feedback_notifications on public.team_feedback;
create trigger feedback_notifications after insert or update on public.team_feedback for each row execute function app_private.feedback_notifications();
create or replace function app_private.learning_notifications()
returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.learner_id<>auth.uid() then
 insert into public.team_notifications(user_id,event_key,kind,target_id,title,body) select new.learner_id,'learning-assigned:'||new.id,'learning',new.id,'Neuer Lernauftrag',c.title from public.learning_courses c where c.id=new.course_id on conflict do nothing;
 end if;return new;
end; $$;
drop trigger if exists learning_notifications on public.learning_assignments;
create trigger learning_notifications after insert on public.learning_assignments for each row execute function app_private.learning_notifications();

create or replace function public.mark_team_chat_read(p_channel uuid,p_last integer)
returns void language plpgsql security definer set search_path='' as $$ begin
 if not app_private.chat_visible(p_channel) then raise insufficient_privilege using message='Channel not granted'; end if;
 if p_last is null or p_last<0 or (p_last>0 and not exists(select 1 from public.team_chat_messages where channel_id=p_channel and id=p_last)) then raise check_violation using message='Only loaded channel messages can be marked read'; end if;
 insert into public.team_chat_reads(user_id,channel_id,last_read_id) values(auth.uid(),p_channel,p_last)
 on conflict(user_id,channel_id) do update set last_read_id=greatest(team_chat_reads.last_read_id,excluded.last_read_id),updated_at=clock_timestamp();
update public.team_notifications set read_at=coalesce(read_at,clock_timestamp()) where user_id=auth.uid() and kind='chat' and channel_id=p_channel and message_id<=p_last;
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
 return jsonb_build_object('version',10,'grants',app_private.function_grants(p_user),'effective',app_private.function_effective(p_user),'role_defaults',(select coalesce(array_agg(c.key),'{}') from app_private.function_catalog() c where member.role='admin' or member.role=any(c.roles)),'revision',previous.revision,'role',member.role);
end; $$;

-- Existing unread chat messages join the inbox once; read history is preserved
-- by the same event key used for future messages.
insert into public.team_notifications(user_id,event_key,kind,channel_id,message_id,title,body,occurred_at)
select p.id,'chat:'||m.id,'chat',c.id,m.id,'Neue Chatnachricht',c.title||' · '||sender.full_name,m.created_at
from public.profiles p cross join public.team_chat_channels c
join public.team_chat_messages m on m.channel_id=c.id
join public.profiles sender on sender.id=m.sender_id
left join public.team_chat_reads r on r.user_id=p.id and r.channel_id=c.id
left join public.team_page_access a on a.user_id=p.id
where p.active and p.id<>m.sender_id and c.active and m.id>coalesce(r.last_read_id,0)
and (p.role='admin' or 'chat'=any(coalesce(a.pages,app_private.default_team_pages(p.role))))
and (p.role='admin' or c.kind='all' or exists(select 1 from public.studio_memberships membership where membership.user_id=p.id and membership.studio_id=any(c.studio_ids)))
on conflict do nothing;
do $backfill$ begin perform app_private.sync_due_notifications();end $backfill$;

-- Server-side periodic generation when pg_cron is enabled. The inbox also
-- catches up on every refresh, so no reminder is lost between browser sessions.
do $job$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('teamhub-due-notifications','* * * * *','select app_private.sync_due_notifications()');
 end if;
end $job$;

revoke all on function app_private.task_visible(public.tasks),app_private.next_task_date(date,text,integer,integer),app_private.advance_task(),app_private.sync_maintenance_task(),app_private.event_visible(public.calendar_events),app_private.event_editable(public.calendar_events),app_private.guard_event(),app_private.notification_visible(public.team_notifications),app_private.enqueue_task_due(public.tasks),app_private.task_notifications(),app_private.chat_notifications(),app_private.event_notifications(),app_private.feedback_notifications(),app_private.learning_notifications(),app_private.sync_due_notifications(uuid) from public,anon,authenticated;
grant execute on function app_private.task_visible(public.tasks),app_private.event_visible(public.calendar_events),app_private.event_editable(public.calendar_events),app_private.notification_visible(public.team_notifications) to authenticated;
revoke all on function public.save_maintenance_plan(uuid,text,text,text,uuid,uuid,date,integer,timestamptz),public.team_schedule_month(date,uuid),public.team_notification_inbox(integer,integer),public.mark_team_notifications_read(bigint[]) from public,anon,authenticated;
grant execute on function public.save_maintenance_plan(uuid,text,text,text,uuid,uuid,date,integer,timestamptz),public.team_schedule_month(date,uuid),public.team_notification_inbox(integer,integer),public.mark_team_notifications_read(bigint[]) to authenticated;
notify pgrst,'reload schema';
commit;
