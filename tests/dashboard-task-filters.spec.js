import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { sharedBackend, sharedIds } from './shared-backend';

const catalog = JSON.parse(readFileSync(new URL('../src/function-catalog.json', import.meta.url), 'utf8'));
const today = '2026-11-04';
const isoId = n => `00000000-0000-4000-8000-${String(1000 + n).padStart(12, '0')}`;
const tiles = { open: 'Offene Aufgaben', overdue: 'Überfällig', today: 'Heute fällig', done: 'Erledigte Aufgaben' };
const taskButtons = page => page.locator('.team-task-list > button');

function task(n, overrides = {}) {
  return { id: isoId(n), title: `Prüfaufgabe ${n}`, description: '', status: 'open', due_date: today,
    priority: 'normal', studio_id: sharedIds.studio, assignee_id: sharedIds.user,
    created_by: sharedIds.user, private: false, studio: { name: 'Dörpen' }, assignee: { full_name: 'Prüfkonto' }, ...overrides };
}

function grid() {
  return ['2026-11-03', today, '2026-11-05'].flatMap((due_date, d) =>
    ['open', 'in_progress', 'done'].map((status, s) => task(d * 3 + s, { due_date, status })));
}

// Deliberately evaluates server filters, ordering and paging. This is a UI test
// double, not evidence that hosted Supabase RLS is installed or effective.
async function filterBackend(page, { role = 'admin', teamRight = false, tasks = grid(), pages = ['dashboard', 'tasks'], serverToday = today } = {}) {
  const base = await sharedBackend(page, { role, pages });
  const state = { ...base, tasks, serverToday, taskCalls: [], rpcCalls: [], pages, active: true,
    allowedStudios: [sharedIds.studio, ...(role === 'admin' ? [sharedIds.otherStudio] : [])],
    capabilities: catalog.filter(c => role === 'admin' || c.roles.includes(role)).map(c => c.key),
    failTasks: false, delayPreset: null };
  if (teamRight && !state.capabilities.includes('tasks.team')) state.capabilities.push('tasks.team');
  const readable = t => state.allowedStudios.includes(t.studio_id)
    && (!t.private || t.created_by === sharedIds.user && t.assignee_id === sharedIds.user)
    && (t.assignee_id === sharedIds.user || state.capabilities.includes('tasks.team'));
  const personal = () => state.tasks.filter(t => readable(t) && t.assignee_id === sharedIds.user);
  await page.route('https://teamhub-test.supabase.co/rest/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), name = url.pathname.split('/').at(-1);
    const send = (data, status = 200, extra = {}) => route.fulfill({ status, headers: {
      'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range',
      'content-type': 'application/json', ...extra }, body: JSON.stringify(data) });
    if (name === 'team_access_context') return send({ version: 10, pages: state.pages, capabilities: state.capabilities, can_design: false });
    if (name === 'studios') return send(state.allowedStudios.map(id => ({ id, name: id === sharedIds.studio ? 'Dörpen' : 'Sögel' })));
    if (name === 'profiles' && url.searchParams.get('id') === `eq.${sharedIds.user}` && !state.active) return send(null);
    if (name === 'task_comments') return send([]);
    if (name === 'my_team_dashboard') {
      state.rpcCalls.push({ name, day: state.serverToday });
      const own = personal(), outstanding = own.filter(t => t.status !== 'done');
      return send({ today: state.serverToday, counts: { open: outstanding.length,
        overdue: outstanding.filter(t => t.due_date < state.serverToday).length,
        today: outstanding.filter(t => t.due_date === state.serverToday).length,
        done: own.filter(t => t.status === 'done').length }, tasks: outstanding.slice(0, 8), learning: [], knowledge: [] });
    }
    if (name !== 'tasks') return route.fallback();
    state.taskCalls.push({ method: req.method(), query: Object.fromEntries(url.searchParams), headers: req.headers() });
    if (req.method() !== 'GET') return send({ message: 'Unexpected write in read-only filter test' }, 400);
    if (state.failTasks) return send({ code: '42501', message: 'Denied' }, 403);
    if (state.delayPreset && url.searchParams.get('status') === state.delayPreset.status) await state.delayPreset.wait;
    let result = state.tasks.filter(readable);
    if (!state.pages.includes('tasks')) result = [];
    for (const [key, condition] of url.searchParams) {
      if (!['id', 'assignee_id', 'studio_id', 'status', 'due_date'].includes(key)) continue;
      const dot = condition.indexOf('.'), operator = condition.slice(0, dot), value = condition.slice(dot + 1);
      result = result.filter(t => operator === 'eq' ? String(t[key]) === value : operator === 'neq' ? String(t[key]) !== value :
        operator === 'lt' ? t[key] < value : operator === 'lte' ? t[key] <= value : operator === 'gte' ? t[key] >= value :
        operator === 'in' ? value.slice(1, -1).split(',').includes(String(t[key])) : false);
    }
    result.sort((a, b) => a.due_date.localeCompare(b.due_date) || a.id.localeCompare(b.id));
    const total = result.length, range = req.headers().range?.match(/(\d+)-(\d+)/);
    const offset = Number(url.searchParams.get('offset') || range?.[1] || 0);
    const limit = Number(url.searchParams.get('limit') || (range ? Number(range[2]) - offset + 1 : total || 1));
    const slice = result.slice(offset, offset + limit);
    if (req.headers().accept?.includes('application/vnd.pgrst.object+json')) return send(slice[0] || null);
    return send(slice, 200, { 'content-range': slice.length ? `${offset}-${offset + slice.length - 1}/${total}` : `*/${total}` });
  });
  return state;
}

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-11-04T09:00:00Z')); });

for (const config of [{ role: 'employee' }, { role: 'studio_manager' }, { role: 'admin' }, { role: 'employee', teamRight: true }]) {
  test(`all four tiles preserve personal task sets: ${config.role}${config.teamRight ? ' plus team right' : ''}`, async ({ page }) => {
    const rows = [...grid(), task(20, { title: 'Fremde Teamaufgabe', assignee_id: sharedIds.colleague }),
      task(21, { title: 'Fremde Privat-Aufgabe', assignee_id: sharedIds.colleague, created_by: sharedIds.colleague, private: true })];
    const state = await filterBackend(page, { ...config, tasks: rows });
    const expected = { open: [0, 1, 3, 4, 6, 7], overdue: [0, 1], today: [3, 4], done: [2, 5, 8] };
    await page.goto('/tests/workspace.html?start=dashboard');
    for (const [preset, ids] of Object.entries(expected)) {
      const tile = page.locator('.pilot-stats').getByRole('button', { name: new RegExp(tiles[preset]) });
      await expect(tile).toContainText(String(ids.length));
      await tile.click();
      await expect(taskButtons(page)).toHaveCount(ids.length);
      expect(await taskButtons(page).locator('h3').allTextContents()).toEqual(ids.map(n => `Prüfaufgabe ${n}`));
      await expect(page.locator('.team-pagination')).toContainText(`${ids.length} Aufgaben`);
      const last = state.taskCalls.at(-1).query;
      expect(last.assignee_id).toBe(`eq.${sharedIds.user}`);
      expect(last.status).toBe(preset === 'done' ? 'eq.done' : 'neq.done');
      expect(last.due_date).toBe(preset === 'today' ? `eq.${today}` : preset === 'overdue' ? `lt.${today}` : undefined);
      await page.getByRole('button', { name: 'Zurück zur Übersicht', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Meine Übersicht', exact: true })).toBeVisible();
      await expect(page.locator('.pilot-stats').getByRole('button', { name: new RegExp(tiles[preset]) })).toBeFocused();
    }
    expect(state.taskCalls.every(c => c.method === 'GET')).toBe(true);
  });
}

test('own private and multiple permitted studios are included; foreign assignments and studios are excluded', async ({ page }) => {
  const rows = [task(1, { private: true }), task(2, { studio_id: sharedIds.otherStudio }),
    task(3, { assignee_id: sharedIds.colleague }), task(4, { studio_id: isoId(900) }),
    task(5, { private: true, created_by: sharedIds.colleague })];
  const state = await filterBackend(page, { tasks: rows });
  await page.goto('/tests/workspace.html?start=dashboard');
  await page.locator('.pilot-stats').getByRole('button', { name: /Offene Aufgaben/ }).click();
  await expect(taskButtons(page)).toHaveCount(2);
  expect(await taskButtons(page).locator('h3').allTextContents()).toEqual(['Prüfaufgabe 1', 'Prüfaufgabe 2']);
  expect(state.taskCalls.at(-1).query.assignee_id).toBe(`eq.${sharedIds.user}`);
});

test('tile resets previous studio, status and page; server filtering precedes pagination', async ({ page }) => {
  const rows = Array.from({ length: 56 }, (_, n) => task(n, { due_date: '2026-11-03', status: n % 2 ? 'in_progress' : 'open' }));
  rows.push(...Array.from({ length: 5 }, (_, n) => task(100 + n, { assignee_id: sharedIds.colleague })));
  const state = await filterBackend(page, { tasks: rows });
  await page.goto('/tests/workspace.html');
  await expect(taskButtons(page)).toHaveCount(33);
  await page.getByRole('combobox', { name: 'Standort', exact: true }).selectOption(sharedIds.otherStudio);
  await expect(taskButtons(page)).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Teambereiche' }).getByRole('button', { name: /Übersicht|Startseite/ }).click();
  await page.locator('.pilot-stats').getByRole('button', { name: /Überfällig/ }).click();
  await expect(taskButtons(page)).toHaveCount(50);
  await expect(page.getByRole('combobox', { name: 'Standort', exact: true })).toHaveValue('all');
  await expect(page.locator('.team-pagination')).toContainText('56 Aufgaben · Seite 1 von 2');
  const first = await taskButtons(page).locator('h3').allTextContents();
  await page.getByRole('button', { name: 'Weitere Aufgaben', exact: true }).click();
  await expect(taskButtons(page)).toHaveCount(6);
  const second = await taskButtons(page).locator('h3').allTextContents();
  expect(new Set([...first, ...second]).size).toBe(56);
  expect(state.taskCalls.at(-1).query.assignee_id).toBe(`eq.${sharedIds.user}`);
  expect(state.taskCalls.at(-1).query.due_date).toBe(`lt.${today}`);
  await page.getByRole('button', { name: 'Zurück zur Übersicht', exact: true }).click();
  await page.locator('.pilot-stats').getByRole('button', { name: /Erledigte Aufgaben/ }).click();
  await expect(page.locator('.team-pagination')).toContainText('0 Aufgaben · Seite 1 von 1');
  await expect(taskButtons(page)).toHaveCount(0);
});

test('explicit filter changes retain personal scope; reset and ordinary menu have distinct meanings', async ({ page }) => {
  await filterBackend(page, { tasks: [...grid(), task(20, { assignee_id: sharedIds.colleague })] });
  await page.goto('/tests/workspace.html?start=dashboard');
  await page.locator('.pilot-stats').getByRole('button', { name: /Heute fällig/ }).click();
  await expect(taskButtons(page)).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('done');
  await expect(taskButtons(page)).toHaveCount(3);
  await page.getByRole('button', { name: 'Alle meine Aufgaben anzeigen', exact: true }).click();
  await expect(taskButtons(page)).toHaveCount(9);
  await page.getByRole('navigation', { name: 'Teambereiche' }).getByRole('button', { name: 'Aufgaben', exact: true }).click();
  // Normal menu may preserve the selected status, but must not keep a hidden
  // assignee restriction for a manager with team rights.
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('all');
  await expect(taskButtons(page)).toHaveCount(10);
});

test('empty results and read failures never display a stale list or count', async ({ page }) => {
  const state = await filterBackend(page);
  await page.goto('/tests/workspace.html?start=dashboard');
  await page.locator('.pilot-stats').getByRole('button', { name: /Heute fällig/ }).click();
  await expect(taskButtons(page)).toHaveCount(2);
  state.failTasks = true;
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(taskButtons(page)).toHaveCount(0);
  await expect(page.locator('.team-pagination')).toHaveCount(0);
  state.failTasks = false; state.tasks = [];
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText('Du hast heute keine noch offenen Aufgaben.', { exact: true })).toBeVisible();
  await expect(page.locator('.team-pagination')).toContainText('0 Aufgaben');
});

test('a late response cannot overwrite the current tile selection', async ({ page }) => {
  const state = await filterBackend(page);
  await page.goto('/tests/workspace.html?start=dashboard');
  let release;
  state.delayPreset = { status: 'neq.done', wait: new Promise(resolve => { release = resolve; }) };
  try {
    await page.locator('.pilot-stats').getByRole('button', { name: /Offene Aufgaben/ }).click();
    await expect(page.getByRole('button', { name: 'Zurück zur Übersicht', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Zurück zur Übersicht', exact: true }).click();
    await page.locator('.pilot-stats').getByRole('button', { name: /Erledigte Aufgaben/ }).click();
    await expect(taskButtons(page)).toHaveCount(3);
    release(); state.delayPreset = null;
    await expect(taskButtons(page).locator('h3')).toHaveText(['Prüfaufgabe 2', 'Prüfaufgabe 5', 'Prüfaufgabe 8']);
  } finally { release(); }
});

for (const timezoneId of ['UTC', 'America/Los_Angeles']) {
  test(`server Berlin date is preserved with device timezone ${timezoneId}`, async ({ browser }) => {
    const context = await browser.newContext({ timezoneId });
    const page = await context.newPage();
    try {
      await page.clock.setFixedTime(new Date('2026-11-03T23:30:00Z'));
      const state = await filterBackend(page);
      await page.goto('/tests/workspace.html?start=dashboard');
      await page.locator('.pilot-stats').getByRole('button', { name: /Heute fällig/ }).click();
      await expect(taskButtons(page)).toHaveCount(2);
      expect(state.taskCalls.at(-1).query.due_date).toBe(`eq.${today}`);
    } finally { await context.close(); }
  });
}

test('refresh advances the filter using the renewed server date', async ({ page }) => {
  const state = await filterBackend(page);
  await page.goto('/tests/workspace.html?start=dashboard');
  await page.locator('.pilot-stats').getByRole('button', { name: /Heute fällig/ }).click();
  await expect(taskButtons(page)).toHaveCount(2);
  state.serverToday = '2026-11-05';
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
  await expect(taskButtons(page).locator('h3')).toHaveText(['Prüfaufgabe 6', 'Prüfaufgabe 7']);
  expect(state.taskCalls.at(-1).query.due_date).toBe('eq.2026-11-05');
});

test('revoking the tasks page clears visible private details and task navigation', async ({ page }) => {
  const state = await filterBackend(page, { tasks: [task(1, { private: true })] });
  await page.goto('/tests/workspace.html?start=dashboard');
  await page.locator('.pilot-stats').getByRole('button', { name: /Heute fällig/ }).click();
  await taskButtons(page).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  state.pages = ['dashboard'];
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Meine Übersicht', exact: true })).toBeVisible();
  await expect(page.locator('.pilot-stats')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Teambereiche' }).getByRole('button', { name: 'Aufgaben', exact: true })).toHaveCount(0);
});

test('inactive account clears a previously opened personal list on refresh', async ({ page }) => {
  const state = await filterBackend(page);
  await page.goto('/tests/workspace.html?start=dashboard');
  await page.locator('.pilot-stats').getByRole('button', { name: /Offene Aufgaben/ }).click();
  await expect(taskButtons(page)).toHaveCount(6);
  state.active = false;
  await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dein Zugang ist noch nicht freigeschaltet.' })).toBeVisible();
  await expect(taskButtons(page)).toHaveCount(0);
});

test('studio withdrawal revalidates an open task on focus without changing function rights', async ({ page }) => {
  const state = await filterBackend(page, { tasks: [task(1, { private: true }), task(2, { studio_id: sharedIds.otherStudio })] });
  await page.goto('/tests/workspace.html?start=dashboard');
  await page.locator('.pilot-stats').getByRole('button', { name: /Offene Aufgaben/ }).click();
  await expect(taskButtons(page)).toHaveCount(2);
  await taskButtons(page).filter({ hasText: 'Prüfaufgabe 1' }).click();
  await expect(page.getByRole('dialog', { name: 'Prüfaufgabe 1', exact: true })).toBeVisible();
  const before = [...state.capabilities];
  state.allowedStudios = [sharedIds.otherStudio];
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(taskButtons(page).locator('h3')).toHaveText(['Prüfaufgabe 2']);
  expect(state.capabilities).toEqual(before);
});

test('focus revalidation preserves an unsaved task editor when access remains unchanged', async ({ page }) => {
  await filterBackend(page);
  await page.goto('/tests/workspace.html?start=dashboard');
  await page.locator('.pilot-stats').getByRole('button', { name: /Offene Aufgaben/ }).click();
  await expect(taskButtons(page)).toHaveCount(6);
  await page.getByRole('button', { name: 'Private Aufgabe erstellen', exact: true }).click();
  await page.getByLabel('Titel der privaten Aufgabe', { exact: true }).fill('Noch nicht gespeicherte Eingabe');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Titel der privaten Aufgabe', { exact: true })).toHaveValue('Noch nicht gespeicherte Eingabe');
});

test('mobile keyboard activation exposes the active personal filter without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await filterBackend(page);
  await page.goto('/tests/workspace.html?start=dashboard');
  const tile = page.locator('.pilot-stats').getByRole('button', { name: /Überfällig/ });
  await tile.focus(); await page.keyboard.press('Space');
  await expect(taskButtons(page)).toHaveCount(2);
  await expect(page.getByRole('heading', { name: /Meine Aufgaben/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const reset = page.getByRole('button', { name: 'Alle meine Aufgaben anzeigen', exact: true });
  await expect(reset).toBeVisible();
  expect((await reset.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: 'test-results/dashboard-task-filter-mobile.png', fullPage: true });
});
