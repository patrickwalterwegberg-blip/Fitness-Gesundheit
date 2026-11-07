-- Read-only operational inventory. Apply after 001–012; 013 is optional.
begin;
do $prerequisite$ begin
 if to_regclass('public.onboarding_enrollments') is null then raise exception 'Bitte zuerst Erweiterungen 001–012 vollständig ausführen.'; end if;
end $prerequisite$;
create or replace function public.admin_operations_status()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare buckets jsonb; tables jsonb; cron_installed boolean; cron_active integer;
begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Active administrator required'; end if;
 -- Return only predetermined metadata and counters. Never contents, identities,
 -- mail addresses, SQL policy expressions, cron commands or provider secrets.
 select jsonb_agg(jsonb_build_object('id',e.id,'exists',b.id is not null,
   'private',case when b.id is null then null else not b.public end,
   'size_limit',b.file_size_limit) order by e.id) into buckets
 from (values('team-knowledge'),('course-videos')) e(id)
 left join storage.buckets b on b.id=e.id;
 select jsonb_agg(jsonb_build_object('name',e.name,'exists',c.oid is not null,
   'rls',coalesce(c.relrowsecurity,false),'anonymous_select',
   case when c.oid is null then null else has_any_column_privilege('anon',c.oid,'SELECT') end) order by e.name) into tables
 from (values('profiles'),('tasks'),('calendar_events'),('knowledge_documents'),
   ('knowledge_versions'),('learning_videos'),('team_chat_messages'),
   ('team_feedback'),('onboarding_enrollments'),('team_function_access')) e(name)
 left join pg_namespace n on n.nspname='public'
 left join pg_class c on c.relnamespace=n.oid and c.relname=e.name and c.relkind in('r','p');
 select exists(select 1 from pg_extension where extname='pg_cron') into cron_installed;
 cron_active:=null;
 if cron_installed and to_regclass('cron.job') is not null then
  execute 'select count(*)::integer from cron.job where jobname=''teamhub-due-notifications'' and active' into cron_active;
 end if;
 return jsonb_build_object('version',1,'checked_at',clock_timestamp(),
 'buckets',buckets,'tables',tables,
 'private_schema_anonymous',has_schema_privilege('anon','app_private','USAGE'),
 'installations',jsonb_build_object(
   'onboarding',to_regclass('public.onboarding_enrollments') is not null,
   'assistant',to_regprocedure('public.team_assistant_status()') is not null
     and to_regprocedure('public.reserve_team_assistant_request()') is not null),
 'cron',jsonb_build_object('installed',cron_installed,'active_jobs',cron_active),
 'quality',jsonb_build_object(
   'active_without_studio',(select count(*) from public.profiles p where p.active and p.role<>'admin' and not exists(select 1 from public.studio_memberships m where m.user_id=p.id)),
   'auth_without_profile',(select count(*) from auth.users u where not exists(select 1 from public.profiles p where p.id=u.id)),
   'duplicate_email_groups',(select count(*) from (select lower(trim(email)) from auth.users where coalesce(trim(email),'')<>'' group by lower(trim(email)) having count(*)>1) x),
   'invalid_published_versions',(select count(*) from public.knowledge_documents d left join public.knowledge_versions v on v.id=d.published_version_id where d.published_version_id is not null and (v.id is null or v.document_id<>d.id or v.state<>'ready' or v.published_at is null)),
   'pending_knowledge_uploads',(select count(*) from public.knowledge_versions where state='uploading'),
   'unlinked_knowledge_objects',(select count(*) from storage.objects o where o.bucket_id='team-knowledge' and not exists(select 1 from public.knowledge_versions v where v.object_path=o.name)),
   'missing_knowledge_objects',(select count(*) from public.knowledge_versions v where v.kind='file' and v.state='ready' and not exists(select 1 from storage.objects o where o.bucket_id='team-knowledge' and o.name=v.object_path)),
   'missing_video_objects',(select count(*) from public.learning_videos v where v.state='ready' and not exists(select 1 from storage.objects o where o.bucket_id='course-videos' and o.name=v.object_path)),
   'pending_video_uploads',(select count(*) from public.learning_videos where state='uploading'),
   'unlinked_video_objects',(select count(*) from storage.objects o where o.bucket_id='course-videos' and not exists(select 1 from public.learning_videos v where v.object_path=o.name))));
end; $$;
revoke all on function public.admin_operations_status() from public,anon;
grant execute on function public.admin_operations_status() to authenticated;
notify pgrst,'reload schema';
commit;
