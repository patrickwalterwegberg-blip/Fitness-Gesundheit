import { test, expect } from '@playwright/test';

const uid = '00000000-0000-4000-8000-000000000001';
const employeeId = '00000000-0000-4000-8000-000000000002';
const studioId = '00000000-0000-4000-8000-000000000003';
const taskId = '00000000-0000-4000-8000-000000000004';
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-11-03T09:00:00+01:00')); });

async function mockBackend(page, { loggedIn = true, role = 'employee', denyUpdate = false, administration = false, access = false, inviteFailure = false, accessConflict = false, unknownEmail = false } = {}) {
  const calls = [];
  const user = { id: uid, email: 'test@example.org', aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {} };
  const profile = { id: uid, full_name: 'Test Mitarbeiter', role, active: true };
  const people = [profile, { id: employeeId, full_name: 'Teammitglied Zwei', role: 'employee', active: true }];
  let accessMembers = people.map((p, i) => ({ ...p, email: i ? 'two@example.org' : 'test@example.org', studio_ids: [studioId], access_updated_at: '2026-11-04T09:00:00Z', last_sign_in_at: i ? null : '2026-11-03T09:00:00Z' }));
  let tasks = [{ id: taskId, title: 'Gemeinsame Testaufgabe', description: 'Beschreibung aus der Datenbank', studio_id: studioId, assignee_id: uid, due_date: '2026-11-04', priority: 'normal', status: 'open', studio: { name: 'Dörpen' }, assignee: { full_name: profile.full_name } }];
  const comments = [];
  let modules = [], versions = [];
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
    if (url.pathname === '/auth/v1/otp') return unknownEmail ? send({ message: 'Signups not allowed for otp', code: 'signup_disabled' }, 400) : send({});
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
    if (['custom_modules', 'module_drafts', 'module_versions', 'module_records', 'module_permissions'].some(t => url.pathname === `/rest/v1/${t}`)) {
      if (!administration) return send({ code: '42P01', message: 'migration missing' }, 404);
      return send(url.pathname.endsWith('/custom_modules') ? modules : url.pathname.endsWith('/module_versions') ? versions : []);
    }
    if (administration && url.pathname === '/rest/v1/rpc/release_module') {
      const mid = '00000000-0000-4000-8000-000000000020', vid = '00000000-0000-4000-8000-000000000021';
      modules = [{ id: mid, owner_id: uid, revision: 2, published_version_id: vid, updated_at: '2026-11-04T09:00:00Z' }];
      versions = [{ id: vid, module_id: mid, version: 1, schema: body.p_schema, published_by: uid, published_at: '2026-11-04T09:00:00Z' }];
      return send({ id: mid, revision: 2, published_version_id: vid });
    }
    if (administration && url.pathname === '/rest/v1/rpc/admin_controlling') return send({ profiles: people, studios: [{ id: studioId, name: 'Dörpen' }], tasks, courses: [], assignments: [], progress: [] });
    if (access && url.pathname === '/rest/v1/rpc/admin_team_directory') return send({ members: accessMembers, total: accessMembers.length, studios: [{ id: studioId, name: 'Dörpen' }] });
    if (access && url.pathname === '/rest/v1/rpc/admin_set_team_access') {
      if (accessConflict) return send({ code: '40001', message: 'revision changed' }, 409);
      accessMembers = accessMembers.map(p => p.id === body.p_user ? { ...p, full_name: body.p_full_name, role: body.p_role, active: body.p_active, studio_ids: body.p_studio_ids, access_updated_at: '2026-11-04T10:00:00Z' } : p);
      return send(null);
    }
    if (access && url.pathname === '/functions/v1/team-access') {
      if (inviteFailure) return send({ code: 'invitation_not_confirmed' }, 502);
      if (body.action === 'invite') accessMembers.push({ id: '00000000-0000-4000-8000-000000000030', full_name: body.fullName, email: body.email, role: body.role, active: true, studio_ids: body.studioIds, access_updated_at: '2026-11-04T10:00:00Z', last_sign_in_at: null });
      return send({ code: body.action === 'invite' ? 'invitation_requested' : 'login_link_requested' });
    }
    return send({ message: 'Unexpected test request' }, 404);
  });
  return calls;
}

test('email sign-in does not auto-register users and keeps demo data separate', async ({ page }) => {
  const calls = await mockBackend(page, { loggedIn: false });
  await page.goto('/tests/workspace.html');
  await page.getByLabel('Deine Firmen-E-Mail-Adresse').fill('test@example.org');
  await page.getByRole('button', { name: 'Mit Anmeldelink anmelden', exact: true }).click();
  await page.getByRole('button', { name: 'Anmeldelink anfordern' }).click();
  await expect(page.getByRole('status')).toContainText('Link-Anfrage angenommen');
  await expect(page.getByRole('alert')).toHaveCount(0);
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
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Bearbeitungsstatus auf dem Server gespeichert');
  await page.getByLabel('Deine Rückmeldung zur Teamaufgabe').fill('Aufgabe übernommen.');
  await page.getByRole('button', { name: 'Auf dem Server speichern' }).click();
  await expect(page.locator('.team-comment')).toContainText('Aufgabe übernommen.');
  const update = calls.find(c => c.path === '/rest/v1/tasks' && c.method === 'PATCH');
  expect(update.body).toEqual({ status: 'in_progress' });
  expect(calls.find(c => c.path === '/rest/v1/task_comments' && c.method === 'POST').body.author_id).toBe(uid);
  await page.getByRole('button',{name:'Teamaufgabe schließen'}).click();
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

test('shared administration reports a missing migration without importing local modules', async ({ page }) => {
  await mockBackend(page, { role: 'admin' });
  await page.goto('/tests/workspace.html');
  await page.getByRole('button', { name: 'Modulbaukasten', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('zweite SQL-Migration');
  await expect(page.getByRole('heading', { name: 'Studio-Check', exact: true })).toHaveCount(0);
});

test('shared builder publishes through the atomic server RPC', async ({ page }) => {
  const calls = await mockBackend(page, { role: 'admin', administration: true });
  await page.goto('/tests/workspace.html');
  await page.getByRole('button', { name: 'Modulbaukasten', exact: true }).click();
  await page.getByRole('button', { name: 'Neues Modul', exact: true }).click();
  await page.getByLabel('Modulname', { exact: true }).fill('Gemeinsame Prüfung');
  await page.getByRole('button', { name: 'Feld hinzufügen', exact: true }).click();
  await page.getByLabel('Feldbezeichnung 1', { exact: true }).fill('Prüfnotiz');
  await page.getByRole('button', { name: 'Veröffentlichen', exact: true }).click();
  await expect(page.locator('.admin-success')).toContainText('Neue Modulversion veröffentlicht');
  const released = calls.find(c => c.path === '/rest/v1/rpc/release_module');
  expect(released.body.p_module_id).toBeNull();
  expect(released.body.p_expected_revision).toBe(0);
  expect(released.body.p_schema.fields[0].label).toBe('Prüfnotiz');
  expect(await page.evaluate(() => localStorage.getItem('fg-hub-modules'))).toBeNull();
});

test('ordinary employee does not see builder, file management or controlling', async ({ page }) => {
  await mockBackend(page, { administration: true, role: 'employee' });
  await page.goto('/tests/workspace.html');
  await expect(page.getByRole('button', { name: 'Aufgaben', exact: true })).toBeVisible();
  for(const name of ['Modulbaukasten','Dateien','Eigene Module','Controlling','Mitarbeiterzugänge'])await expect(page.getByRole('button',{name,exact:true})).toHaveCount(0);
});

test('shared controlling uses server tasks and opens their actual detail', async ({ page }) => {
  const calls = await mockBackend(page, { role: 'admin', administration: true });
  await page.goto('/tests/workspace.html');
  await page.getByRole('button', { name: 'Controlling', exact: true }).click();
  await page.getByRole('button', { name: 'Details zu Test Mitarbeiter', exact: true }).click();
  await page.getByRole('button', { name: /Gemeinsame Testaufgabe/ }).click();
  await expect(page.getByLabel('Bearbeitungsstatus')).toHaveValue('open');
  expect(calls.some(c => c.path === '/rest/v1/rpc/admin_controlling')).toBe(true);
  await expect(page.getByRole('heading', { name: 'Willkommen im Team', exact: true })).toHaveCount(0);
});

test('administrator invites an employee with role and studio through the server function', async ({ page }) => {
  const calls = await mockBackend(page, { role: 'admin', access: true });
  await page.goto('/tests/workspace.html');
  await page.getByRole('button', { name: 'Mitarbeiterzugänge', exact: true }).click();
  await expect(page.getByText('two@example.org', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mitarbeiter einladen', exact: true }).click();
  await page.getByLabel('Name des Mitarbeiters', { exact: true }).fill('Neues Teammitglied');
  await page.getByLabel('Firmen-E-Mail für den Zugang', { exact: true }).fill('neu@example.org');
  await page.getByRole('button', { name: 'Einladung anfordern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Einladung beim E-Mail-Dienst angefordert');
  await expect(page.getByText('neu@example.org', { exact: true })).toBeVisible();
  const request = calls.find(c => c.path === '/functions/v1/team-access');
  expect(request.body).toEqual({ action: 'invite', fullName: 'Neues Teammitglied', email: 'neu@example.org', role: 'employee', studioIds: [studioId] });
  expect(await page.evaluate(() => localStorage.getItem('fg-hub-people'))).toBeNull();
});

test('invitation failure preserves the input and never claims success', async ({ page }) => {
  await mockBackend(page, { role: 'admin', access: true, inviteFailure: true });
  await page.goto('/tests/workspace.html');
  await page.getByRole('button', { name: 'Mitarbeiterzugänge', exact: true }).click();
  await page.getByRole('button', { name: 'Mitarbeiter einladen', exact: true }).click();
  await page.getByLabel('Name des Mitarbeiters', { exact: true }).fill('Nicht bestätigt');
  await page.getByLabel('Firmen-E-Mail für den Zugang', { exact: true }).fill('nicht-bestaetigt@example.org');
  await page.getByRole('button', { name: 'Einladung anfordern', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Einladung konnte beim E-Mail-Dienst nicht bestätigt');
  await expect(page.getByLabel('Firmen-E-Mail für den Zugang', { exact: true })).toHaveValue('nicht-bestaetigt@example.org');
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('access updates include the previous revision and self-admin remains protected', async ({ page }) => {
  const calls = await mockBackend(page, { role: 'admin', access: true });
  await page.goto('/tests/workspace.html');
  await page.getByRole('button', { name: 'Mitarbeiterzugänge', exact: true }).click();
  await page.getByRole('button', { name: 'Zugang für Test Mitarbeiter bearbeiten', exact: true }).click();
  await expect(page.getByLabel('Rolle des Zugangs', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Zugang freigeschaltet', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await page.getByRole('button', { name: 'Zugang für Teammitglied Zwei bearbeiten', exact: true }).click();
  await page.getByLabel('Zugang freigeschaltet', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Zugang speichern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Mitarbeiterzugang auf dem Server aktualisiert');
  await expect(page.getByRole('button', { name: 'Anmeldelink für Teammitglied Zwei anfordern', exact: true })).toBeDisabled();
  const request = calls.find(c => c.path === '/rest/v1/rpc/admin_set_team_access');
  expect(request.body.p_expected_updated_at).toBe('2026-11-04T09:00:00Z');
  expect(request.body.p_user).toBe(employeeId);
  expect(request.body.p_active).toBe(false);
});

test('access revision conflict keeps the editor and reports a reload', async ({ page }) => {
  await mockBackend(page, { role: 'admin', access: true, accessConflict: true });
  await page.goto('/tests/workspace.html');
  await page.getByRole('button', { name: 'Mitarbeiterzugänge', exact: true }).click();
  await page.getByRole('button', { name: 'Zugang für Teammitglied Zwei bearbeiten', exact: true }).click();
  await page.getByLabel('Name des Mitarbeiters', { exact: true }).fill('Änderung behalten');
  await page.getByRole('button', { name: 'Zugang speichern', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('inzwischen geändert');
  await expect(page.getByLabel('Name des Mitarbeiters', { exact: true })).toHaveValue('Änderung behalten');
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('employee has no access management and signout clears team data', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/tests/workspace.html');
  await expect(page.getByRole('heading', { name: 'Gemeinsame Testaufgabe', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mitarbeiterzugänge', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
  await expect(page.getByLabel('Deine Firmen-E-Mail-Adresse')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Gemeinsame Testaufgabe', exact: true })).toHaveCount(0);
});

test('a rejected link request shows neutral failure guidance and prevents repeated immediate requests', async ({ page }) => {
  const calls = await mockBackend(page, { loggedIn: false, unknownEmail: true });
  await page.goto('/tests/workspace.html');
  await page.getByLabel('Deine Firmen-E-Mail-Adresse').fill('unknown@example.org');
  await page.getByRole('button', { name: 'Mit Anmeldelink anmelden', exact: true }).click();
  await page.getByRole('button', { name: 'Anmeldelink anfordern', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Ein Linkversand konnte nicht bestätigt werden');
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Erneut anfordern in/ })).toBeDisabled();
  expect(calls.filter(c => c.path === '/auth/v1/otp')).toHaveLength(1);
});

test('employee access management fits a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockBackend(page, { role: 'admin', access: true });
  await page.goto('/tests/workspace.html');
  await page.getByRole('button', { name: 'Menü öffnen' }).click();
  await page.getByRole('button', { name: 'Mitarbeiterzugänge', exact: true }).click();
  await page.getByRole('button', { name: 'Mitarbeiter einladen', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/team-access-mobile.png', fullPage: true });
});

test('expired login callback shows recovery and removes provider error details from the URL', async ({ page }) => {
  await mockBackend(page, { loggedIn: false });
  await page.goto('/tests/workspace.html?team=1#error=access_denied&error_code=otp_expired&error_description=Expired');
  await expect(page.getByRole('alert')).toContainText('Anmeldelink ist ungültig oder abgelaufen');
  await page.getByRole('button', { name: 'Mit Anmeldelink anmelden', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Anmeldelink anfordern', exact: true })).toBeEnabled();
  await expect(page).not.toHaveURL(/error_description/);
});
