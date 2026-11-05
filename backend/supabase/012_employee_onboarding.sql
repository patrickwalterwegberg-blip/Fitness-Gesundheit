-- Persönliches Mitarbeiter-Onboarding. Nach Erweiterungen 001–011 vollständig ausführen.
begin;
do $prerequisite$ begin
 if to_regclass('public.learning_videos') is null then raise exception 'Bitte zuerst Erweiterung 011_course_videos.sql vollstaendig ausfuehren.';end if;
end $prerequisite$;
create or replace function app_private.function_catalog() returns table(key text,label text,page text,roles text[],requires text[]) language sql immutable set search_path='' as $$ select key,label,page,roles,requires from jsonb_to_recordset('[{"group": "Aufgaben", "key": "tasks.team", "label": "Teamaufgaben ansehen", "page": "tasks", "roles": ["studio_manager"], "requires": []}, {"group": "Aufgaben", "key": "tasks.create", "label": "Aufgaben erstellen", "page": "tasks", "roles": ["studio_manager"], "requires": []}, {"group": "Aufgaben", "key": "tasks.edit", "label": "Aufgabentext, Frist und Priorität bearbeiten", "page": "tasks", "roles": ["studio_manager"], "requires": []}, {"group": "Aufgaben", "key": "tasks.assign", "label": "Aufgaben anderen Mitarbeitern zuweisen", "page": "tasks", "roles": ["studio_manager"], "requires": ["tasks.team"]}, {"group": "Aufgaben", "key": "tasks.status", "label": "Status eigener Aufgaben ändern", "page": "tasks", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Aufgaben", "key": "tasks.team_status", "label": "Status von Teamaufgaben ändern", "page": "tasks", "roles": ["studio_manager"], "requires": ["tasks.team"]}, {"group": "Aufgaben", "key": "tasks.comment", "label": "Aufgaben kommentieren", "page": "tasks", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Lernhub", "key": "learning.read", "label": "Eigene Lektionen lesen und bestätigen", "page": "learning", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Lernhub", "key": "learning.quiz", "label": "Eigene Quizfragen beantworten", "page": "learning", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Lernhub", "key": "learning.courses", "label": "Kurse erstellen", "page": "learning", "roles": [], "requires": []}, {"group": "Lernhub", "key": "learning.assign", "label": "Kurse zuweisen", "page": "learning", "roles": [], "requires": []}, {"group": "Lernhub", "key": "learning.practice", "label": "Praxiseinweisungen bestätigen", "page": "learning", "roles": [], "requires": []}, {"group": "Lernhub", "key": "learning.assess", "label": "Externe Wissensprüfungen dokumentieren", "page": "learning", "roles": [], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.read", "label": "Freigegebene Inhalte und Originaldateien öffnen", "page": "knowledge", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.article", "label": "Wissensartikel anlegen", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.upload", "label": "Dateien hochladen", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.edit", "label": "Eigene Inhalte bearbeiten", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.team", "label": "Inhalte anderer Mitarbeiter bearbeiten", "page": "files", "roles": ["studio_manager"], "requires": ["knowledge.edit"]}, {"group": "Dateien & Wissen", "key": "knowledge.publish", "label": "Inhalte veröffentlichen", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.access", "label": "Leserrollen und Standortfreigaben ändern", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.archive", "label": "Inhalte archivieren", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Dateien & Wissen", "key": "knowledge.cleanup", "label": "Unvollständige Uploads anderer Mitarbeiter bereinigen", "page": "files", "roles": ["studio_manager"], "requires": []}, {"group": "Modulbaukasten", "key": "modules.create", "label": "Neue Module erstellen", "page": "builder", "roles": [], "requires": ["modules.edit"]}, {"group": "Modulbaukasten", "key": "modules.edit", "label": "Modulaufbau bearbeiten", "page": "builder", "roles": [], "requires": []}, {"group": "Modulbaukasten", "key": "modules.publish", "label": "Modulversionen veröffentlichen", "page": "builder", "roles": [], "requires": ["modules.edit"]}, {"group": "Modulbaukasten", "key": "modules.restore", "label": "Frühere Modulversion wiederherstellen", "page": "builder", "roles": [], "requires": ["modules.publish"]}, {"group": "Modulbaukasten", "key": "modules.records", "label": "Freigegebene Moduleinträge speichern", "page": "modules", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Startseite", "key": "home.create", "label": "Startseiteneinträge anlegen", "page": "dashboard", "roles": [], "requires": []}, {"group": "Startseite", "key": "home.edit", "label": "Startseiteneinträge bearbeiten", "page": "dashboard", "roles": [], "requires": []}, {"group": "Startseite", "key": "home.publish", "label": "Startseiteneinträge veröffentlichen", "page": "dashboard", "roles": [], "requires": []}, {"group": "Startseite", "key": "home.archive", "label": "Startseiteneinträge ausblenden", "page": "dashboard", "roles": [], "requires": []}, {"group": "Chat", "key": "chat.send", "label": "Nachrichten senden", "page": "chat", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Chat", "key": "chat.channels", "label": "Studioübergreifende Chatkanäle verwalten", "page": "chat", "roles": [], "requires": []}, {"group": "Feedback", "key": "feedback.submit", "label": "Eigenes Feedback abgeben und verfolgen", "page": "feedback", "roles": ["employee", "studio_manager"], "requires": []}, {"group": "Feedback", "key": "feedback.manage", "label": "Feedback des eigenen Studios bearbeiten", "page": "feedback", "roles": [], "requires": []}, {"group": "Feedback", "key": "feedback.reassign", "label": "Zuständigkeit einer Meldung ändern", "page": "feedback", "roles": [], "requires": ["feedback.manage"]}, {"group": "Feedback", "key": "feedback.routes", "label": "Feedback-Zuständigkeiten festlegen", "page": "feedback", "roles": [], "requires": []}, {"group": "Nutzerverwaltung", "key": "users.view", "label": "Mitarbeiterprofile ansehen", "page": "access", "roles": [], "requires": []}, {"group": "Nutzerverwaltung", "key": "users.invite", "label": "Einzelne Mitarbeiter einladen", "page": "access", "roles": [], "requires": ["users.view"]}, {"group": "Nutzerverwaltung", "key": "users.import", "label": "Mitarbeiter per CSV oder Excel importieren", "page": "access", "roles": [], "requires": ["users.invite"]}, {"group": "Nutzerverwaltung", "key": "users.profile", "label": "Berufliche Profilinformationen bearbeiten", "page": "access", "roles": [], "requires": ["users.view"]}, {"group": "Nutzerverwaltung", "key": "users.access", "label": "Zugänge sperren und Studiozuordnungen verwalten", "page": "access", "roles": [], "requires": ["users.view"]}, {"group": "Nutzerverwaltung", "key": "users.login", "label": "Anmeldelinks anfordern", "page": "access", "roles": [], "requires": ["users.view"]}, {"group": "Controlling", "key": "controlling.view", "label": "Controlling für eigene Studios ansehen", "page": "controlling", "roles": [], "requires": []}, {"group": "Controlling", "key": "controlling.export", "label": "Controlling als CSV exportieren", "page": "controlling", "roles": [], "requires": ["controlling.view"]}, {"group": "Aufgaben", "key": "tasks.private", "label": "Private Aufgaben für mich erstellen und bearbeiten", "page": "tasks", "roles": ["employee", "studio_manager"], "requires": [], "since": 10}, {"group": "Aufgaben", "key": "tasks.repeat", "label": "Wiederkehrende Aufgaben anlegen", "page": "tasks", "roles": ["employee", "studio_manager"], "requires": [], "since": 10}, {"group": "Kalender", "key": "calendar.create", "label": "Eigene Termine anlegen und bearbeiten", "page": "calendar", "roles": ["employee", "studio_manager"], "requires": [], "since": 10}, {"group": "Kalender", "key": "calendar.team", "label": "Termine für das Studio anlegen und bearbeiten", "page": "calendar", "roles": ["studio_manager"], "requires": ["calendar.create"], "since": 10}, {"group": "Gerätewartung", "key": "maintenance.manage", "label": "Gerätewartungen planen und bearbeiten", "page": "calendar", "roles": ["studio_manager"], "requires": ["tasks.create", "tasks.assign", "tasks.repeat"], "since": 10}, {"group": "Lernhub", "key": "learning.videos", "label": "Kursvideos aufnehmen, hochladen und zuordnen", "page": "learning", "roles": [], "requires": ["learning.courses"], "since": 11}, {"group": "Onboarding", "key": "onboarding.templates", "label": "Onboardingvorlagen erstellen und freigeben", "page": "learning", "roles": [], "requires": ["learning.courses"], "since": 12}, {"group": "Onboarding", "key": "onboarding.assign", "label": "Einarbeitungspläne Mitarbeitern zuweisen", "page": "learning", "roles": [], "requires": ["onboarding.review", "learning.assign", "tasks.create", "tasks.assign"], "since": 12}, {"group": "Onboarding", "key": "onboarding.review", "label": "Onboarding im eigenen Studio begleiten und bestätigen", "page": "learning", "roles": ["studio_manager"], "requires": [], "since": 12}]'::jsonb) as c(key text,label text,page text,roles text[],requires text[]); $$;
create or replace function public.team_access_context()
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare p public.profiles; a public.team_page_access; begin
 select * into p from public.profiles where id=auth.uid() and active;
 if not found then raise insufficient_privilege using message='Active employee required'; end if;
 select * into a from public.team_page_access where user_id=p.id;
 return jsonb_build_object('version',12,'pages',case when p.role='admin' then app_private.default_team_pages('admin') else coalesce(a.pages,app_private.default_team_pages(p.role)) end,'can_design',app_private.design_right('edit'),'capabilities',app_private.function_effective(p.id));
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
 return jsonb_build_object('version',12,'grants',app_private.function_grants(p_user),'effective',app_private.function_effective(p_user),'role_defaults',(select coalesce(array_agg(c.key),'{}') from app_private.function_catalog() c where member.role='admin' or member.role=any(c.roles)),'revision',previous.revision,'role',member.role);
end; $$;

create table if not exists public.onboarding_templates(
 id uuid primary key default gen_random_uuid(),title text not null check(length(trim(title)) between 1 and 180),
 description text not null default '' check(length(description)<=3000),studio_id uuid references public.studios(id),
 steps jsonb not null check(jsonb_typeof(steps)='array' and jsonb_array_length(steps) between 1 and 30),
 published boolean not null default false,revision integer not null default 1,
 created_by uuid not null references public.profiles(id),updated_at timestamptz not null default now()
);
create table if not exists public.onboarding_enrollments(
 id uuid primary key,template_id uuid not null references public.onboarding_templates(id),
 learner_id uuid not null references public.profiles(id),studio_id uuid not null references public.studios(id),
 mentor_id uuid not null references public.profiles(id),starts_on date not null,
 created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),unique(template_id,learner_id)
);
create index if not exists onboarding_person on public.onboarding_enrollments(learner_id,studio_id);
create index if not exists onboarding_studio_time on public.onboarding_enrollments(studio_id,created_at desc,id);
create table if not exists public.onboarding_steps(
 id uuid primary key default gen_random_uuid(),enrollment_id uuid not null references public.onboarding_enrollments(id),
 position integer not null check(position between 0 and 29),kind text not null check(kind in ('course','task','check')),
 title text not null,description text not null default '',category text not null,due_date date not null,
 learning_assignment_id uuid references public.learning_assignments(id),task_id uuid references public.tasks(id),
 requires_review boolean not null default false,completed_at timestamptz,completed_by uuid references public.profiles(id),
 reviewed_at timestamptz,reviewed_by uuid references public.profiles(id),review_note text not null default '',unique(enrollment_id,position),
 check((kind='course' and learning_assignment_id is not null and task_id is null) or (kind='task' and task_id is not null and learning_assignment_id is null) or (kind='check' and task_id is null and learning_assignment_id is null))
);
create table if not exists public.onboarding_events(
 id bigint generated always as identity primary key,enrollment_id uuid not null references public.onboarding_enrollments(id),
 step_id uuid references public.onboarding_steps(id),actor_id uuid not null references public.profiles(id),event text not null,at timestamptz not null default now()
);
create or replace function app_private.onboarding_review(site uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.function_studio('onboarding.review',site); $$;
create or replace function app_private.onboarding_visible(e public.onboarding_enrollments)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.can_page('learning') and app_private.has_studio(e.studio_id) and (e.learner_id=auth.uid() or app_private.onboarding_review(e.studio_id)); $$;
create or replace function app_private.onboarding_template_manage(t public.onboarding_templates)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.function_studio('onboarding.templates',t.studio_id) and (app_private.is_admin() or t.created_by=auth.uid()); $$;
alter table public.onboarding_templates enable row level security;
alter table public.onboarding_enrollments enable row level security;
alter table public.onboarding_steps enable row level security;
alter table public.onboarding_events enable row level security;
drop policy if exists onboarding_templates_read on public.onboarding_templates;
create policy onboarding_templates_read on public.onboarding_templates for select to authenticated using(app_private.onboarding_template_manage(onboarding_templates) or (published and app_private.has_function('onboarding.assign') and app_private.can_page('learning') and (studio_id is null or app_private.has_studio(studio_id))) or exists(select 1 from public.onboarding_enrollments e where e.template_id=onboarding_templates.id and app_private.onboarding_visible(e)));
drop policy if exists onboarding_enrollments_read on public.onboarding_enrollments;
create policy onboarding_enrollments_read on public.onboarding_enrollments for select to authenticated using(app_private.onboarding_visible(onboarding_enrollments));
drop policy if exists onboarding_steps_read on public.onboarding_steps;
create policy onboarding_steps_read on public.onboarding_steps for select to authenticated using(exists(select 1 from public.onboarding_enrollments e where e.id=enrollment_id and app_private.onboarding_visible(e)));
drop policy if exists onboarding_events_read on public.onboarding_events;
create policy onboarding_events_read on public.onboarding_events for select to authenticated using(exists(select 1 from public.onboarding_enrollments e where e.id=enrollment_id and app_private.onboarding_visible(e)));
revoke all on public.onboarding_templates,public.onboarding_enrollments,public.onboarding_steps,public.onboarding_events from public,anon,authenticated;
grant select on public.onboarding_templates,public.onboarding_enrollments,public.onboarding_steps,public.onboarding_events to authenticated;

create or replace function public.save_onboarding_template(p_id uuid,p_title text,p_description text,p_studio uuid,p_steps jsonb,p_published boolean,p_revision integer default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare old public.onboarding_templates;item jsonb;normalized jsonb:='[]';kind text;category text;cid uuid;day_offset integer;result uuid;seen uuid[]:='{}';begin
 if not app_private.function_studio('onboarding.templates',p_studio) or (p_studio is null and not app_private.is_admin()) then raise insufficient_privilege using message='Onboarding templates not granted';end if;
 if p_title is null or length(trim(p_title)) not between 1 and 180 or p_description is null or length(p_description)>3000 or p_published is null or jsonb_typeof(p_steps) is distinct from 'array' then raise check_violation using message='Invalid onboarding template';end if;
 if jsonb_array_length(p_steps) not between 1 and 30 then raise check_violation using message='Choose one to thirty onboarding steps';end if;
 for item in select value from jsonb_array_elements(p_steps) loop
  kind:=item->>'kind';category:=coalesce(item->>'category','welcome');
  if kind is null or kind not in ('course','task','check') or category not in ('welcome','service','safety','tools','team') or jsonb_typeof(item->'title') is distinct from 'string' or length(trim(item->>'title')) not between 1 and 165 or jsonb_typeof(item->'description') is distinct from 'string' or length(item->>'description')>3000 or coalesce(item->>'days','')!~'^[0-9]{1,3}$' then raise check_violation using message='Invalid onboarding step';end if;
  day_offset:=(item->>'days')::integer;
  if day_offset>365 or jsonb_typeof(item->'requires_review') is distinct from 'boolean' or jsonb_typeof(item->'practice') is distinct from 'boolean' then raise check_violation using message='Invalid onboarding step options';end if;
  cid:=null;
  if kind='course' then
   cid:=(item->>'course_id')::uuid;
   if cid is null or cid=any(seen) or not exists(select 1 from public.learning_courses c join public.learning_material m on m.course_id=c.id where c.id=cid and c.active) then raise check_violation using message='Choose distinct active courses with content';end if;
   seen:=array_append(seen,cid);
  end if;
  normalized:=normalized||jsonb_build_array(jsonb_build_object('kind',kind,'category',category,'title',trim(item->>'title'),'description',item->>'description','days',day_offset,'course_id',cid,'requires_review',kind='check' and (item->>'requires_review')::boolean,'practice',kind='course' and (item->>'practice')::boolean));
 end loop;
 if p_id is null then
  insert into public.onboarding_templates(title,description,studio_id,steps,published,created_by) values(trim(p_title),p_description,p_studio,normalized,p_published,auth.uid()) returning id into result;
 else
  select * into old from public.onboarding_templates where id=p_id for update;
  if old.id is null or not app_private.onboarding_template_manage(old) then raise insufficient_privilege using message='Own onboarding template required';end if;
  if old.revision is distinct from p_revision then raise serialization_failure using message='Onboarding template changed';end if;
  if exists(select 1 from public.onboarding_enrollments where template_id=old.id) then raise check_violation using message='Assigned onboarding templates are immutable; create a copy';end if;
  update public.onboarding_templates set title=trim(p_title),description=p_description,studio_id=p_studio,steps=normalized,published=p_published,revision=revision+1,updated_at=clock_timestamp() where id=p_id returning id into result;
 end if;
 return result;
end; $$;

create or replace function public.enroll_onboarding(p_template uuid,p_user uuid,p_studio uuid,p_start date,p_mentor uuid,p_nonce uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare t public.onboarding_templates;e public.onboarding_enrollments;item jsonb;aid uuid;tid uuid;position integer:=0;due date;existing public.learning_assignments;begin
 if not app_private.function_studio('onboarding.assign',p_studio) then raise insufficient_privilege using message='Onboarding assignment not granted';end if;
 if p_nonce is null or p_start is null or not app_private.valid_assignee(p_user,p_studio) or not app_private.onboarding_mentor(p_mentor,p_studio) then raise check_violation using message='Choose an active employee and onboarding mentor in the studio';end if;
 perform pg_advisory_xact_lock(hashtextextended('onboarding-person:'||p_user::text,0));
 select * into t from public.onboarding_templates where id=p_template for update;
 if t.id is null or not t.published or (t.studio_id is not null and t.studio_id<>p_studio) then raise check_violation using message='Published onboarding template for this studio required';end if;
 select * into e from public.onboarding_enrollments where id=p_nonce;
 if found then
  if row(e.template_id,e.learner_id,e.studio_id,e.starts_on,e.mentor_id,e.created_by) is distinct from row(p_template,p_user,p_studio,p_start,p_mentor,auth.uid()) then raise check_violation using message='Onboarding retry changed';end if;
  return e.id;
 end if;
 if exists(select 1 from public.onboarding_enrollments where learner_id=p_user and template_id=p_template) then raise check_violation using message='This employee already has this onboarding plan';end if;
 insert into public.onboarding_enrollments(id,template_id,learner_id,studio_id,mentor_id,starts_on,created_by) values(p_nonce,p_template,p_user,p_studio,p_mentor,p_start,auth.uid());
 for item in select value from jsonb_array_elements(t.steps) loop
  due:=p_start+(item->>'days')::integer;aid:=null;tid:=null;
  if item->>'kind'='course' then
   perform 1 from public.learning_courses where id=(item->>'course_id')::uuid and active for update;
   if not found then raise check_violation using message='Onboarding course is inactive';end if;
   select * into existing from public.learning_assignments where learner_id=p_user and course_id=(item->>'course_id')::uuid for update;
   if found then
    if existing.studio_id<>p_studio or ((item->>'practice')::boolean and not existing.requires_practice) then raise check_violation using message='Existing learning assignment has a different studio or practice requirement';end if;
    aid:=existing.id;
   else aid:=public.create_learning_assignment(p_user,(item->>'course_id')::uuid,p_studio,due,(item->>'practice')::boolean);
   end if;
  elsif item->>'kind'='task' then
   insert into public.tasks(title,description,studio_id,assignee_id,due_date,private) values('Onboarding: '||(item->>'title'),item->>'description',p_studio,p_user,due,false) returning id into tid;
  end if;
  insert into public.onboarding_steps(enrollment_id,position,kind,title,description,category,due_date,learning_assignment_id,task_id,requires_review) values(p_nonce,position,item->>'kind',item->>'title',item->>'description',item->>'category',due,aid,tid,(item->>'requires_review')::boolean);
  position:=position+1;
 end loop;
 insert into public.onboarding_events(enrollment_id,actor_id,event) values(p_nonce,auth.uid(),'assigned');
 return p_nonce;
end; $$;

create or replace function app_private.onboarding_step_done(s public.onboarding_steps)
returns boolean language sql stable security definer set search_path='' as $$ select case s.kind
 when 'task' then exists(select 1 from public.tasks t where t.id=s.task_id and not t.private and t.status='done')
 when 'course' then exists(select 1 from public.learning_assignments a join public.learning_courses c on c.id=a.course_id join public.learning_progress p on p.assignment_id=a.id where a.id=s.learning_assignment_id and p.lessons_read>=c.lesson_count and p.quiz_passed and (not a.requires_practice or p.practice_confirmed))
 else s.completed_at is not null and (not s.requires_review or s.reviewed_at is not null) end; $$;
create or replace function app_private.onboarding_detail(e public.onboarding_enrollments)
returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(e)||jsonb_build_object('title',t.title,'description',t.description,'learner_name',learner.full_name,'mentor_name',mentor.full_name,'studio_name',site.name,
 'total',(select count(*) from public.onboarding_steps s where s.enrollment_id=e.id),
 'done',(select count(*) from public.onboarding_steps s where s.enrollment_id=e.id and app_private.onboarding_step_done(s)),
 'steps',(select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('done',app_private.onboarding_step_done(s),
 'course_id',a.course_id,'lessons_read',p.lessons_read,'lesson_count',c.lesson_count,'quiz_passed',p.quiz_passed,'practice_required',a.requires_practice,'practice_confirmed',p.practice_confirmed,
 'due_date',coalesce(task.due_date,a.due_date,s.due_date),'task_status',task.status,'reviewer_name',reviewer.full_name) order by s.position),'[]') from public.onboarding_steps s left join public.learning_assignments a on a.id=s.learning_assignment_id left join public.learning_courses c on c.id=a.course_id left join public.learning_progress p on p.assignment_id=a.id left join public.tasks task on task.id=s.task_id left join public.profiles reviewer on reviewer.id=s.reviewed_by where s.enrollment_id=e.id))
 from public.onboarding_templates t join public.profiles learner on learner.id=e.learner_id join public.profiles mentor on mentor.id=e.mentor_id join public.studios site on site.id=e.studio_id where t.id=e.template_id;
$$;
create or replace function public.my_onboarding()
returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not app_private.can_page('learning') then raise insufficient_privilege using message='Learning area not granted';end if;
 return jsonb_build_object('plans',(select coalesce(jsonb_agg(app_private.onboarding_detail(e) order by e.created_at desc,e.id),'[]') from public.onboarding_enrollments e where e.learner_id=auth.uid() and app_private.onboarding_visible(e)));
end; $$;
create or replace function public.team_onboarding(p_studio uuid default null,p_page integer default 0,p_size integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not (app_private.has_function('onboarding.review') and app_private.can_page('learning')) then raise insufficient_privilege using message='Onboarding review not granted';end if;
 if p_page is null or p_page<0 or p_size is null or p_size not between 1 and 50 then raise check_violation using message='Invalid onboarding page';end if;
 return jsonb_build_object('total',(select count(*) from public.onboarding_enrollments e where app_private.onboarding_review(e.studio_id) and (p_studio is null or e.studio_id=p_studio)),
 'plans',(select coalesce(jsonb_agg(app_private.onboarding_detail(e) order by e.created_at desc,e.id),'[]') from (select * from public.onboarding_enrollments e where app_private.onboarding_review(e.studio_id) and (p_studio is null or e.studio_id=p_studio) order by created_at desc,id offset p_page*p_size limit p_size)e));
end; $$;
create or replace function public.complete_onboarding_step(p_step uuid,p_done boolean,p_review boolean default false,p_note text default '')
returns void language plpgsql security definer set search_path='' as $$ declare s public.onboarding_steps;e public.onboarding_enrollments;begin
 select * into s from public.onboarding_steps where id=p_step for update;
 select * into e from public.onboarding_enrollments where id=s.enrollment_id;
 if s.id is null or not app_private.onboarding_visible(e) then raise insufficient_privilege using message='Onboarding step not granted';end if;
 if s.kind<>'check' or p_done is null or p_review is null or p_note is null or length(p_note)>2000 then raise check_violation using message='Only checklist steps can be confirmed here';end if;
 if p_review then
  if e.learner_id=auth.uid() then raise check_violation using message='Another reviewer must confirm this step';end if;
  if not app_private.onboarding_review(e.studio_id) then raise insufficient_privilege using message='Onboarding reviewer required';end if;
  if not s.requires_review or s.completed_at is null then raise check_violation using message='Employee confirmation required before review';end if;
  update public.onboarding_steps set reviewed_at=case when p_done then clock_timestamp() end,reviewed_by=case when p_done then auth.uid() end,review_note=p_note where id=s.id;
 else
  if e.learner_id<>auth.uid() then raise insufficient_privilege using message='Own onboarding step required';end if;
  if s.reviewed_at is not null then raise check_violation using message='Reviewed steps remain confirmed';end if;
  update public.onboarding_steps set completed_at=case when p_done then clock_timestamp() end,completed_by=case when p_done then auth.uid() end where id=s.id;
 end if;
 insert into public.onboarding_events(enrollment_id,step_id,actor_id,event) values(e.id,s.id,auth.uid(),case when p_review then case when p_done then 'reviewed' else 'review_withdrawn' end else case when p_done then 'completed' else 'completion_withdrawn' end end);
end; $$;

create or replace function app_private.onboarding_mentor(target uuid,site uuid)
returns boolean language sql stable security definer set search_path='' as $$ select app_private.valid_assignee(target,site) and app_private.function_allowed(target,'onboarding.review') and exists(select 1 from public.profiles p left join public.team_page_access a on a.user_id=p.id where p.id=target and p.active and (p.role='admin' or 'learning'=any(coalesce(a.pages,app_private.default_team_pages(p.role))))); $$;
create or replace function public.onboarding_mentors(p_studio uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not app_private.function_studio('onboarding.assign',p_studio) then raise insufficient_privilege using message='Onboarding assignment not granted';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'role',p.role) order by p.full_name,p.id),'[]') from public.profiles p where app_private.onboarding_mentor(p.id,p_studio));
end; $$;

alter table public.team_notifications drop constraint if exists team_notifications_kind_check;
alter table public.team_notifications add constraint team_notifications_kind_check check(kind in ('task','event','chat','feedback','learning','onboarding'));
create or replace function app_private.notification_visible(n public.team_notifications)
returns boolean language sql stable security definer set search_path='' as $$
 select n.user_id=auth.uid() and app_private.is_active() and case n.kind
 when 'task' then exists(select 1 from public.tasks t where t.id=n.target_id and app_private.task_visible(t))
 when 'event' then exists(select 1 from public.calendar_events e where e.id=n.target_id and app_private.event_visible(e))
 when 'chat' then app_private.chat_visible(n.channel_id)
 when 'feedback' then app_private.can_page('feedback') and exists(select 1 from public.team_feedback f where f.id=n.target_id and (f.author_id=auth.uid() or f.assignee_id=auth.uid() or app_private.is_admin()))
 when 'onboarding' then exists(select 1 from public.onboarding_enrollments e where e.id=n.target_id and app_private.onboarding_visible(e))
 when 'learning' then app_private.can_page('learning') and exists(select 1 from public.learning_assignments a where a.id=n.target_id and a.learner_id=auth.uid())
 else false end;
$$;

create or replace function app_private.onboarding_notification()
returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.learner_id<>auth.uid() then
 insert into public.team_notifications(user_id,event_key,kind,target_id,title,body) select new.learner_id,'onboarding-assigned:'||new.id,'onboarding',new.id,'Dein Onboarding ist bereit',t.title from public.onboarding_templates t where t.id=new.template_id on conflict do nothing;
 end if;return new;
end; $$;
drop trigger if exists onboarding_notification on public.onboarding_enrollments;
create trigger onboarding_notification after insert on public.onboarding_enrollments for each row execute function app_private.onboarding_notification();

create or replace function public.onboarding_template_library(p_page integer default 0,p_size integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not app_private.can_page('learning') or not (app_private.has_function('onboarding.templates') or app_private.has_function('onboarding.assign')) then raise insufficient_privilege using message='Onboarding templates not granted';end if;
 if p_page is null or p_page<0 or p_size is null or p_size not between 1 and 50 then raise check_violation using message='Invalid template page';end if;
 return jsonb_build_object('total',(select count(*) from public.onboarding_templates t where app_private.onboarding_template_manage(t) or (t.published and app_private.has_function('onboarding.assign') and (t.studio_id is null or app_private.has_studio(t.studio_id)))),
 'templates',(select coalesce(jsonb_agg(to_jsonb(x) order by updated_at desc,id),'[]') from (select t.*,(select count(*) from public.onboarding_enrollments e where e.template_id=t.id) as used_count from public.onboarding_templates t where app_private.onboarding_template_manage(t) or (t.published and app_private.has_function('onboarding.assign') and (t.studio_id is null or app_private.has_studio(t.studio_id))) order by t.updated_at desc,t.id offset p_page*p_size limit p_size)x));
end; $$;
revoke all on function public.onboarding_template_library(integer,integer) from public,anon,authenticated;
grant execute on function public.onboarding_template_library(integer,integer) to authenticated;

revoke all on function app_private.onboarding_review(uuid),app_private.onboarding_visible(public.onboarding_enrollments),app_private.onboarding_template_manage(public.onboarding_templates),app_private.onboarding_step_done(public.onboarding_steps),app_private.onboarding_detail(public.onboarding_enrollments),app_private.onboarding_mentor(uuid,uuid),app_private.onboarding_notification() from public,anon,authenticated;
grant execute on function app_private.onboarding_review(uuid),app_private.onboarding_visible(public.onboarding_enrollments),app_private.onboarding_template_manage(public.onboarding_templates) to authenticated;
revoke all on function public.save_onboarding_template(uuid,text,text,uuid,jsonb,boolean,integer),public.enroll_onboarding(uuid,uuid,uuid,date,uuid,uuid),public.my_onboarding(),public.team_onboarding(uuid,integer,integer),public.complete_onboarding_step(uuid,boolean,boolean,text),public.onboarding_mentors(uuid) from public,anon,authenticated;
grant execute on function public.save_onboarding_template(uuid,text,text,uuid,jsonb,boolean,integer),public.enroll_onboarding(uuid,uuid,uuid,date,uuid,uuid),public.my_onboarding(),public.team_onboarding(uuid,integer,integer),public.complete_onboarding_step(uuid,boolean,boolean,text),public.onboarding_mentors(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
