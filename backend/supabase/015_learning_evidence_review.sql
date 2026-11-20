-- Apply after the existing Teamhub migrations (001–012; 013 is not required).
-- Match the Academy UI: delegated reviewers cannot approve their own evidence.
-- Existing administrator behavior and all progress/events are preserved.
begin;
do $prerequisite$ begin
 if to_regprocedure('app_private.function_studio(text,uuid)') is null
  or to_regprocedure('public.confirm_learning_practice(uuid,text)') is null
  or to_regprocedure('public.record_learning_assessment(uuid,boolean,text)') is null then
  raise exception 'Bitte zuerst die vorhandenen Teamhub-Erweiterungen vollständig ausführen.';
 end if;
end $prerequisite$;
create or replace function public.confirm_learning_practice(p_assignment uuid,p_notes text default '')
returns void language plpgsql security definer set search_path='' as $$ declare ready boolean; begin
 if not exists(select 1 from public.learning_assignments a where a.id=p_assignment and app_private.function_studio('learning.practice',a.studio_id)) then raise insufficient_privilege using message='Administrator required'; end if;
 if not app_private.is_admin() and exists(select 1 from public.learning_assignments where id=p_assignment and learner_id=auth.uid()) then raise insufficient_privilege using message='Another reviewer required for own learning evidence'; end if;
 select p.quiz_passed and p.lessons_read=c.lesson_count and a.requires_practice and not p.practice_confirmed into ready from public.learning_progress p join public.learning_assignments a on a.id=p.assignment_id join public.learning_courses c on c.id=a.course_id where a.id=p_assignment for update of p;
 if ready is distinct from true or length(p_notes)>2000 then raise check_violation using message='Learning prerequisites missing or practice already confirmed'; end if;
 update public.learning_progress set practice_confirmed=true,confirmed_by=auth.uid(),confirmed_at=clock_timestamp(),updated_at=clock_timestamp() where assignment_id=p_assignment;
 insert into public.learning_events(assignment_id,actor_id,event,notes) values(p_assignment,auth.uid(),'Practical instruction confirmed',p_notes);
 end; $$;

create or replace function public.record_learning_assessment(p_assignment uuid,p_passed boolean,p_notes text default '')
returns void language plpgsql security definer set search_path='' as $$ declare count_read integer; maximum integer; begin
 if not exists(select 1 from public.learning_assignments a where a.id=p_assignment and app_private.function_studio('learning.assess',a.studio_id)) then raise insufficient_privilege using message='Administrator required'; end if;
 if not app_private.is_admin() and exists(select 1 from public.learning_assignments where id=p_assignment and learner_id=auth.uid()) then raise insufficient_privilege using message='Another reviewer required for own learning evidence'; end if;
 select p.lessons_read,c.lesson_count into count_read,maximum from public.learning_progress p join public.learning_assignments a on a.id=p.assignment_id join public.learning_courses c on c.id=a.course_id where a.id=p_assignment;
 if maximum is null or (p_passed and count_read<>maximum) or length(p_notes)>2000 then raise check_violation using message='Reading incomplete or invalid assessment'; end if;
 update public.learning_progress set quiz_passed=p_passed,practice_confirmed=case when p_passed then practice_confirmed else false end,confirmed_by=case when p_passed then confirmed_by else null end,confirmed_at=case when p_passed then confirmed_at else null end,updated_at=clock_timestamp() where assignment_id=p_assignment;
 insert into public.learning_events(assignment_id,actor_id,event,notes) values(p_assignment,auth.uid(),case when p_passed then 'Knowledge assessment passed' else 'Knowledge assessment not passed' end,p_notes);
 end; $$;

revoke all on function public.confirm_learning_practice(uuid,text),public.record_learning_assessment(uuid,boolean,text) from public,anon;
grant execute on function public.confirm_learning_practice(uuid,text),public.record_learning_assessment(uuid,boolean,text) to authenticated;
notify pgrst,'reload schema';
commit;
