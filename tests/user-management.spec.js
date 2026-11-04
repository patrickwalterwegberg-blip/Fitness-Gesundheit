import { test, expect } from '@playwright/test';
import { sharedBackend, sharedIds } from './shared-backend';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-11-04T10:00:00+01:00')); });
async function users(page) { await page.goto('/tests/workspace.html'); await page.getByRole('button', { name: 'Mitarbeiterzugänge', exact: true }).click(); }

test('user search and role filters are sent to the server', async ({ page }) => {
  const backend = await sharedBackend(page); await users(page);
  await page.getByLabel('Nutzer nach Name oder E-Mail suchen', { exact: true }).fill('mitarbeiter@example.org');
  await page.getByRole('button', { name: 'Nutzer suchen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Nutzerprofil Patrick Test öffnen', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nutzerprofil Mitarbeiter Beispiel öffnen', exact: true })).toBeVisible();
  await page.getByLabel('Rolle filtern', { exact: true }).selectOption('employee');
  await expect.poll(() => backend.calls.filter(c => c.path.endsWith('/admin_team_directory') && c.body.p_role === 'employee').length).toBeGreaterThan(0);
});

test('user profile shows actual task and academy data and separates editor rights', async ({ page }) => {
  const backend = await sharedBackend(page); await users(page);
  await page.getByRole('button', { name: 'Nutzerprofil Mitarbeiter Beispiel öffnen', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Nutzerprofil Mitarbeiter Beispiel', exact: true });
  await expect(dialog.locator('.user-stat-grid>div').first()).toContainText('5');
  await expect(dialog).toContainText('Einarbeitung Empfang');
  await expect(dialog).toContainText('2/4 Lektionen gelesen');
  await dialog.getByLabel('Neue Module erstellen', { exact: true }).check();
  await expect(dialog.getByLabel('Module bearbeiten', { exact: true })).toBeChecked();
  await dialog.getByRole('button', { name: 'Modulrechte speichern', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('Modulrechte auf dem Server gespeichert');
  expect(backend.rights).toEqual({ create: true, edit: true, publish: false });
  const request = backend.calls.find(c => c.path === '/rest/v1/module_permissions');
  expect(request.body.user_id).toBe(sharedIds.colleague);
});

test('CSV import previews editable rows before explicit invitation requests', async ({ page }) => {
  const backend = await sharedBackend(page); await users(page);
  await page.getByRole('button', { name: 'Nutzer importieren', exact: true }).click();
  await page.getByLabel('Mitarbeiterdatei auswählen', { exact: true }).setInputFiles({ name: 'team.csv', mimeType: 'text/csv', buffer: Buffer.from('Name;E-Mail;Studio;Rolle\nAnna Beispiel;anna@example.org;Dörpen;Mitarbeiter\nBen Beispiel;ben@example.org;Sögel;Studioleitung') });
  await expect(page.getByLabel('Name Importzeile 1', { exact: true })).toHaveValue('Anna Beispiel');
  await expect(page.getByLabel('Studio Importzeile 2', { exact: true })).toHaveValue(sharedIds.otherStudio);
  expect(backend.calls.some(c => c.path.startsWith('/functions/'))).toBe(false);
  await page.getByRole('button', { name: '2 Einladungen anfordern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('2 Einladungen beim E-Mail-Dienst angefordert');
  const requests = backend.calls.filter(c => c.path.startsWith('/functions/'));
  expect(requests).toHaveLength(2);
  expect(requests[0].body.role).toBe('employee');
  expect(requests[1].body.role).toBe('studio_manager');
  expect(requests[1].body.studioIds).toEqual([sharedIds.otherStudio]);
});

test('real XLSX file is read without creating users automatically', async ({ page }) => {
  const backend = await sharedBackend(page); await users(page);
  await page.getByRole('button', { name: 'Nutzer importieren', exact: true }).click();
  await page.getByLabel('Mitarbeiterdatei auswählen', { exact: true }).setInputFiles('tests/fixtures/team-import.xlsx');
  await expect(page.getByLabel('Name Importzeile 1', { exact: true })).toHaveValue('Mia Exceltest');
  await expect(page.getByLabel('E-Mail Importzeile 1', { exact: true })).toHaveValue('mia@example.org');
  expect(backend.calls.some(c => c.path.startsWith('/functions/'))).toBe(false);
});

test('duplicate import emails are blocked until the duplicate is deselected', async ({ page }) => {
  const backend = await sharedBackend(page); await users(page);
  await page.getByRole('button', { name: 'Nutzer importieren', exact: true }).click();
  await page.getByLabel('Kontakte oder E-Mail-Liste einfügen', { exact: true }).fill('Anna <anna@example.org>\nAnna doppelt <anna@example.org>');
  await page.getByRole('button', { name: 'Vorschau erstellen', exact: true }).click();
  await expect(page.getByRole('button', { name: '2 Einladungen anfordern', exact: true })).toBeDisabled();
  await page.getByLabel('Importzeile 2 auswählen', { exact: true }).uncheck();
  await expect(page.getByRole('button', { name: '1 Einladung anfordern', exact: true })).toBeEnabled();
  expect(backend.calls.some(c => c.path.startsWith('/functions/'))).toBe(false);
});

test('missing profile extension shows setup error instead of invented statistics', async ({ page }) => {
  await sharedBackend(page, { existingProfile: false }); await users(page);
  await page.getByRole('button', { name: 'Nutzerprofil Mitarbeiter Beispiel öffnen', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toContainText('Migration 005');
  await expect(dialog.locator('.user-stat-grid')).toHaveCount(0);
});

test('user profiles and import fit phone screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sharedBackend(page); await users(page);
  await page.getByRole('button', { name: 'Nutzerprofil Mitarbeiter Beispiel öffnen', exact: true }).click();
  await expect(page.getByRole('dialog').locator('.user-stat-grid')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/user-profile-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Nutzerprofil schließen', exact: true }).click();
  await page.getByRole('button', { name: 'Nutzer importieren', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
