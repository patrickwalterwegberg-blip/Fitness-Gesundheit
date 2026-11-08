import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { sharedBackend, sharedIds } from './shared-backend';

const catalog = JSON.parse(readFileSync(new URL('../src/function-catalog.json', import.meta.url), 'utf8'));
const actions = [['link', 'Link hinzufügen'], ['news', 'Neuigkeit hinzufügen'], ['contact', 'Ansprechpartner hinzufügen']];
const titleField = dialog => dialog.locator('input[name="title"]');

async function homeBackend(page, { role = 'admin', capabilities, canManage = role === 'admin', items = [], failRead = false, missing = false, failSave = false, pending = false } = {}) {
  await sharedBackend(page, { role, pages: ['dashboard', 'tasks'] });
  const state = { items, calls: [], release: null };
  const wait = pending ? new Promise(resolve => { state.release = resolve; }) : null;
  const caps = capabilities || catalog.filter(c => role === 'admin' || c.roles.includes(role)).map(c => c.key);
  await page.route('https://teamhub-test.supabase.co/rest/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), name = url.pathname.split('/').at(-1), body = req.postDataJSON();
    const send = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (name === 'team_access_context') return send({ version: 10, pages: ['dashboard', 'tasks'], capabilities: caps, can_design: false });
    if (name === 'my_team_dashboard') return send({ today: '2026-11-08', counts: { open: 0, overdue: 0, today: 0, done: 0 }, tasks: [], learning: [], knowledge: [] });
    if (!['team_home_data', 'save_team_home_item'].includes(name)) return route.fallback();
    state.calls.push({ name, body });
    if (name === 'team_home_data') {
      if (wait) await wait;
      if (missing) return send({ code: 'PGRST202' }, 404);
      if (failRead) return send({ code: '42501' }, 403);
      return send({ can_manage: canManage, items: state.items.filter(i => body.p_manage || i.published) });
    }
    if (failSave) return send({ code: '42501' }, 403);
    const item = { id: 'saved-home-item', kind: body.p_kind, title: body.p_title, body: body.p_body,
      href: body.p_href, phone: body.p_phone, studio_id: body.p_studio, reader_roles: body.p_roles,
      published: body.p_published, position: body.p_position, revision: 1, editable: true };
    state.items.push(item); return send(item);
  });
  return state;
}

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-11-08T10:00:00Z')); });

test('each empty section opens the correctly prepared form, focuses its title and cancels without writes', async ({ page }) => {
  const state = await homeBackend(page);
  await page.goto('/tests/workspace.html?start=dashboard');
  for (const [index, [kind, label]] of actions.entries()) {
    const trigger = page.getByRole('button', { name: label, exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Startseiteneintrag bearbeiten', exact: true });
    await expect(dialog).toHaveCount(1);
    await expect(dialog.getByRole('combobox', { name: 'Art des Startseiteneintrags', exact: true })).toHaveValue(kind);
    await expect(titleField(dialog)).toBeFocused();
    await expect(dialog.locator('input[name="published"]')).not.toBeChecked();
    await expect(dialog.locator('select[name="studio"]')).toHaveValue('');
    if (index === 0) await dialog.getByRole('button', { name: 'Abbrechen', exact: true }).click();
    else if (index === 1) await page.keyboard.press('Escape');
    else await dialog.getByRole('button', { name: 'Startseitenformular schließen', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  expect(state.calls.filter(c => c.name === 'save_team_home_item')).toHaveLength(0);
  expect(state.items).toHaveLength(0);
});

test('saving a direct news entry shows its draft in management without silently publishing it', async ({ page }) => {
  const state = await homeBackend(page);
  await page.goto('/tests/workspace.html?start=dashboard');
  await page.getByRole('button', { name: 'Neuigkeit hinzufügen', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await titleField(dialog).fill('Prüfentwurf für den Teamtag');
  await dialog.locator('textarea[name="body"]').fill('Nur synthetischer Testinhalt.');
  expect(state.calls.filter(c => c.name === 'save_team_home_item')).toHaveLength(0);
  await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Mitarbeiteransicht', exact: true })).toBeVisible();
  await expect(page.locator('.home-section-news')).toContainText('Prüfentwurf für den Teamtag');
  await expect(page.locator('.home-section-news')).toContainText('Entwurf');
  await expect(page.getByRole('button', { name: 'Neuigkeit hinzufügen', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Link hinzufügen', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ansprechpartner hinzufügen', exact: true })).toBeVisible();
  const save = state.calls.find(c => c.name === 'save_team_home_item').body;
  expect(save.p_kind).toBe('news'); expect(save.p_published).toBe(false); expect(save.p_id).toBeNull();
  await page.getByRole('button', { name: 'Mitarbeiteransicht', exact: true }).click();
  await expect(page.locator('.home-section-news')).not.toContainText('Prüfentwurf für den Teamtag');
  await expect(page.getByRole('button', { name: 'Neuigkeit hinzufügen', exact: true })).toBeVisible();
});

test('an employee with delegated create permission can prepare only an assigned studio draft', async ({ page }) => {
  const state = await homeBackend(page, { role: 'employee', canManage: true, capabilities: ['home.create'] });
  await page.goto('/tests/workspace.html?start=dashboard');
  await page.getByRole('button', { name: 'Ansprechpartner hinzufügen', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('select[name="studio"]')).toHaveValue(sharedIds.studio);
  await expect(dialog.locator('select[name="studio"] option[value=""]')).toHaveCount(0);
  await expect(dialog.locator('input[name="published"]')).toBeDisabled();
  await expect(dialog.locator('input[name="published"]')).not.toBeChecked();
  await titleField(dialog).fill('Synthetischer Ansprechpartner');
  await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.items[0].studio_id).toBe(sharedIds.studio);
  expect(state.items[0].published).toBe(false);
});

for (const config of [
  { role: 'employee', canManage: false, capabilities: [] },
  { role: 'studio_manager', canManage: true, capabilities: ['home.edit'] },
  { role: 'admin', canManage: true, capabilities: ['home.publish'] },
  { role: 'admin', canManage: true, capabilities: ['home.archive'] },
]) test(`empty sections offer no create action for ${config.role} / ${config.capabilities.join(',') || 'reader'}`, async ({ page }) => {
  await homeBackend(page, config);
  await page.goto('/tests/workspace.html?start=dashboard');
  await expect(page.getByText('Für dich sind aktuell keine wichtigen Links freigegeben.', { exact: true })).toBeVisible();
  for (const [, label] of actions) await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
  if (config.canManage) {
    await page.getByRole('button', { name: 'Startseite bearbeiten', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Eintrag hinzufügen', exact: true })).toHaveCount(0);
  }
});

for (const config of [{ failRead: true }, { missing: true }]) test(`unavailable home data has no create controls: ${Object.keys(config)[0]}`, async ({ page }) => {
  await homeBackend(page, config);
  await page.goto('/tests/workspace.html?start=dashboard');
  if (config.failRead) await expect(page.getByRole('alert')).toBeVisible();
  else await expect(page.getByRole('link', { name: '008_home_portal.sql öffnen', exact: true })).toBeVisible();
  for (const [, label] of actions) await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
});

test('loading home content exposes no premature create action', async ({ page }) => {
  const state = await homeBackend(page, { pending: true });
  try {
    await page.goto('/tests/workspace.html?start=dashboard');
    await expect(page.getByText('Startseiteninhalte werden geladen …')).toBeVisible();
    for (const [, label] of actions) await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
    state.release();
    await expect(page.getByRole('button', { name: 'Link hinzufügen', exact: true })).toBeVisible();
  } finally { state.release(); }
});

test('a denied direct save retains the draft and never claims success', async ({ page }) => {
  const state = await homeBackend(page, { failSave: true });
  await page.goto('/tests/workspace.html?start=dashboard');
  await page.getByRole('button', { name: 'Link hinzufügen', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await titleField(dialog).fill('Ungespeicherter Prüfentwurf');
  await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(titleField(dialog)).toHaveValue('Ungespeicherter Prüfentwurf');
  await expect(page.getByRole('status').filter({ hasText: 'Startseiteneintrag auf dem Server gespeichert' })).toHaveCount(0);
  expect(state.items).toHaveLength(0);
});

test('populated sections keep their entries and only empty neighbours offer the matching action', async ({ page }) => {
  await homeBackend(page, { items: [{ id: 'existing-link', kind: 'link', title: 'Freigegebene Prüfunterlagen', body: '', href: 'https://example.org/unterlagen',
    phone: '', studio_id: null, reader_roles: ['admin', 'studio_manager', 'employee'], published: true, position: 0, revision: 1, editable: true }] });
  await page.goto('/tests/workspace.html?start=dashboard');
  await expect(page.getByRole('link', { name: /Freigegebene Prüfunterlagen/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Link hinzufügen', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Neuigkeit hinzufügen', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ansprechpartner hinzufügen', exact: true })).toBeVisible();
});

test('mobile keyboard opens a usable direct form and Escape restores its trigger', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await homeBackend(page);
  await page.goto('/tests/workspace.html?start=dashboard');
  const trigger = page.getByRole('button', { name: 'Ansprechpartner hinzufügen', exact: true });
  await trigger.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(titleField(dialog)).toBeFocused();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/home-empty-contact-mobile.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  expect((await trigger.boundingBox()).height).toBeGreaterThanOrEqual(44);
});
