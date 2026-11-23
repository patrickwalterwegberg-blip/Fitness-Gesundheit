-- Lesende Backup-Vorprüfung für den berechtigten Betreiber im Supabase SQL Editor.
-- Vollständig ausführen. Keine Migration, kein Export und keine Wiederherstellung.
-- Keine E-Mails, Benutzerkennungen, Inhalte, Dateipfade oder Secrets in der Ausgabe.
-- estimated_rows sind Schätzwerte, keine exakten Restore-Vergleichszahlen.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '15s';
set local lock_timeout = '2s';
with expected_tables(schema_name, table_name, optional) as (
  values
    ('app_private', 'learning_answer_keys', false),
    ('app_private', 'team_assistant_requests', true),
    ('app_private', 'team_invitations', false),
    ('app_private', 'team_mail_limits', false),
    ('public', 'calendar_events', false),
    ('public', 'custom_modules', false),
    ('public', 'knowledge_documents', false),
    ('public', 'knowledge_events', false),
    ('public', 'knowledge_versions', false),
    ('public', 'learning_assignments', false),
    ('public', 'learning_attempts', false),
    ('public', 'learning_course_videos', false),
    ('public', 'learning_courses', false),
    ('public', 'learning_events', false),
    ('public', 'learning_material', false),
    ('public', 'learning_progress', false),
    ('public', 'learning_reads', false),
    ('public', 'learning_videos', false),
    ('public', 'maintenance_plans', false),
    ('public', 'module_drafts', false),
    ('public', 'module_permissions', false),
    ('public', 'module_records', false),
    ('public', 'module_versions', false),
    ('public', 'onboarding_enrollments', false),
    ('public', 'onboarding_events', false),
    ('public', 'onboarding_steps', false),
    ('public', 'onboarding_templates', false),
    ('public', 'profiles', false),
    ('public', 'studio_memberships', false),
    ('public', 'studios', false),
    ('public', 'task_comments', false),
    ('public', 'tasks', false),
    ('public', 'team_access_events', false),
    ('public', 'team_chat_channels', false),
    ('public', 'team_chat_messages', false),
    ('public', 'team_chat_reads', false),
    ('public', 'team_feedback', false),
    ('public', 'team_feedback_events', false),
    ('public', 'team_feedback_routes', false),
    ('public', 'team_function_access', false),
    ('public', 'team_home_editors', false),
    ('public', 'team_home_items', false),
    ('public', 'team_member_info', false),
    ('public', 'team_notifications', false),
    ('public', 'team_page_access', false),
    ('auth', 'users', false),
    ('auth', 'identities', false)
), table_inventory as (
  select e.schema_name, e.table_name, e.optional,
    c.oid is not null as present,
    case when c.oid is not null then c.relrowsecurity end as rls_enabled,
    case when c.reltuples >= 0 then c.reltuples::bigint end as estimated_rows
  from expected_tables e
  left join pg_namespace n on n.nspname = e.schema_name
  left join pg_class c on c.relnamespace = n.oid and c.relname = e.table_name and c.relkind in ('r','p')
), expected_buckets(id) as (
  values ('team-knowledge'), ('course-videos')
), bucket_inventory as (
  select e.id as bucket, b.id is not null as present,
    case when b.id is not null then not b.public end as private,
    b.file_size_limit as size_limit,
    count(o.id) as objects_in_metadata,
    coalesce(sum(case when o.metadata->>'size' ~ '^[0-9]{1,18}$' then (o.metadata->>'size')::numeric else 0 end),0)::text as recorded_bytes,
    count(o.id) filter (where o.metadata->>'size' is null or o.metadata->>'size' !~ '^[0-9]{1,18}$') as objects_without_size_metadata
  from expected_buckets e
  left join storage.buckets b on b.id = e.id
  left join storage.objects o on o.bucket_id = b.id
  group by e.id,b.id,b.public,b.file_size_limit
), expected_routines(signature) as (
  values ('public.admin_controlling()'),
    ('public.admin_operations_status()'),
    ('public.confirm_learning_practice(uuid,text)'),
    ('public.learning_evidence(uuid)'),
    ('public.admin_team_directory(integer,integer,text,text,text,uuid)')
)
select jsonb_build_object(
  'kind','read_only_backup_preflight_not_a_backup',
  'checked_at',transaction_timestamp(),
  'read_only',current_setting('transaction_read_only') = 'on',
  'server_version',current_setting('server_version'),
  'table_inventory',(select jsonb_agg(to_jsonb(t) order by t.schema_name,t.table_name) from table_inventory t),
  'additional_app_table_count',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','app_private') and c.relkind in ('r','p') and not exists(select 1 from expected_tables e where e.schema_name=n.nspname and e.table_name=c.relname)),
  'storage_inventory',(select jsonb_agg(to_jsonb(b) order by b.bucket) from bucket_inventory b),
  'routine_presence',(select jsonb_agg(jsonb_build_object('routine',signature,'present',to_regprocedure(signature) is not null) order by signature) from expected_routines),
  'pg_cron_extension_present',exists(select 1 from pg_extension where extname = 'pg_cron'),
  'cron_job_table_present',to_regclass('cron.job') is not null,
  'backup_created',false,
  'restore_verified',false,
  'storage_bytes_verified',false
) as backup_readiness_inventory;
rollback;
