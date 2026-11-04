-- After migrations 001–005. Run the complete file in Supabase SQL Editor.
-- Adds real dashboard/calendar queries and a testable learning workflow.
begin;

create table if not exists public.learning_material (
 course_id uuid primary key references public.learning_courses(id),
 lessons jsonb not null, questions jsonb not null,
 revision integer not null default 1, updated_at timestamptz not null default now()
);
create table if not exists app_private.learning_answer_keys (
 course_id uuid primary key references public.learning_courses(id), answers jsonb not null
);
create table if not exists public.learning_reads (
 assignment_id uuid not null references public.learning_assignments(id),
 lesson_index integer not null, read_at timestamptz not null default now(),
 primary key(assignment_id,lesson_index)
);
create table if not exists public.learning_attempts (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.learning_assignments(id),
 correct integer not null, total integer not null, passed boolean not null,
 at timestamptz not null default now()
);
alter table public.learning_material enable row level security;
alter table public.learning_reads enable row level security;
alter table public.learning_attempts enable row level security;
drop policy if exists material_read on public.learning_material;
create policy material_read on public.learning_material for select to authenticated using (
 app_private.is_admin() or exists(select 1 from public.learning_assignments a where a.course_id=learning_material.course_id and app_private.learning_read(a.id))
);
drop policy if exists reads_read on public.learning_reads;
create policy reads_read on public.learning_reads for select to authenticated using(app_private.learning_read(assignment_id));
drop policy if exists attempts_read on public.learning_attempts;
create policy attempts_read on public.learning_attempts for select to authenticated using(app_private.learning_read(assignment_id));
revoke all on public.learning_material,public.learning_reads,public.learning_attempts,app_private.learning_answer_keys from public,anon,authenticated;
grant select on public.learning_material,public.learning_reads,public.learning_attempts to authenticated;

create or replace function public.save_learning_course(p_course uuid,p_title text,p_lessons jsonb,p_questions jsonb,p_answers jsonb,p_expected_revision integer default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid; rev integer; item jsonb; i integer; normalized_lessons jsonb:='[]'; normalized_questions jsonb:='[]';
begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
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
  insert into public.learning_courses(title,lesson_count) values(trim(p_title),jsonb_array_length(p_lessons)) returning id into cid;
 else
  cid:=p_course;
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

-- Serializes assigning against edits. Existing progress and external courses remain valid.
create or replace function public.create_learning_assignment(p_learner uuid,p_course uuid,p_studio uuid,p_due date,p_practice boolean)
returns uuid language plpgsql security definer set search_path='' as $$ declare aid uuid; begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 perform 1 from public.learning_courses where id=p_course and active for update;
 if not found or not app_private.valid_assignee(p_learner,p_studio) then raise check_violation using message='Invalid learner, studio or course'; end if;
 insert into public.learning_assignments(learner_id,course_id,studio_id,due_date,requires_practice,created_by) values(p_learner,p_course,p_studio,p_due,p_practice,auth.uid()) returning id into aid;
 insert into public.learning_progress(assignment_id) values(aid); return aid;
end; $$;

create or replace function app_private.protect_assigned_course()
returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.lesson_count is distinct from old.lesson_count and exists(select 1 from public.learning_material where course_id=old.id)
 and exists(select 1 from public.learning_assignments where course_id=old.id)
 then raise check_violation using message='Assigned course content is immutable'; end if;
 return new;
end; $$;
drop trigger if exists protect_assigned_course on public.learning_courses;
create trigger protect_assigned_course before update on public.learning_courses for each row execute function app_private.protect_assigned_course();

-- The old count-only endpoint remains for externally managed legacy courses.
create or replace function public.report_learning_reads(p_assignment uuid,p_count integer)
returns void language plpgsql security definer set search_path='' as $$ declare a public.learning_assignments; maximum integer; begin
 select * into a from public.learning_assignments where id=p_assignment;
 if a.id is null or not app_private.learning_read(p_assignment) or a.learner_id<>auth.uid() then raise insufficient_privilege using message='Own learning assignment required'; end if;
 if exists(select 1 from public.learning_material where course_id=a.course_id) then raise check_violation using message='Acknowledge individual lessons'; end if;
 select lesson_count into maximum from public.learning_courses where id=a.course_id;
 if p_count is null or p_count<0 or p_count>maximum then raise check_violation using message='Invalid reading count'; end if;
 update public.learning_progress set lessons_read=greatest(lessons_read,p_count),updated_at=clock_timestamp() where assignment_id=p_assignment;
end; $$;

create or replace function public.acknowledge_learning_lesson(p_assignment uuid,p_lesson integer)
returns integer language plpgsql security definer set search_path='' as $$ declare a public.learning_assignments; maximum integer; n integer; begin
 select * into a from public.learning_assignments where id=p_assignment;
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

-- Security invoker: all returned rows and totals keep existing RLS restrictions.
create or replace function public.my_team_dashboard()
returns jsonb language plpgsql stable security invoker set search_path='' as $$ declare today date:=(current_timestamp at time zone 'Europe/Berlin')::date; begin
 if not app_private.is_active() then raise insufficient_privilege using message='Active employee profile required'; end if;
 return jsonb_build_object('today',today,
 'counts',(select jsonb_build_object('open',count(*) filter(where status<>'done'),'overdue',count(*) filter(where status<>'done' and due_date<today),'today',count(*) filter(where status<>'done' and due_date=today),'done',count(*) filter(where status='done')) from public.tasks where assignee_id=auth.uid()),
 'tasks',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from (select * from public.tasks where assignee_id=auth.uid() and status<>'done' order by due_date,case when priority='high' then 0 else 1 end,id limit 8)t),
 'learning',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'title',c.title,'due_date',a.due_date,'lesson_count',c.lesson_count,'lessons_read',p.lessons_read,'quiz_passed',p.quiz_passed,'requires_practice',a.requires_practice,'practice_confirmed',p.practice_confirmed)),'[]') from public.learning_assignments a join public.learning_courses c on c.id=a.course_id join public.learning_progress p on p.assignment_id=a.id where a.learner_id=auth.uid()),
 'knowledge',(select coalesce(jsonb_agg(to_jsonb(d)),'[]') from (select id,title,category,updated_at from public.knowledge_documents where published_version_id is not null and not archived order by updated_at desc,id limit 5)d));
end; $$;

create or replace function public.team_task_calendar(p_month date,p_studio uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$ declare start_day date:=date_trunc('month',p_month)::date; end_day date:=(date_trunc('month',p_month)+interval '1 month')::date; begin
 if not app_private.is_active() then raise insufficient_privilege using message='Active employee profile required'; end if;
 if p_month is null then raise check_violation using message='Month required'; end if;
 return jsonb_build_object('days',(select coalesce(jsonb_agg(to_jsonb(d)),'[]') from (select due_date,count(*) as total,count(*) filter(where status='done') as done from public.tasks where due_date>=start_day and due_date<end_day and (p_studio is null or studio_id=p_studio) group by due_date order by due_date)d));
end; $$;

create or replace function public.admin_pilot_status()
returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 return jsonb_build_object('migration',6,'active_users',(select count(*) from public.profiles where active),
 'tasks',(select count(*) from public.tasks),'courses',(select count(*) from public.learning_material),
 'storage_private',coalesce((select not public from storage.buckets where id='team-knowledge'),false),
 'documents',(select count(*) from public.knowledge_documents),
 'published',(select count(*) from public.knowledge_documents where published_version_id is not null and not archived),
 'drafts',(select count(*) from public.knowledge_documents where published_version_id is null and not archived),
 'pending_uploads',(select count(*) from public.knowledge_versions where state='uploading'),
 'unlinked_objects',(select count(*) from storage.objects o where o.bucket_id='team-knowledge' and not exists(select 1 from public.knowledge_versions v where v.object_path=o.name)));
end; $$;

revoke all on function app_private.protect_assigned_course() from public,anon,authenticated;
revoke all on function public.save_learning_course(uuid,text,jsonb,jsonb,jsonb,integer),public.acknowledge_learning_lesson(uuid,integer),public.submit_learning_quiz(uuid,jsonb),public.my_team_dashboard(),public.team_task_calendar(date,uuid),public.admin_pilot_status() from public,anon;
grant execute on function public.save_learning_course(uuid,text,jsonb,jsonb,jsonb,integer),public.acknowledge_learning_lesson(uuid,integer),public.submit_learning_quiz(uuid,jsonb),public.my_team_dashboard(),public.team_task_calendar(date,uuid),public.admin_pilot_status() to authenticated;
notify pgrst,'reload schema';
commit;
