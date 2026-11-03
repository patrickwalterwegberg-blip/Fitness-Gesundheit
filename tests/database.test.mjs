import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db, a, b;
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ids = { admin: id(1), manager: id(2), employee: id(3), peer: id(4), other: id(5), inactive: id(6) };
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
for (const [role, uid] of Object.entries(ids)) {
  await db.query('insert into auth.users(id) values ($1)', [uid]);
  await db.query('insert into public.profiles(id,full_name,role,active) values ($1,$2,$3,$4)', [uid, role, role === 'admin' ? 'admin' : role === 'manager' ? 'studio_manager' : 'employee', role !== 'inactive']);
}
const sites = (await db.query('select id,name from public.studios')).rows;
a = sites.find(s => s.name === 'Dörpen').id;
b = sites.find(s => s.name === 'Sögel').id;
for (const who of ['manager', 'employee', 'peer', 'inactive']) await db.query('insert into public.studio_memberships values ($1,$2)', [ids[who], a]);
await db.query('insert into public.studio_memberships values ($1,$2)', [ids.other, b]);
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
  const result = await asUser('employee', tx => tx.query("update public.tasks set status='done',completed_at='2000-01-01',updated_at='2000-01-01' where id=$1 returning completed_at,updated_at", [id(10)]));
  assert.ok(new Date(result.rows[0].completed_at).getFullYear() > 2020);
  assert.ok(new Date(result.rows[0].updated_at).getFullYear() > 2020);
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
