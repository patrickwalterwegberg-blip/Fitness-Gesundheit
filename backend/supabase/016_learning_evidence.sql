-- Personal, read-only internal evidence. Apply after the existing migrations
-- including 015; no model/SMTP setup is required. Never backfill completion dates.
begin;
do $prerequisite$ begin
 if to_regprocedure('app_private.learning_read(uuid)') is null
  or to_regclass('public.learning_material') is null then
  raise exception 'Bitte zuerst die vorhandenen Teamhub-Erweiterungen vollständig ausführen.';
 end if;
end $prerequisite$;
create or replace function public.learning_evidence(p_assignment uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare evidence record;
begin
 -- Existing reading rights are necessary, but never sufficient for a colleague's
 -- document. No implicit directory/profile rights for delegated assessors.
 if not app_private.learning_read(p_assignment) or not exists(
  select 1 from public.learning_assignments a where a.id=p_assignment and a.learner_id=auth.uid()
 ) then raise insufficient_privilege using message='Own learning evidence required'; end if;
 select a.id,a.requires_practice,p.lessons_read,p.quiz_passed,p.practice_confirmed,
  p.confirmed_by,p.confirmed_at,c.title,c.lesson_count,m.revision,
  learner.full_name,studio.name as studio_name
 into evidence
 from public.learning_assignments a
 join public.learning_progress p on p.assignment_id=a.id
 join public.learning_courses c on c.id=a.course_id
 join public.profiles learner on learner.id=a.learner_id
 join public.studios studio on studio.id=a.studio_id
 left join public.learning_material m on m.course_id=c.id
 where a.id=p_assignment;
 if not found or evidence.lessons_read is distinct from evidence.lesson_count
  or evidence.quiz_passed is distinct from true
  or (evidence.requires_practice and (evidence.practice_confirmed is distinct from true
   or evidence.confirmed_by is null or evidence.confirmed_at is null)) then
  raise check_violation using message='Learning evidence is not complete';
 end if;
 return jsonb_build_object('version',1,'assignment_id',evidence.id,
  'learner_name',evidence.full_name,'studio_name',evidence.studio_name,
  'course_title',evidence.title,'course_revision',evidence.revision,
  'lesson_count',evidence.lesson_count,'lessons_read',evidence.lessons_read,
  'knowledge_confirmed',true,'requires_practice',evidence.requires_practice,
  'practice_confirmed',case when evidence.requires_practice then evidence.practice_confirmed else false end,
  'practice_confirmed_at',case when evidence.requires_practice then evidence.confirmed_at else null end,
  'checked_at',statement_timestamp());
end; $$;
revoke all on function public.learning_evidence(uuid) from public,anon;
grant execute on function public.learning_evidence(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
