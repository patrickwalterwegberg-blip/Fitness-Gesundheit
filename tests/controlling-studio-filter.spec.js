import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { sharedBackend, sharedIds } from './shared-backend';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sites = ['Bersenbrück', 'Dörpen', 'Haselünne', 'Lathen', 'Löningen', 'Sögel', 'Werlte'].map((name, i) => ({ id: id(100 + i), name }));
const profiles = [
  { id: sharedIds.user, full_name: 'Leitung Test', role: 'admin', active: true },
  { id: sharedIds.colleague, full_name: 'Team Nord', role: 'employee', active: true },
  { id: id(20), full_name: 'Empfang Haselünne', role: 'employee', active: true },
  { id: id(21), full_name: 'Ohne Zuordnung', role: 'employee', active: true },
  { id: id(22), full_name: 'Historisches Lernziel', role: 'employee', active: true },
];
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-11-23T09:00:00+01:00')); });
async function controllingBackend(page) {
  await sharedBackend(page);
  const state = { memberships: [
    { user_id: sharedIds.colleague, studio_id: sites[0].id },
    { user_id: sharedIds.colleague, studio_id: sites[1].id },
    { user_id: id(20), studio_id: sites[2].id },
  ] };
  await page.route('https://teamhub-test.supabase.co/rest/v1/studios*', route => route.fulfill({ json: sites }));
  await page.route('https://teamhub-test.supabase.co/rest/v1/studio_memberships*', route => route.fulfill({ json: state.memberships }));
  await page.route('https://teamhub-test.supabase.co/rest/v1/rpc/admin_controlling', route => route.fulfill({ json: {
    profiles, studios: sites, tasks: [
      { id: id(90), title: 'Aufgabe für Studio A', assignee_id: sharedIds.colleague, studio_id: sites[0].id, status: 'open', due_date: '2026-11-25' },
      { id: id(91), title: 'Aufgabe für Studio B', assignee_id: sharedIds.colleague, studio_id: sites[1].id, status: 'done', due_date: '2026-11-22', completed_at: '2026-11-22T10:00:00Z', completed_by: sharedIds.colleague },
    ],
    courses: [{ id: id(80), title: 'Bestehender Lernauftrag', lesson_count: 1 }],
    assignments: [{ id: id(81), learner_id: id(22), course_id: id(80), studio_id: sites[3].id, requires_practice: false }],
    progress: [{ assignment_id: id(81), lessons_read: 0, quiz_passed: false, practice_confirmed: false }],
  } }));
  await page.goto('/tests/workspace.html?start=controlling');
  await expect(page.getByRole('heading', { name: 'Dein Team im Überblick.', exact: true })).toBeVisible();
  return state;
}
async function expectSelection(page, names) {
  await expect(page.locator('.control-table tbody tr td:first-child strong')).toHaveText(names);
  await expect(page.locator('.stat-card').filter({ hasText: 'Mitarbeiter im Blick' }).locator('.stat-value')).toHaveText(`${names.length}Mitarbeiter im Blick`);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV exportieren', exact: true }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe('fg-controlling.csv');
  const lines = (await readFile(await file.path(), 'utf8')).split('\r\n');
  expect(lines.slice(1).map(line => line.split(';')[0])).toEqual(names.map(name => `"${name}"`));
  return lines.slice(1);
}

for (const [i, studio] of sites.entries()) {
  test(`controlling counts and CSV match real studio assignments in ${studio.name}`, async ({ page }) => {
    await controllingBackend(page);
    await page.getByLabel('Standort im Controlling', { exact: true }).selectOption(studio.name);
    const expected = ['Leitung Test'];
    if (i < 2) expected.push('Team Nord');
    if (i === 2) expected.push('Empfang Haselünne');
    if (i === 3) expected.push('Historisches Lernziel');
    const csv = await expectSelection(page, expected);
    if (i < 2) {
      const row = page.locator('.control-table tbody tr').filter({ hasText: 'Team Nord' });
      await expect(row.locator('td').nth(1)).toHaveText(i === 0 ? '1' : '0');
      await expect(row.locator('td').nth(3)).toHaveText(i === 0 ? '0' : '1');
      expect(csv.find(line => line.startsWith('"Team Nord";')).split(';').slice(2, 5)).toEqual(i === 0 ? ['"1"', '"0"', '"0"'] : ['"0"', '"0"', '"1"']);
      await page.getByRole('button', { name: 'Details zu Team Nord', exact: true }).click();
      await expect(page.getByRole('dialog').locator('.control-task-link')).toHaveText(i === 0 ? /Aufgabe für Studio A/ : /Aufgabe für Studio B/);
      await page.getByRole('button', { name: 'Mitarbeiterdetails schließen', exact: true }).click();
    }
  });
}

test('all studios retains unassigned staff and displays concrete multiple assignments', async ({ page }) => {
  await controllingBackend(page);
  await expectSelection(page, profiles.map(p => p.full_name));
  const member = page.locator('.control-table tbody tr').filter({ hasText: 'Team Nord' });
  await expect(member.locator('td').first()).toContainText('Bersenbrück · Dörpen');
});

test('person and unrelated studio filters produce an empty table, count and CSV', async ({ page }) => {
  await controllingBackend(page);
  await page.getByLabel('Mitarbeiter im Controlling', { exact: true }).selectOption(sharedIds.colleague);
  await page.getByLabel('Standort im Controlling', { exact: true }).selectOption('Haselünne');
  await expect(page.getByRole('heading', { name: 'Keine Mitarbeiter in dieser Auswahl.', exact: true })).toBeVisible();
  await expectSelection(page, []);
});

test('reloading after a removed membership stops counting that employee in its studio', async ({ page }) => {
  const state = await controllingBackend(page);
  await page.getByLabel('Standort im Controlling', { exact: true }).selectOption('Dörpen');
  await expectSelection(page, ['Leitung Test', 'Team Nord']);
  state.memberships = state.memberships.filter(m => m.studio_id !== sites[1].id);
  await page.reload();
  await page.getByLabel('Standort im Controlling', { exact: true }).selectOption('Dörpen');
  await expectSelection(page, ['Leitung Test']);
  await page.getByLabel('Standort im Controlling', { exact: true }).selectOption('Bersenbrück');
  await expectSelection(page, ['Leitung Test', 'Team Nord']);
});

test('mobile studio selection uses the same filtered rows and export', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await controllingBackend(page);
  await page.getByLabel('Standort im Controlling', { exact: true }).selectOption('Dörpen');
  await expectSelection(page, ['Leitung Test', 'Team Nord']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.control-table').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('mobile-controlling-filter.png') });
});
