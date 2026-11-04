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
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to authenticated, anon;
`);
const migration = await readFile('backend/supabase/001_team.sql', 'utf8');
await db.exec(migration);
// Re-applying the new-project setup must preserve its seeded studios.
await db.exec(migration);
const administration = await readFile('backend/supabase/002_modules_controlling.sql', 'utf8');
await db.exec(administration);
await db.exec(administration);
for (const [role, uid] of Object.entries(ids)) {
  await db.query('insert into auth.users(id) values ($1)', [uid]);
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
  assert.equal((await asUser('employee', tx => tx.query("update public.profiles set role='admin' where id=$1 returning id", [ids.employee]))).rows.length, 0);
  await assert.rejects(asUser('employee', tx => tx.query('insert into public.studio_memberships values ($1,$2)', [ids.employee, b])), /row-level security/);
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
