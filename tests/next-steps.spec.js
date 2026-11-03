import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-11-03T09:00:00+01:00')); });

test('task edits, in-progress state and employee replies persist', async ({ page }) => {
  await page.goto('/#tasks');
  await page.getByRole('button', { name: 'Wartung der Trainingsgeräte koordinieren', exact: true }).click();
  await page.getByLabel('Bearbeitungsstatus', { exact: true }).selectOption('In Bearbeitung');
  await page.getByLabel('Deine Rückmeldung', { exact: true }).fill('Servicetermin ist angefragt.');
  await page.getByRole('button', { name: 'Rückmeldung speichern' }).click();
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  await page.getByLabel('Was steht an?').fill('Wartung: Termin bestätigen');
  await page.getByLabel('Beschreibung & Hinweise').fill('Bitte Rückruf des Service abwarten.');
  await page.getByLabel('Fällig am').fill('2026-11-05');
  await page.getByRole('button', { name: 'Änderungen speichern' }).click();
  await expect(page.getByRole('dialog')).toContainText('Servicetermin ist angefragt.');
  await expect(page.getByLabel('Bearbeitungsstatus', { exact: true })).toHaveValue('In Bearbeitung');
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'In Bearbeitung', exact: true }).click();
  await page.getByRole('button', { name: 'Wartung: Termin bestätigen', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Bitte Rückruf des Service abwarten.');
  await expect(page.getByRole('dialog')).toContainText('Servicetermin ist angefragt.');
  await expect(page.getByRole('dialog')).toContainText('05.11.2026');
});

test('monthly recurrence clamps at month end and does not duplicate on reopen', async ({ page }) => {
  await page.goto('/#tasks');
  await page.getByRole('button', { name: 'Aufgabe erstellen', exact: true }).click();
  await page.getByLabel('Was steht an?').fill('Monatsende prüfen');
  await page.getByLabel('Fällig am').fill('2027-01-31');
  await page.getByLabel('Wiederholung').selectOption('Monatlich');
  await page.getByRole('dialog').getByRole('button', { name: 'Aufgabe erstellen' }).click();
  await page.getByRole('button', { name: 'Monatsende prüfen erledigen' }).click();
  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fg-hub-tasks')).filter(t => t.title === 'Monatsende prüfen'));
  expect(stored.map(t => t.due).sort()).toEqual(['2027-01-31', '2027-02-28']);
  await page.getByRole('button', { name: 'Monatsende prüfen wieder öffnen' }).click();
  await page.getByRole('button', { name: 'Monatsende prüfen erledigen' }).first().click();
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fg-hub-tasks')).filter(t => t.title === 'Monatsende prüfen'));
  expect(stored).toHaveLength(2);
});

test('current date and calendar use Berlin time across midnight', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-31T23:15:00Z'));
  await page.goto('/#calendar');
  await expect(page.locator('.context-date')).toContainText('01. Februar 2027');
  await expect(page.getByRole('heading', { name: 'Februar 2027', exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  await page.getByRole('button', { name: 'Heute', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Februar 2027', exact: false })).toBeVisible();
});

test('team access without backend does not simulate authentication or upload demo data', async ({ page }) => {
  const requests = [];
  page.on('request', r => { if (new URL(r.url()).hostname.endsWith('.supabase.co')) requests.push(r.url()); });
  await page.goto('/#workspace');
  await expect(page.getByRole('heading', { name: 'Die Grundlage ist vorbereitet.' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Deine Firmen-E-Mail-Adresse' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Teamaufgabe erstellen' })).toHaveCount(0);
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: 'Zur Demo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Guten Morgen, Patrick' })).toBeVisible();
});
