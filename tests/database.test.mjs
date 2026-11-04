import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db, a, b;
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ids = { admin: id(1), manager: id(2), employee: id(3), peer: id(4), other: id(5), inactive: id(6), reader: id(7) };
before(async () => {
db = new PGlite();
await db.waitReady;
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users(id uuid primary key,email text unique,raw_user_meta_data jsonb not null default '{}',last_sign_in_at timestamptz,invited_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to authenticated, anon;
  create schema storage;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,metadata jsonb,unique(bucket_id,name));
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated,anon;
  grant select,insert,update,delete on storage.objects to authenticated,anon;
`);
const migration = await readFile('backend/supabase/001_team.sql', 'utf8');
await db.exec(migration);
// Re-applying the new-project setup must preserve its seeded studios.
await db.exec(migration);
const administration = await readFile('backend/supabase/002_modules_controlling.sql', 'utf8');
await db.exec(administration);
await db.exec(administration);
const access = await readFile('backend/supabase/003_team_access.sql', 'utf8');
await db.exec(access);
await db.exec(access);
const knowledge = await readFile('backend/supabase/004_knowledge_files.sql','utf8');
await db.exec(knowledge);
await db.exec(knowledge);
const users = await readFile('backend/supabase/005_user_management.sql','utf8');
await db.exec(users);
await db.exec(users);
const pilot = await readFile('backend/supabase/006_pilot_learning.sql','utf8');
await db.exec(pilot);
await db.exec(pilot);
for (const [role, uid] of Object.entries(ids)) {
  await db.query('insert into auth.users(id,email) values ($1,$2)', [uid, role+'@example.org']);
  await db.query('insert into public.profiles(id,full_name,role,active) values ($1,$2,$3,$4)', [uid, role, role === 'admin' ? 'admin' : role === 'manager' ? 'studio_manager' : 'employee', role !== 'inactive']);
}
const sites = (await db.query('select id,name from public.studios')).rows;
a = sites.find(s => s.name === 'Dörpen').id;
b = sites.find(s => s.name === 'Sögel').id;
for (const who of ['manager', 'employee', 'peer', 'inactive', 'reader']) await db.query('insert into public.studio_memberships values ($1,$2)', [ids[who], a]);
await db.query('insert into public.studio_memberships values ($1,$2)', [ids.other, b]);
await db.query('insert into public.module_permissions(user_id,can_create,can_edit,can_publish) values ($1,true,true,false),($2,true,true,true)', [ids.employee, ids.peer]);
await db.query("select set_config('request.jwt.claim.sub',$1,false)", [ids.admin]);
for (const [n, person, site] of [[10, 'employee', a], [11, 'peer', a], [12, 'other', b]]) await db.query('insert into public.tasks(id,title,studio_id,assignee_id,due_date) values ($1,$2,$3,$4,$5)', [id(n), person + ' task', site, ids[person], '2026-11-04']);
await db.query("select set_config('request.jwt.claim.sub','',false)");
});
const asUser = (who, fn) => db.transaction(async tx => {
  await tx.exec('set local role authenticated');
  await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [ids[who]]);
  return fn(tx);
});
after(() => db.close());

test('seven real studios are seeded exactly once', async () => { assert.equal((await db.query('select * from public.studios')).rows.length, 7); });
test('employee sees only own assigned task and own studio', async () => {
  const tasks = await asUser('employee', tx => tx.query('select * from public.tasks'));
  assert.deepEqual(tasks.rows.map(t => t.id), [id(10)]);
  assert.deepEqual((await asUser('employee', tx => tx.query('select name from public.studios'))).rows.map(s => s.name), ['Dörpen']);
});
test('studio manager sees team tasks, but no other studio', async () => {
  assert.deepEqual((await asUser('manager', tx => tx.query('select id from public.tasks order by id'))).rows.map(t => t.id), [id(10), id(11)]);
});
test('administrator sees every studio and task', async () => {
  assert.equal((await asUser('admin', tx => tx.query('select * from public.tasks'))).rows.length, 3);
  assert.equal((await asUser('admin', tx => tx.query('select * from public.studios'))).rows.length, 7);
});
test('employee can set own status, completion timestamp is authoritative', async () => {
  const result = await asUser('employee', tx => tx.query("update public.tasks set status='done',completed_at='2000-01-01',updated_at='2000-01-01',completed_by=$2 where id=$1 returning completed_at,updated_at,completed_by", [id(10), ids.admin]));
  assert.ok(new Date(result.rows[0].completed_at).getFullYear() > 2020);
  assert.ok(new Date(result.rows[0].updated_at).getFullYear() > 2020);
  assert.equal(result.rows[0].completed_by, ids.employee);
  const preserved = await asUser('employee', tx => tx.query('update public.tasks set completed_by=$2 where id=$1 returning completed_by', [id(10), ids.admin]));
  assert.equal(preserved.rows[0].completed_by, ids.employee);
});
test('employee cannot change due date, assignee or description', async () => {
  await assert.rejects(asUser('employee', tx => tx.query("update public.tasks set due_date='2030-01-01' where id=$1", [id(10)])), /only task status/);
  await assert.rejects(asUser('employee', tx => tx.query('update public.tasks set assignee_id=$1 where id=$2', [ids.peer, id(10)])), /only task status/);
  await assert.rejects(asUser('employee', tx => tx.query("update public.tasks set description='rewritten' where id=$1", [id(10)])), /only task status/);
});
test('employee cannot update a colleague task or create a task', async () => {
  const result = await asUser('employee', tx => tx.query("update public.tasks set status='done' where id=$1 returning id", [id(11)]));
  assert.equal(result.rows.length, 0);
  await assert.rejects(asUser('employee', tx => tx.query('insert into public.tasks(title,studio_id,assignee_id,due_date) values ($1,$2,$3,$4)', ['unauthorized', a, ids.employee, '2026-11-04'])), /requires a manager/);
});
test('manager cannot assign an employee from another studio', async () => {
  await assert.rejects(asUser('manager', tx => tx.query('update public.tasks set assignee_id=$1 where id=$2', [ids.other, id(10)])), /belong to the studio/);
});
test('employee cannot promote their role or create a new membership', async () => {
  await assert.rejects(asUser('employee', tx => tx.query("update public.profiles set role='admin' where id=$1 returning id", [ids.employee])), /permission denied/);
  await assert.rejects(asUser('employee', tx => tx.query('insert into public.studio_memberships values ($1,$2)', [ids.employee, b])), /permission denied/);
});
test('comments are visible only with task access and cannot impersonate others', async () => {
  await asUser('employee', tx => tx.query('insert into public.task_comments(task_id,body) values ($1,$2)', [id(10), 'My update']));
  assert.equal((await asUser('employee', tx => tx.query('select * from public.task_comments'))).rows.length, 1);
  assert.equal((await asUser('peer', tx => tx.query('select * from public.task_comments'))).rows.length, 0);
  await assert.rejects(asUser('employee', tx => tx.query('insert into public.task_comments(task_id,body,author_id) values ($1,$2,$3)', [id(10), 'spoofed', ids.admin])), /row-level security/);
  await assert.rejects(asUser('other', tx => tx.query('insert into public.task_comments(task_id,body) values ($1,$2)', [id(10), 'wrong studio'])), /row-level security/);
});
test('inactive users cannot read even their own profile or tasks', async () => {
  assert.equal((await asUser('inactive', tx => tx.query('select * from public.profiles'))).rows.length, 0);
  assert.equal((await asUser('inactive', tx => tx.query('select * from public.tasks'))).rows.length, 0);
});
test('anonymous clients cannot read team tables', async () => {
  await assert.rejects(db.transaction(async tx => { await tx.exec('set local role anon'); return tx.query('select * from public.tasks'); }), /permission denied/);
});

let moduleId, versionOne, versionTwo, recordId, assignmentId;
const schema = { title: 'Versioned test module', description: '', target: 'standalone', studios: ['Dörpen'], readerRoles: ['employee'], writerRoles: ['employee'], fields: [{ id: 'f1', label: 'First field', type: 'text', required: true }, { id: 'f2', label: 'Number', type: 'number', required: false }] };
test('selected editor can save a draft but cannot publish or grant their own rights', async () => {
  const saved = await asUser('employee', tx => tx.query('select public.save_module_draft(null,$1::jsonb,0) as result', [JSON.stringify(schema)]));
  moduleId = saved.rows[0].result.id;
  await assert.rejects(asUser('employee', tx => tx.query('select public.publish_module($1,1)', [moduleId])), /publication not granted/);
  await assert.rejects(asUser('employee', tx => tx.query('update public.module_permissions set can_publish=true where user_id=$1 returning user_id', [ids.employee])).then(r => { if (r.rows.length === 0) throw Error('RLS denied escalation'); }), /RLS denied|row-level security/);
});
test('ordinary users cannot read drafts and stale revisions cannot overwrite them', async () => {
  assert.equal((await asUser('reader', tx => tx.query('select * from public.module_drafts'))).rows.length, 0);
  await assert.rejects(asUser('employee', tx => tx.query('select public.save_module_draft($1,$2::jsonb,0)', [moduleId, JSON.stringify(schema)])), /revision changed/);
});
test('separate publisher can release a draft; published fields cannot be overwritten directly', async () => {
  const result = await asUser('peer', tx => tx.query('select public.publish_module($1,1) as result', [moduleId]));
  versionOne = result.rows[0].result.published_version_id;
  assert.equal((await asUser('reader', tx => tx.query('select * from public.custom_modules where id=$1', [moduleId]))).rows.length, 1);
  await assert.rejects(asUser('peer', tx => tx.query("update public.module_versions set schema='{}' where id=$1", [versionOne])), /permission denied/);
});
test('record validation enforces required fields, types and studio permissions', async () => {
  await assert.rejects(asUser('reader', tx => tx.query('select public.save_module_record($1,$2,$3,$4::jsonb)', [moduleId, versionOne, a, '{}'])), /Required field missing/);
  await assert.rejects(asUser('reader', tx => tx.query('select public.save_module_record($1,$2,$3,$4::jsonb)', [moduleId, versionOne, a, JSON.stringify({ f1: 'original', f2: 'not a number' })])), /Invalid number/);
  await assert.rejects(asUser('other', tx => tx.query('select public.save_module_record($1,$2,$3,$4::jsonb)', [moduleId, versionOne, a, JSON.stringify({ f1: 'wrong studio' })])), /not accessible/);
  const result = await asUser('reader', tx => tx.query('select public.save_module_record($1,$2,$3,$4::jsonb) as result', [moduleId, versionOne, a, JSON.stringify({ f1: 'original', f2: 12 })]));
  recordId = result.rows[0].result.id;
  assert.equal((await asUser('other', tx => tx.query('select * from public.module_records'))).rows.length, 0);
});
test('a new module version preserves the original schema and old record values', async () => {
  const changed = { ...schema, fields: [{ id: 'f1', label: 'First field', type: 'number', required: true }, { id: 'f3', label: 'Confirmed', type: 'checkbox', required: true }] };
  await asUser('employee', tx => tx.query('select public.save_module_draft($1,$2::jsonb,2)', [moduleId, JSON.stringify(changed)]));
  const result = await asUser('peer', tx => tx.query('select public.publish_module($1,3) as result', [moduleId]));
  versionTwo = result.rows[0].result.published_version_id;
  assert.equal((await asUser('reader', tx => tx.query('select data from public.module_records where id=$1', [recordId]))).rows[0].data.f1, 'original');
  assert.equal((await asUser('reader', tx => tx.query('select schema from public.module_versions where id=$1', [versionOne]))).rows[0].schema.fields[0].type, 'text');
  await assert.rejects(asUser('reader', tx => tx.query('select public.save_module_record($1,$2,$3,$4::jsonb)', [moduleId, versionOne, a, JSON.stringify({ f1: 'new stale record' })])), /version changed/);
  await asUser('reader', tx => tx.query('select public.save_module_record($1,$2,$3,$4::jsonb,$5,1)', [moduleId, versionOne, a, JSON.stringify({ f1: 'updated using original schema', f2: 15 }), recordId]));
});
test('restore creates a third version without removing history or records', async () => {
  await asUser('peer', tx => tx.query('select public.restore_module_version($1,$2,4)', [moduleId, versionOne]));
  assert.equal((await db.query('select * from public.module_versions where module_id=$1', [moduleId])).rows.length, 3);
  assert.equal((await db.query('select * from public.module_records where id=$1', [recordId])).rows.length, 1);
});
test('task extension records cannot expose a colleague task', async () => {
  const target = { ...schema, title: 'Task extension', target: 'tasks' };
  const saved = await asUser('admin', tx => tx.query('select public.save_module_draft(null,$1::jsonb,0) as result', [JSON.stringify(target)]));
  const mid = saved.rows[0].result.id;
  const released = await asUser('admin', tx => tx.query('select public.publish_module($1,1) as result', [mid]));
  const vid = released.rows[0].result.published_version_id;
  await assert.rejects(asUser('reader', tx => tx.query('select public.save_module_record($1,$2,$3,$4::jsonb,null,null,$5)', [mid, vid, a, JSON.stringify({ f1: 'not mine' }), id(10)])), /not accessible/);
  await asUser('employee', tx => tx.query('select public.save_module_record($1,$2,$3,$4::jsonb,null,null,$5)', [mid, vid, a, JSON.stringify({ f1: 'my own task' }), id(10)]));
  assert.equal((await asUser('reader', tx => tx.query('select * from public.module_records where module_id=$1', [mid]))).rows.length, 0);
});
test('builder publication rights do not grant controlling access; revocation takes effect', async () => {
  await assert.rejects(asUser('peer', tx => tx.query('select public.admin_controlling()')), /administrator/);
  await db.query('update public.module_permissions set can_create=false,can_edit=false,can_publish=false where user_id=$1', [ids.peer]);
  await assert.rejects(asUser('peer', tx => tx.query('select public.save_module_draft($1,$2::jsonb,6)', [moduleId, JSON.stringify(schema)])), /editing not granted/);
});
test('only admin can assign learning goals and learning progress cannot be forged directly', async () => {
  await db.query('insert into public.learning_courses(id,title,lesson_count) values ($1,$2,2)', [id(30), 'Actual course fixture']);
  await assert.rejects(asUser('employee', tx => tx.query('select public.create_learning_assignment($1,$2,$3,null,true)', [ids.employee, id(30), a])), /Administrator required/);
  const result = await asUser('admin', tx => tx.query('select public.create_learning_assignment($1,$2,$3,null,true) as id', [ids.employee, id(30), a]));
  assignmentId = result.rows[0].id;
  await assert.rejects(asUser('employee', tx => tx.query('update public.learning_progress set quiz_passed=true where assignment_id=$1', [assignmentId])), /permission denied/);
  await assert.rejects(asUser('reader', tx => tx.query('select public.report_learning_reads($1,2)', [assignmentId])), /Own learning assignment/);
  await asUser('employee', tx => tx.query('select public.report_learning_reads($1,2)', [assignmentId]));
});
test('knowledge and practical confirmations are separate and administrator-only', async () => {
  await assert.rejects(asUser('admin', tx => tx.query('select public.confirm_learning_practice($1)', [assignmentId])), /prerequisites/);
  await assert.rejects(asUser('employee', tx => tx.query('select public.record_learning_assessment($1,true)', [assignmentId])), /Administrator required/);
  await asUser('admin', tx => tx.query('select public.record_learning_assessment($1,true,$2)', [assignmentId, 'Assessed externally']));
  await assert.rejects(asUser('employee', tx => tx.query('select public.confirm_learning_practice($1)', [assignmentId])), /Administrator required/);
  await asUser('admin', tx => tx.query('select public.confirm_learning_practice($1,$2)', [assignmentId, 'Practical instruction observed']));
  const result = await asUser('employee', tx => tx.query('select * from public.learning_progress where assignment_id=$1', [assignmentId]));
  assert.equal(result.rows[0].confirmed_by, ids.admin);
  assert.equal(result.rows[0].practice_confirmed, true);
  assert.equal((await asUser('reader', tx => tx.query('select * from public.learning_progress'))).rows.length, 0);
  await assert.rejects(asUser('admin', tx => tx.query('select public.confirm_learning_practice($1)', [assignmentId])), /already confirmed/);
});
test('admin controlling returns source data but contains no feedback or anonymous reports', async () => {
  const result = (await asUser('admin', tx => tx.query('select public.admin_controlling() as result'))).rows[0].result;
  assert.equal(result.assignments.length, 1);
  assert.equal(result.tasks.length, 3);
  assert.deepEqual(Object.keys(result).sort(), ['assignments','courses','profiles','progress','studios','tasks']);
});

test('release saves and publishes atomically, rolling back invalid drafts', async () => {
  const result = await asUser('admin', tx => tx.query('select public.release_module(null,$1::jsonb,0) as result', [JSON.stringify({ ...schema, title: 'Atomic release' })]));
  const mid = result.rows[0].result.id;
  assert.equal(result.rows[0].result.revision, 2);
  assert.equal((await db.query('select * from public.module_drafts where module_id=$1', [mid])).rows.length, 0);
  const invalid = { ...schema, fields: [{ id: 'f1', label: '', type: 'text', required: false }] };
  await assert.rejects(asUser('admin', tx => tx.query('select public.release_module($1,$2::jsonb,2)', [mid, JSON.stringify(invalid)])), /Field names/);
  assert.equal((await db.query('select revision from public.custom_modules where id=$1', [mid])).rows[0].revision, 2);
  assert.equal((await db.query('select * from public.module_versions where module_id=$1', [mid])).rows.length, 1);
  assert.equal((await db.query('select * from public.module_drafts where module_id=$1', [mid])).rows.length, 0);
});

test('published schemas reject malformed selection options', async () => {
  const malformed = { ...schema, fields: [{ id: 'f1', label: 'Invalid choices', type: 'select', required: true, options: [12] }] };
  await assert.rejects(asUser('admin', tx => tx.query('select public.release_module(null,$1::jsonb,0)', [JSON.stringify(malformed)])), /Invalid selection options/);
});

test('reopening and completing a task replaces the server completion actor', async () => {
  const reopened = await asUser('admin', tx => tx.query("update public.tasks set status='open' where id=$1 returning completed_at,completed_by", [id(10)]));
  assert.equal(reopened.rows[0].completed_at, null);
  assert.equal(reopened.rows[0].completed_by, null);
  const done = await asUser('admin', tx => tx.query("update public.tasks set status='done',completed_by=$2 where id=$1 returning completed_by", [id(10), ids.employee]));
  assert.equal(done.rows[0].completed_by, ids.admin);
});

let invitedId = id(80);
test('only administrators can read account emails and stage invitations', async () => {
  const result = (await asUser('admin', tx => tx.query('select public.admin_team_directory() as data'))).rows[0].data;
  assert.equal(result.members.length, 7);
  assert.equal(result.members.find(m => m.id===ids.employee).email, 'employee@example.org');
  assert.equal(result.studios.length, 7);
  for (const who of ['employee','manager','inactive']) {
    await assert.rejects(asUser(who, tx => tx.query('select public.admin_team_directory()')), /Administrator required/);
    await assert.rejects(asUser(who, tx => tx.query('select public.admin_prepare_team_invitation($1,$2,$3,$4)', ['new@example.org','New colleague','admin',[]])), /Administrator required/);
  }
  await assert.rejects(asUser('employee', tx => tx.query('select * from app_private.team_invitations')), /permission denied/);
});
test('a staged invitation provisions its employee profile and studio atomically', async () => {
  const pending = (await asUser('admin', tx => tx.query('select public.admin_prepare_team_invitation($1,$2,$3,$4) as id', [' Invited@example.org ','Invited colleague','employee',[a]]))).rows[0].id;
  await db.query('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)', [invitedId,'invited@example.org',JSON.stringify({team_invitation_id:pending,role:'admin'})]);
  const profile = (await db.query('select * from public.profiles where id=$1',[invitedId])).rows[0];
  assert.equal(profile.role,'employee'); assert.equal(profile.active,true);
  assert.equal((await db.query('select studio_id from public.studio_memberships where user_id=$1',[invitedId])).rows[0].studio_id,a);
  assert.equal((await db.query('select provisioned_user_id from app_private.team_invitations where id=$1',[pending])).rows[0].provisioned_user_id,invitedId);
  await assert.rejects(asUser('admin', tx => tx.query('select public.admin_prepare_team_invitation($1,$2,$3,$4)', ['invited@example.org','Duplicate','employee',[a]])), /Account already exists/);
});
test('uninvited auth metadata cannot create an administrator profile', async () => {
  await db.query('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)', [id(81),'not-invited@example.org',JSON.stringify({team_invitation_id:id(999),role:'admin',active:true})]);
  assert.equal((await db.query('select * from public.profiles where id=$1',[id(81)])).rows.length,0);
  await assert.rejects(asUser('admin', tx => tx.query('select public.admin_prepare_team_invitation($1,$2,$3,$4)', ['nostudio@example.org','No site','employee',[]])), /require a studio/);
});
test('access updates are atomic, revision checked and cannot remove the acting admin', async () => {
  const original = (await db.query('select access_updated_at from public.profiles where id=$1',[invitedId])).rows[0].access_updated_at;
  await asUser('admin', tx => tx.query('select public.admin_set_team_access($1,$2,$3,$4,$5,$6)', [invitedId,'Studio colleague','studio_manager',[b],true,original]));
  const changed = (await db.query('select * from public.profiles where id=$1',[invitedId])).rows[0];
  assert.equal(changed.role,'studio_manager');
  assert.deepEqual((await db.query('select studio_id from public.studio_memberships where user_id=$1',[invitedId])).rows.map(s=>s.studio_id),[b]);
  await assert.rejects(asUser('admin', tx => tx.query('select public.admin_set_team_access($1,$2,$3,$4,$5,$6)', [invitedId,'Stale overwrite','admin',[],true,original])), /access changed/);
  const admin = (await db.query('select access_updated_at from public.profiles where id=$1',[ids.admin])).rows[0];
  await assert.rejects(asUser('admin', tx => tx.query('select public.admin_set_team_access($1,$2,$3,$4,$5,$6)', [ids.admin,'Admin','employee',[a],true,admin.access_updated_at])), /own administrator/);
  await assert.rejects(asUser('admin', tx => tx.query('select public.admin_set_team_access($1,$2,$3,$4,$5,$6)', [ids.admin,'Admin','admin',[],false,admin.access_updated_at])), /own administrator/);
  await assert.rejects(asUser('employee', tx => tx.query('select public.admin_set_team_access($1,$2,$3,$4,$5,$6)', [invitedId,'Promotion','admin',[],true,changed.access_updated_at])), /Administrator required/);
});
test('login link targets reject inactive accounts and enforce a retry delay', async () => {
  assert.equal((await asUser('admin', tx => tx.query('select public.admin_team_login_target($1) as email',[invitedId]))).rows[0].email,'invited@example.org');
  await assert.rejects(asUser('admin', tx => tx.query('select public.admin_team_login_target($1)',[invitedId])), /Wait 60 seconds/);
  const current = (await db.query('select access_updated_at from public.profiles where id=$1',[invitedId])).rows[0];
  await asUser('admin', tx => tx.query('select public.admin_set_team_access($1,$2,$3,$4,$5,$6)', [invitedId,'Studio colleague','studio_manager',[b],false,current.access_updated_at]));
  await assert.rejects(asUser('admin', tx => tx.query('select public.admin_team_login_target($1)',[invitedId])), /Active provisioned/);
  assert.equal((await asUser('employee', tx => tx.query('select * from public.team_access_events'))).rows.length,0);
  assert.ok((await asUser('admin', tx => tx.query('select * from public.team_access_events'))).rows.length>0);
});
test('an invitation cannot provision access after its administrator is disabled', async () => {
  const pending = (await asUser('admin', tx => tx.query('select public.admin_prepare_team_invitation($1,$2,$3,$4) as id', ['expired-admin@example.org','New colleague','employee',[a]]))).rows[0].id;
  await db.query('update public.profiles set active=false where id=$1',[ids.admin]);
  try { await assert.rejects(db.query('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)', [id(82),'expired-admin@example.org',JSON.stringify({team_invitation_id:pending})]), /no longer an administrator/); }
  finally { await db.query('update public.profiles set active=true where id=$1',[ids.admin]); }
  assert.equal((await db.query('select * from public.profiles where id=$1',[id(82)])).rows.length,0);
  assert.equal((await db.query('select * from auth.users where id=$1',[id(82)])).rows.length,0);
});

let knowledgeDoc, articleOne, articleTwo, upload;
const knowledgeArgs = (overrides={}) => {
 const p = { document:null,revision:0,title:'Empfangsleitfaden',summary:'Gemeinsame Arbeitsanweisung',category:'Empfang & Service',tags:['Empfang','Ablagekennwort'],studio:a,roles:['admin','studio_manager','employee'],kind:'article',name:null,mime:null,size:null,text:'Das blaue Handtuch liegt neben dem Empfang. Sicherheitsprüfung vor Öffnung.',...overrides };
 return [p.document,p.revision,p.title,p.summary,p.category,p.tags,p.studio,p.roles,p.kind,p.name,p.mime,p.size,p.text];
};
const prepareKnowledge = (who,overrides={}) => asUser(who,tx=>tx.query('select public.prepare_knowledge_version($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) as result',knowledgeArgs(overrides))).then(r=>r.rows[0].result);
test('knowledge storage remains private and a draft is visible only to its creator and studio management',async()=>{
 assert.equal((await db.query("select public,file_size_limit from storage.buckets where id='team-knowledge'")).rows[0].public,false);
 const result = await prepareKnowledge('employee');knowledgeDoc=result.document_id;articleOne=result.version_id;
 assert.equal((await asUser('employee',tx=>tx.query('select * from public.knowledge_documents'))).rows.length,1);
 assert.equal((await asUser('reader',tx=>tx.query('select * from public.knowledge_documents'))).rows.length,0);
 assert.equal((await asUser('manager',tx=>tx.query('select * from public.knowledge_documents'))).rows.length,1);
 assert.equal((await asUser('other',tx=>tx.query('select * from public.knowledge_documents'))).rows.length,0);
 await assert.rejects(prepareKnowledge('employee',{studio:null}),/studio not granted/);
 await assert.rejects(prepareKnowledge('employee',{studio:b}),/studio not granted/);
});
test('only appropriate management publishes and search returns approved scoped contents',async()=>{
 await assert.rejects(asUser('employee',tx=>tx.query('select public.publish_knowledge_version($1,$2,1)',[knowledgeDoc,articleOne])),/publication requires/);
 await asUser('manager',tx=>tx.query('select public.publish_knowledge_version($1,$2,1)',[knowledgeDoc,articleOne]));
 assert.equal((await asUser('reader',tx=>tx.query('select * from public.knowledge_documents'))).rows.length,1);
 const found=(await asUser('reader',tx=>tx.query("select public.search_knowledge('Handtuch') as result"))).rows[0].result;
 assert.equal(found.total,1);assert.match(found.items[0].excerpt,/blaue/);
 assert.equal((await asUser('reader',tx=>tx.query("select public.search_knowledge('Ablagekennwort') as result"))).rows[0].result.total,1);
 assert.equal((await asUser('other',tx=>tx.query("select public.search_knowledge('Handtuch') as result"))).rows[0].result.total,0);
});
test('new document versions preserve approved metadata and stay hidden until release',async()=>{
 const result=await prepareKnowledge('employee',{document:knowledgeDoc,revision:2,title:'Neuer Leitfaden',text:'Unveröffentlichter Ablauf mit geheimem Suchwort Teekanne.'});articleTwo=result.version_id;
 assert.equal((await asUser('reader',tx=>tx.query('select title from public.knowledge_documents where id=$1',[knowledgeDoc]))).rows[0].title,'Empfangsleitfaden');
 assert.equal((await asUser('reader',tx=>tx.query('select * from public.knowledge_versions where id=$1',[articleTwo]))).rows.length,0);
 assert.equal((await asUser('reader',tx=>tx.query("select public.search_knowledge('Teekanne') as result"))).rows[0].result.total,0);
 await assert.rejects(prepareKnowledge('employee',{document:knowledgeDoc,revision:2}),/revision changed/);
 await asUser('manager',tx=>tx.query('select public.publish_knowledge_version($1,$2,3)',[knowledgeDoc,articleTwo]));
 assert.equal((await asUser('reader',tx=>tx.query('select text_content from public.knowledge_versions where id=$1',[articleOne]))).rows[0].text_content,knowledgeArgs()[12]);
 await assert.rejects(asUser('employee',tx=>tx.query("update public.knowledge_versions set text_content='rewritten' where id=$1",[articleOne])),/permission denied/);
});
test('published access restrictions apply to authors, search and version contents',async()=>{
 await asUser('manager',tx=>tx.query('select public.set_knowledge_access($1,4,$2,$3,false)',[knowledgeDoc,a,['studio_manager']]));
 for(const who of ['employee','reader']){
  assert.equal((await asUser(who,tx=>tx.query('select * from public.knowledge_documents where id=$1',[knowledgeDoc]))).rows.length,0);
  assert.equal((await asUser(who,tx=>tx.query('select * from public.knowledge_versions where document_id=$1',[knowledgeDoc]))).rows.length,0);
 }
 await assert.rejects(asUser('manager',tx=>tx.query('select public.set_knowledge_access($1,5,null,$2,false)',[knowledgeDoc,['employee']])),/studio management/);
});
test('files cannot be published before upload and require a reserved immutable object path',async()=>{
 upload=await prepareKnowledge('employee',{kind:'file',name:'training.mp4',mime:'video/mp4',size:128,text:''});
 await assert.rejects(asUser('manager',tx=>tx.query('select public.publish_knowledge_version($1,$2,1)',[upload.document_id,upload.version_id])),/Ready document/);
 await assert.rejects(asUser('employee',tx=>tx.query("insert into storage.objects(bucket_id,name,metadata) values('team-knowledge',$1,$2)",['arbitrary-path.mp4',JSON.stringify({size:128,mimetype:'video/mp4'})])),/row-level security/);
 await assert.rejects(asUser('reader',tx=>tx.query("insert into storage.objects(bucket_id,name,metadata) values('team-knowledge',$1,$2)",[upload.object_path,JSON.stringify({size:128,mimetype:'video/mp4'})])),/row-level security/);
 await asUser('employee',tx=>tx.query("insert into storage.objects(bucket_id,name,metadata) values('team-knowledge',$1,$2)",[upload.object_path,JSON.stringify({size:128,mimetype:'video/mp4'})]));
 await asUser('employee',tx=>tx.query('select public.finish_knowledge_upload($1)',[upload.version_id]));
 await asUser('employee',tx=>tx.query('select public.finish_knowledge_upload($1)',[upload.version_id]));
 const updated=await asUser('employee',tx=>tx.query("update storage.objects set metadata='{}' where name=$1 returning name",[upload.object_path]));assert.equal(updated.rows.length,0);
 const removed=await asUser('employee',tx=>tx.query('delete from storage.objects where name=$1 returning name',[upload.object_path]));assert.equal(removed.rows.length,0);
});
test('private storage uses the same studio and publication rules as document metadata',async()=>{
 assert.equal((await asUser('reader',tx=>tx.query('select * from storage.objects where name=$1',[upload.object_path]))).rows.length,0);
 await asUser('manager',tx=>tx.query('select public.publish_knowledge_version($1,$2,2)',[upload.document_id,upload.version_id]));
 assert.equal((await asUser('reader',tx=>tx.query('select * from storage.objects where name=$1',[upload.object_path]))).rows.length,1);
 assert.equal((await asUser('other',tx=>tx.query('select * from storage.objects where name=$1',[upload.object_path]))).rows.length,0);
 await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role anon');return tx.query('select * from public.knowledge_documents');}),/permission denied/);
 await asUser('manager',tx=>tx.query('select public.set_knowledge_access($1,3,$2,$3,true)',[upload.document_id,a,['employee']]));
 assert.equal((await asUser('reader',tx=>tx.query('select * from storage.objects where name=$1',[upload.object_path]))).rows.length,0);
});
test('oversize, executable and mismatched file types are rejected; unfinished upload cleanup preserves ready files',async()=>{
 await assert.rejects(prepareKnowledge('employee',{kind:'file',name:'large.mp4',mime:'video/mp4',size:52428801,text:''}),/file name or size/);
 await assert.rejects(prepareKnowledge('employee',{kind:'file',name:'script.html',mime:'text/html',size:10,text:''}),/Unsupported file type/);
 await assert.rejects(prepareKnowledge('employee',{kind:'file',name:'image.png',mime:'video/mp4',size:10,text:''}),/Unsupported file type/);
 const pending=await prepareKnowledge('employee',{kind:'file',name:'test.txt',mime:'text/plain',size:12,text:'test'});
 await assert.rejects(asUser('employee',tx=>tx.query('select public.finish_knowledge_upload($1)',[pending.version_id])),/metadata not confirmed/);
 await asUser('employee',tx=>tx.query('select public.cancel_knowledge_upload($1)',[pending.version_id]));
 assert.equal((await db.query('select * from public.knowledge_versions where id=$1',[pending.version_id])).rows.length,0);
});

test('user directory filters are server-side and personal statistics remain administrator-only',async()=>{
 const found=(await asUser('admin',tx=>tx.query('select public.admin_team_directory(0,50,$1) as data',['employee@example.org']))).rows[0].data;
 assert.equal(found.total,1);assert.equal(found.members[0].id,ids.employee);
 const disabled=(await asUser('admin',tx=>tx.query("select public.admin_team_directory(0,50,'','','inactive') as data"))).rows[0].data;
 assert.ok(disabled.members.every(m=>!m.active));
 const summary=(await asUser('admin',tx=>tx.query('select public.admin_team_member_detail($1) as data',[ids.employee]))).rows[0].data;
 assert.equal(summary.member.id,ids.employee);assert.equal(summary.tasks.total,1);assert.equal(summary.tasks.done,1);
 assert.equal(summary.courses[0].lessons_read,2);assert.equal(summary.courses[0].practice_confirmed,true);
 assert.equal(summary.design_rights.edit,true);assert.equal(summary.design_rights.publish,false);
 await assert.rejects(asUser('employee',tx=>tx.query('select public.admin_team_member_detail($1)',[ids.employee])),/Administrator required/);
 await assert.rejects(asUser('manager',tx=>tx.query('select public.admin_team_directory()')),/Administrator required/);
});

test('bucket guards withstand unrelated broad Storage policies without exposing private originals',async()=>{
 await db.exec("create policy external_broad_storage_policy on storage.objects for all to authenticated,anon using(true) with check(true)");
 try {
  assert.equal((await asUser('other',tx=>tx.query('select * from storage.objects'))).rows.length,0);
  assert.equal((await db.transaction(async tx=>{await tx.exec('set local role anon');return tx.query('select * from storage.objects');})).rows.length,0);
  assert.equal((await asUser('admin',tx=>tx.query("update storage.objects set metadata='{}' where name=$1 returning name",[upload.object_path]))).rows.length,0);
 } finally { await db.exec('drop policy external_broad_storage_policy on storage.objects'); }
});

test('management can clean an unfinished archived upload without removing approved files',async()=>{
 const pending=await prepareKnowledge('employee',{kind:'file',name:'pending.csv',mime:'text/csv',size:12,text:'text'});
 await asUser('employee',tx=>tx.query("insert into storage.objects(bucket_id,name,metadata) values('team-knowledge',$1,$2)",[pending.object_path,JSON.stringify({size:12,mimetype:'text/csv'})]));
 await asUser('manager',tx=>tx.query('select public.set_knowledge_access($1,1,$2,$3,true)',[pending.document_id,a,['employee']]));
 const removed=await asUser('manager',tx=>tx.query('delete from storage.objects where name=$1 returning name',[pending.object_path]));assert.equal(removed.rows.length,1);
 await asUser('manager',tx=>tx.query('select public.cancel_knowledge_upload($1)',[pending.version_id]));
 assert.equal((await db.query('select * from public.knowledge_versions where id=$1',[pending.version_id])).rows.length,0);
 assert.equal((await db.query('select * from storage.objects where name=$1',[upload.object_path])).rows.length,1);
});

let pilotCourse, pilotAssignment;
const pilotLessons=[{title:'Start',body:'Aufgaben sorgfältig bearbeiten.'},{title:'Wissen',body:'Freigegebene Unterlagen finden.'}];
const pilotQuestions=[{prompt:'Wann erledigt?',options:['Beim Öffnen','Nach Abschluss'],answer:'must not leak'},{prompt:'Wer hilft?',options:['Patrick','Niemand']}];
test('pilot course creation protects answer keys and normalizes public material',async()=>{
 await assert.rejects(asUser('employee',tx=>tx.query('select public.save_learning_course(null,$1,$2,$3,$4)', ['Test',JSON.stringify(pilotLessons),JSON.stringify(pilotQuestions),'[1,0]'])),/Administrator required/);
 const result=await asUser('admin',tx=>tx.query('select public.save_learning_course(null,$1,$2,$3,$4) as id',['Pilotkurs',JSON.stringify(pilotLessons),JSON.stringify(pilotQuestions),'[1,0]']));
 pilotCourse=result.rows[0].id;
 const material=(await asUser('admin',tx=>tx.query('select * from public.learning_material where course_id=$1',[pilotCourse]))).rows[0];
 assert.equal(material.questions[0].answer,undefined);
 assert.equal((await asUser('employee',tx=>tx.query('select * from public.learning_material where course_id=$1',[pilotCourse]))).rows.length,0);
 await assert.rejects(asUser('admin',tx=>tx.query('select * from app_private.learning_answer_keys')),/permission denied/);
 await assert.rejects(asUser('employee',tx=>tx.query("insert into public.learning_material(course_id,lessons,questions) values($1,'[]','[]')",[pilotCourse])),/permission denied/);
});
test('pilot assignments expose content only to assigned active learners and administrators',async()=>{
 pilotAssignment=(await asUser('admin',tx=>tx.query('select public.create_learning_assignment($1,$2,$3,null,true) as id',[ids.employee,pilotCourse,a]))).rows[0].id;
 assert.equal((await asUser('employee',tx=>tx.query('select * from public.learning_material where course_id=$1',[pilotCourse]))).rows.length,1);
 for(const who of ['manager','peer','other','inactive']) assert.equal((await asUser(who,tx=>tx.query('select * from public.learning_material where course_id=$1',[pilotCourse]))).rows.length,0);
 await assert.rejects(asUser('peer',tx=>tx.query('select public.acknowledge_learning_lesson($1,0)',[pilotAssignment])),/Own learning assignment/);
 await assert.rejects(asUser('employee',tx=>tx.query('select public.report_learning_reads($1,2)',[pilotAssignment])),/Acknowledge individual lessons/);
 await assert.rejects(asUser('employee',tx=>tx.query('select public.submit_learning_quiz($1,$2)',[pilotAssignment,'[1,0]'])),/Read every lesson/);
});
test('individual lesson acknowledgments are bounded, idempotent and server stamped',async()=>{
 await assert.rejects(asUser('employee',tx=>tx.query('select public.acknowledge_learning_lesson($1,2)',[pilotAssignment])),/Invalid lesson/);
 for(let i=0;i<2;i++) assert.equal((await asUser('employee',tx=>tx.query('select public.acknowledge_learning_lesson($1,0) as count',[pilotAssignment]))).rows[0].count,1);
 await asUser('employee',tx=>tx.query('select public.acknowledge_learning_lesson($1,1)',[pilotAssignment]));
 assert.equal((await db.query('select lessons_read from public.learning_progress where assignment_id=$1',[pilotAssignment])).rows[0].lessons_read,2);
 assert.equal((await asUser('employee',tx=>tx.query('select * from public.learning_reads where assignment_id=$1',[pilotAssignment]))).rows.length,2);
 await assert.rejects(asUser('employee',tx=>tx.query('update public.learning_progress set quiz_passed=true where assignment_id=$1',[pilotAssignment])),/permission denied/);
});
test('online quiz is graded server side, throttled, and preserves an earned pass',async()=>{
 await assert.rejects(asUser('employee',tx=>tx.query('select public.submit_learning_quiz($1,$2)',[pilotAssignment,'[true,0]'])),/Invalid quiz answer/);
 const failed=(await asUser('employee',tx=>tx.query('select public.submit_learning_quiz($1,$2) as result',[pilotAssignment,'[0,0]']))).rows[0].result;
 assert.deepEqual(failed,{correct:1,total:2,passed:false});
 await assert.rejects(asUser('employee',tx=>tx.query('select public.submit_learning_quiz($1,$2)',[pilotAssignment,'[1,0]'])),/Wait ten seconds/);
 await db.query("update public.learning_attempts set at=clock_timestamp()-interval '11 seconds' where assignment_id=$1",[pilotAssignment]);
 assert.equal((await asUser('employee',tx=>tx.query('select public.submit_learning_quiz($1,$2) as result',[pilotAssignment,'[1,0]']))).rows[0].result.passed,true);
 await db.query("update public.learning_attempts set at=clock_timestamp()-interval '11 seconds' where assignment_id=$1",[pilotAssignment]);
 await asUser('employee',tx=>tx.query('select public.submit_learning_quiz($1,$2)',[pilotAssignment,'[0,1]']));
 assert.equal((await db.query('select quiz_passed from public.learning_progress where assignment_id=$1',[pilotAssignment])).rows[0].quiz_passed,true);
 await assert.rejects(asUser('employee',tx=>tx.query('select public.confirm_learning_practice($1)',[pilotAssignment])),/Administrator required/);
 await asUser('admin',tx=>tx.query('select public.confirm_learning_practice($1)',[pilotAssignment]));
 assert.equal((await db.query('select practice_confirmed from public.learning_progress where assignment_id=$1',[pilotAssignment])).rows[0].practice_confirmed,true);
 assert.equal((await asUser('peer',tx=>tx.query('select * from public.learning_attempts where assignment_id=$1',[pilotAssignment]))).rows.length,0);
});
test('assigned course content cannot be rewritten after a learner earns progress',async()=>{
 await assert.rejects(asUser('admin',tx=>tx.query('select public.save_learning_course($1,$2,$3,$4,$5,1)',[pilotCourse,'Rewritten',JSON.stringify(pilotLessons),JSON.stringify(pilotQuestions),'[0,0]'])),/Assigned courses are immutable/);
 await assert.rejects(asUser('admin',tx=>tx.query('update public.learning_courses set lesson_count=1 where id=$1',[pilotCourse])),/Assigned course content is immutable/);
 await assert.rejects(asUser('admin',tx=>tx.query("update public.learning_material set lessons='[]' where course_id=$1",[pilotCourse])),/permission denied/);
});
test('pilot dashboard totals and calendar aggregation retain row permissions without page truncation',async()=>{
 await asUser('admin',async tx=>{
  for(let i=0;i<55;i++)await tx.query("insert into public.tasks(title,studio_id,assignee_id,due_date) values('Pilot calendar',$1,$2,'2030-02-01')",[a,ids.employee]);
  await tx.query("insert into public.tasks(title,studio_id,assignee_id,due_date) values('Other person',$1,$2,'2030-02-01')",[b,ids.other]);
 });
 const mine=(await asUser('employee',tx=>tx.query('select public.my_team_dashboard() as data'))).rows[0].data;
 assert.equal(mine.learning.find(a=>a.id===pilotAssignment).quiz_passed,true);
 assert.ok(mine.tasks.length<=8); assert.ok(mine.tasks.every(t=>t.assignee_id===ids.employee));
 assert.equal((await asUser('employee',tx=>tx.query("select public.team_task_calendar('2030-02-01') as data"))).rows[0].data.days[0].total,55);
 assert.equal((await asUser('admin',tx=>tx.query("select public.team_task_calendar('2030-02-01') as data"))).rows[0].data.days[0].total,56);
 assert.equal((await asUser('employee',tx=>tx.query("select public.team_task_calendar('2030-02-01',$1) as data",[b]))).rows[0].data.days.length,0);
 await assert.rejects(asUser('inactive',tx=>tx.query('select public.my_team_dashboard()')),/Active employee profile/);
 await assert.rejects(asUser('employee',tx=>tx.query('select public.admin_pilot_status()')),/Administrator required/);
 assert.equal((await asUser('admin',tx=>tx.query('select public.admin_pilot_status() as data'))).rows[0].data.storage_private,true);
 await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role anon');return tx.query('select public.my_team_dashboard()');}),/permission denied/);
});
