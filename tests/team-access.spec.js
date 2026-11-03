import { test, expect } from '@playwright/test';

const uid = '00000000-0000-4000-8000-000000000001';
const employeeId = '00000000-0000-4000-8000-000000000002';
const studioId = '00000000-0000-4000-8000-000000000003';
const taskId = '00000000-0000-4000-8000-000000000004';
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-11-03T09:00:00+01:00')); });

async function mockBackend(page, { loggedIn = true, role = 'employee', denyUpdate = false } = {}) {
  const calls = [];
  const user = { id: uid, email: 'test@example.org', aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {} };
  const profile = { id: uid, full_name: 'Test Mitarbeiter', role, active: true };
  const people = [profile, { id: employeeId, full_name: 'Teammitglied Zwei', role: 'employee', active: true }];
  let tasks = [{ id: taskId, title: 'Gemeinsame Testaufgabe', description: 'Beschreibung aus der Datenbank', studio_id: studioId, assignee_id: uid, due_date: '2026-11-04', priority: 'normal', status: 'open', studio: { name: 'Dörpen' }, assignee: { full_name: profile.full_name } }];
  const comments = [];
  if (loggedIn) {
    const payload = Buffer.from(JSON.stringify({ sub: uid, aud: 'authenticated', role: 'authenticated', exp: 2200000000 })).toString('base64url');
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + payload + '.test-signature';
    await page.addInitScript(({ user, token }) => {
      localStorage.setItem('sb-teamhub-test-auth-token', JSON.stringify({ access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: 2200000000, user }));
    }, { user, token });
  }
  await page.route('https://teamhub-test.supabase.co/**', async route => {
    const request = route.request(); const url = new URL(request.url()); const method = request.method();
    const body = request.postDataJSON(); calls.push({ path: url.pathname, method, body, query: url.searchParams.toString() });
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'content-type': 'application/json' };
    const send = (data, status = 200, extra = {}) => route.fulfill({ status, headers: { ...headers, ...extra }, body: status === 204 ? undefined : JSON.stringify(data) });
    if (method === 'OPTIONS') return send(null, 204);
    if (url.pathname === '/auth/v1/otp') return send({});
    if (url.pathname === '/auth/v1/logout') return send(null, 204);
    if (url.pathname === '/auth/v1/user') return send(user);
    if (url.pathname === '/rest/v1/profiles') return send(url.searchParams.has('id') ? [profile] : people);
    if (url.pathname === '/rest/v1/studios') return send([{ id: studioId, name: 'Dörpen' }]);
    if (url.pathname === '/rest/v1/studio_memberships') return send(people.map(p => ({ user_id: p.id, studio_id: studioId })));
    if (url.pathname === '/rest/v1/tasks') {
      if (method === 'PATCH') {
        if (denyUpdate) return send({ code: '42501', message: 'permission denied' }, 403);
        tasks = tasks.map(t => t.id === url.searchParams.get('id')?.slice(3) ? { ...t, ...body } : t);
        return send(tasks.find(t => t.id === url.searchParams.get('id')?.slice(3)));
      }
      if (method === 'POST') {
        const created = { ...body, id: '00000000-0000-4000-8000-000000000005', status: 'open', studio: { name: 'Dörpen' }, assignee: { full_name: people.find(p => p.id === body.assignee_id)?.full_name } };
        tasks.push(created); return send({ id: created.id }, 201);
      }
      const status = url.searchParams.get('status')?.slice(3); const visible = tasks.filter(t => !status || t.status === status);
      return send(visible, 200, { 'content-range': `0-${Math.max(0, visible.length - 1)}/${visible.length}` });
    }
    if (url.pathname === '/rest/v1/task_comments') {
      if (method === 'POST') { const c = { ...body, id: 'comment-1', created_at: '2026-11-03T09:00:00Z', author: { full_name: profile.full_name } }; comments.push(c); return send({ id: c.id }, 201); }
      return send(comments);
    }
    return send({ message: 'Unexpected test request' }, 404);
  });
  return calls;
}

test('email sign-in does not auto-register users and keeps demo data separate', async ({ page }) => {
  const calls = await mockBackend(page, { loggedIn: false });
  await page.goto('/tests/workspace.html');
  await page.getByLabel('Deine Firmen-E-Mail-Adresse').fill('test@example.org');
  await page.getByRole('button', { name: 'Anmeldelink anfordern' }).click();
  await expect(page.getByRole('status')).toContainText('Falls für diese Adresse ein Zugang eingerichtet ist');
  const otp = calls.find(c => c.path === '/auth/v1/otp');
  expect(otp.body.create_user).toBe(false);
  expect(otp.body.email).toBe('test@example.org');
  expect(otp.query).toContain('redirect_to=');
  expect(calls.some(c => c.path.startsWith('/rest/'))).toBe(false);
});

test('authenticated employee can update own status and reply, without management controls', async ({ page }) => {
  const calls = await mockBackend(page);
  await page.goto('/tests/workspace.html');
  await expect(page.getByRole('heading', { name: 'Hallo, Test.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Teamaufgabe erstellen', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /Gemeinsame Testaufgabe/ }).click();
  await page.getByLabel('Bearbeitungsstatus').selectOption('in_progress');
  await expect(page.getByRole('status')).toContainText('Bearbeitungsstatus auf dem Server gespeichert');
  await page.getByLabel('Deine Rückmeldung zur Teamaufgabe').fill('Aufgabe übernommen.');
  await page.getByRole('button', { name: 'Auf dem Server speichern' }).click();
  await expect(page.locator('.team-comment')).toContainText('Aufgabe übernommen.');
  const update = calls.find(c => c.path === '/rest/v1/tasks' && c.method === 'PATCH');
  expect(update.body).toEqual({ status: 'in_progress' });
  expect(calls.find(c => c.path === '/rest/v1/task_comments' && c.method === 'POST').body.author_id).toBe(uid);
  await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
  await expect(page.getByLabel('Deine Firmen-E-Mail-Adresse')).toBeVisible();
  await expect(page.getByText('Beschreibung aus der Datenbank')).toHaveCount(0);
});

test('manager can create a shared task for a studio member', async ({ page }) => {
  const calls = await mockBackend(page, { role: 'studio_manager' });
  await page.goto('/tests/workspace.html');
  await page.getByRole('button', { name: 'Teamaufgabe erstellen', exact: true }).click();
  await page.getByLabel('Titel der Teamaufgabe').fill('Serverseitige neue Aufgabe');
  await page.getByLabel('Verantwortliche Person').selectOption(employeeId);
  await page.getByRole('button', { name: 'Teamaufgabe speichern', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Serverseitige neue Aufgabe', exact: true })).toBeVisible();
  const created = calls.find(c => c.path === '/rest/v1/tasks' && c.method === 'POST');
  expect(created.body.assignee_id).toBe(employeeId);
  expect(created.body.studio_id).toBe(studioId);
});

test('permission denial preserves old task status and is clearly reported', async ({ page }) => {
  await mockBackend(page, { denyUpdate: true });
  await page.goto('/tests/workspace.html');
  await page.getByRole('button', { name: /Gemeinsame Testaufgabe/ }).click();
  await page.getByLabel('Bearbeitungsstatus').selectOption('done');
  await expect(page.getByRole('alert')).toContainText('Deine Berechtigung reicht');
  await expect(page.getByLabel('Bearbeitungsstatus')).toHaveValue('open');
  await expect(page.getByRole('status')).toHaveCount(0);
});
