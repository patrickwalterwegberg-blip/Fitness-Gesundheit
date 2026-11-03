import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('dashboard and all modules render without runtime errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const external = [];
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:5173') && !request.url().startsWith('data:')) external.push(request.url()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Guten Morgen, Patrick' })).toBeVisible();
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });
  for (const route of ['employee', 'tasks', 'calendar', 'knowledge', 'files', 'learning', 'team', 'feedback', 'crm', 'marketing', 'equipment', 'inventory', 'statistics', 'contacts', 'mail', 'settings', 'assistant']) {
    await page.goto('/#' + route);
    await expect(page.locator('main h1')).toBeVisible();
  }
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('create, filter, complete and persist a recurring task', async ({ page }) => {
  await page.goto('/#tasks');
  await page.getByRole('button', { name: 'Aufgabe erstellen', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Was steht an?').fill('Wiederkehrende Browserprüfung');
  await dialog.getByLabel('Wiederholung').selectOption('Wöchentlich');
  await dialog.getByRole('button', { name: 'Aufgabe erstellen' }).click();
  await expect(page.getByRole('button', { name: 'Wiederkehrende Browserprüfung', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Wiederkehrende Browserprüfung erledigen' }).click();
  await expect(page.getByRole('button', { name: 'Wiederkehrende Browserprüfung', exact: true })).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Wiederkehrende Browserprüfung', exact: true })).toHaveCount(2);
  await page.getByRole('textbox', { name: '', exact: true }).fill('Wiederkehrende Browserprüfung');
  await page.getByRole('button', { name: 'Erledigt', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Wiederkehrende Browserprüfung', exact: true })).toHaveCount(1);
  await page.getByLabel('Studio auswählen').selectOption('Werlte');
  await expect(page.getByRole('button', { name: 'Wiederkehrende Browserprüfung', exact: true })).toHaveCount(0);
});

test('upload, approve, find and retrieve a source-backed document', async ({ page }) => {
  await page.goto('/#files');
  await page.getByLabel('Dateien auswählen').setInputFiles({ name: 'Saunacheck.txt', mimeType: 'text/plain', buffer: Buffer.from('Saunacheck: Prüfe vor Öffnung den Kontrollplan. Zuständig ist die Studioleitung. Die Freigabe wird im Prüfprotokoll vermerkt.') });
  await expect(page.getByRole('heading', { name: 'Saunacheck.txt' })).toBeVisible();
  await page.getByRole('button', { name: /Saunacheck.txt/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Saunacheck: Prüfe vor Öffnung');
  await page.getByRole('button', { name: 'Freigeben', exact: true }).click();
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.goto('/#assistant');
  await page.getByLabel('Frage an den Wissensassistenten').pressSequentially('Was ist beim Saunacheck zu tun?');
  await page.getByRole('button', { name: 'Frage senden', exact: true }).click();
  await expect(page.locator('.chat-message.assistant')).toContainText('Prüfe vor Öffnung den Kontrollplan');
  await page.getByRole('button', { name: 'Saunacheck.txt' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Herunterladen', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('Saunacheck.txt');
});

test('anonymous feedback has no author and can be followed by code', async ({ page }) => {
  await page.goto('/#feedback');
  await page.getByRole('button', { name: 'Feedback geben' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Worum geht es?').fill('Verbesserung im Studio');
  await dialog.getByLabel('Deine Rückmeldung').fill('Bitte den Materialschrank beschriften.');
  await dialog.getByLabel('Anonym abgeben').check();
  await dialog.getByRole('button', { name: 'Feedback lokal einreichen' }).click();
  const code = await page.locator('.feedback-code strong').innerText();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fg-hub-feedback')));
  expect(stored[0]).not.toHaveProperty('author');
  expect(stored[0].anonymous).toBe(true);
  await page.getByRole('button', { name: 'Verstanden', exact: true }).click();
  await page.getByRole('button', { name: 'Mit Rückmeldecode suchen' }).click();
  await page.getByLabel('Rückmeldecode').fill(code);
  await page.getByRole('button', { name: 'Meldung suchen' }).click();
  await expect(page.getByRole('dialog')).toContainText('Bitte den Materialschrank beschriften.');
});

test('local order and receipt update inventory without duplicate receipt', async ({ page }) => {
  await page.goto('/#inventory');
  await page.getByRole('row').filter({ hasText: 'Whey Protein · Vanille' }).getByRole('button', { name: 'Bestellung anlegen' }).click();
  await page.getByLabel('Bestellmenge').fill('8');
  await page.getByRole('button', { name: 'Bestellvorgang anlegen' }).click();
  await page.getByRole('button', { name: 'Bestellungen', exact: true }).click();
  await page.getByRole('button', { name: 'Wareneingang buchen' }).click();
  await expect(page.getByText('Geliefert', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Wareneingang buchen' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Whey Protein · Vanille' }).locator('.stock-counter strong')).toHaveText('10');
});

test('CRM stage and learning progress persist', async ({ page }) => {
  await page.goto('/#crm');
  await page.getByLabel('Stufe für Interessent A').selectOption('Gewonnen');
  await expect(page.locator('.pipeline-column').filter({ has: page.getByRole('heading', { name: 'Gewonnen', exact: true }) })).toContainText('Interessent A');
  await page.goto('/#learning');
  await page.getByRole('button', { name: 'Weiterlernen', exact: true }).click();
  await page.getByRole('button', { name: 'Gelesen & verstanden', exact: true }).click();
  await page.getByRole('button', { name: 'Gelesen & verstanden', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Noch einmal ansehen' })).toBeVisible();
});

test('mobile navigation and forms fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Guten Morgen, Patrick' })).toBeVisible();
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Menü öffnen' }).click();
  await page.getByRole('button', { name: 'Aufgaben', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Gemeinsam Dinge bewegen.');
  await page.getByRole('button', { name: 'Aufgabe erstellen', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, view: innerWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.view);
  await page.getByLabel('Was steht an?').fill('Mobile Aufgabe');
  await page.getByRole('dialog').getByRole('button', { name: 'Aufgabe erstellen' }).click();
  await expect(page.getByRole('button', { name: 'Mobile Aufgabe', exact: true })).toBeVisible();
});

test('global search, device service task and reminder preference work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Suchen …' }).click();
  await page.getByPlaceholder('Aufgaben, Wissen, Bereiche …').pressSequentially('Telefon');
  await page.getByRole('dialog').getByRole('button', { name: /Unser Telefonleitfaden/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Begrüße Anrufer freundlich');
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.goto('/#equipment');
  await page.getByRole('button', { name: 'Serviceaufgabe für Laufband 01' }).click();
  await expect(page.getByLabel('Was steht an?')).toHaveValue('Laufband 01: Service koordinieren');
  await page.getByRole('dialog').getByRole('button', { name: 'Aufgabe erstellen' }).click();
  await page.goto('/#calendar');
  await page.getByRole('button', { name: 'Erinnerungen', exact: true }).click();
  await page.getByLabel('Empfängeradresse').fill('demo@example.org');
  await page.getByLabel('Erinnerungen vor Fälligkeit wünschen').check();
  await page.getByRole('button', { name: 'Einstellung speichern' }).click();
  await page.getByRole('button', { name: 'Erinnerungen', exact: true }).click();
  await expect(page.getByLabel('Empfängeradresse')).toHaveValue('demo@example.org');
  await expect(page.getByRole('dialog')).toContainText('Automatische E-Mails benötigen einen Server');
});

test('standalone HTML needs no asset requests and keeps local interactions offline', async ({ page, context }) => {
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  const html = await readFile('dist/Teamhub.html', 'utf8');
  // The managed browser blocks file://. Serve the exact artifact through a local
  // intercepted document request; all subsequent network access stays offline.
  await page.route('http://127.0.0.1:5173/standalone-validation', route => route.fulfill({ contentType: 'text/html', body: html }));
  await context.setOffline(true);
  await page.goto('/standalone-validation');
  await expect(page.getByRole('heading', { name: 'Guten Morgen, Patrick' })).toBeVisible();
  await page.getByRole('button', { name: 'Aufgabe erstellen', exact: true }).click();
  await page.getByLabel('Was steht an?').fill('Offline-Testaufgabe');
  await page.getByRole('dialog').getByRole('button', { name: 'Aufgabe erstellen' }).click();
  await expect(page.getByRole('button', { name: 'Offline-Testaufgabe', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(requests).toEqual(['http://127.0.0.1:5173/standalone-validation']);
});

test('employee dashboard isolates assigned tasks, notice acknowledgements and learning progress', async ({ page }) => {
  await page.goto('/#employee');
  await expect(page.locator('.employee-tasks')).toContainText('Wartung der Trainingsgeräte koordinieren');
  await expect(page.locator('.employee-tasks')).not.toContainText('Bestand an Proteinshakes prüfen');
  await page.getByLabel('Mitarbeiteransicht auswählen').selectOption('p2');
  await expect(page.locator('.employee-tasks')).toContainText('Bestand an Proteinshakes prüfen');
  await expect(page.locator('.employee-tasks')).not.toContainText('Wartung der Trainingsgeräte koordinieren');
  await expect(page.locator('.employee-tasks')).not.toContainText('Neue Mitarbeiterin im Empfang einarbeiten');
  await page.getByRole('button', { name: 'Gerätestörungen direkt melden als gelesen markieren' }).click();
  await page.locator('.employee-learning').getByRole('button', { name: 'Weiterlernen', exact: true }).click();
  await page.getByRole('button', { name: 'Gelesen & verstanden', exact: true }).click();
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Mitarbeiteransicht auswählen')).toHaveValue('p2');
  await expect(page.getByRole('button', { name: 'Gerätestörungen direkt melden als ungelesen markieren' })).toHaveAttribute('aria-pressed', 'true');
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('fg-hub-learning-progress')));
  expect(progress.p2.c1).toEqual([0]);
  await page.getByLabel('Mitarbeiteransicht auswählen').selectOption('p1');
  await expect(page.getByRole('button', { name: 'Gerätestörungen direkt melden als gelesen markieren' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Alle meine Aufgaben' }).click();
  await expect(page.getByLabel('Aufgabenansicht')).toHaveValue('mine');
  await expect(page.getByRole('button', { name: 'Wartung der Trainingsgeräte koordinieren', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bestand an Proteinshakes prüfen', exact: true })).toHaveCount(0);
});

test('studio notices reach the right dashboard and personal statistics update', async ({ page }) => {
  await page.goto('/#employee');
  await page.getByRole('button', { name: 'Hinweis erstellen' }).click();
  await page.getByLabel('Titel des Hinweises').fill('Testhinweis nur für Sögel');
  await page.getByLabel('Mitteilung', { exact: true }).fill('Eine organisatorische Information für das Team.');
  await page.getByRole('dialog').getByLabel('Standort').selectOption('Sögel');
  await page.getByRole('button', { name: 'Hinweis lokal veröffentlichen' }).click();
  await expect(page.getByRole('heading', { name: 'Testhinweis nur für Sögel' })).toBeVisible();
  await page.getByLabel('Mitarbeiteransicht auswählen').selectOption('p2');
  await expect(page.getByRole('heading', { name: 'Testhinweis nur für Sögel' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Bestand an Proteinshakes prüfen erledigen' }).click();
  await page.goto('/#statistics');
  await expect(page.locator('.personal-statistics')).toContainText('Studioleitung');
  await expect(page.locator('.personal-statistics strong').first()).toContainText('1');
  await expect(page.locator('iframe')).toHaveCount(0);
  // Inspect the external-view integration without relying on the external host.
  await page.route('https://fg-gmbh-statistiken-2026.pwalter98.chatgpt.site/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Externe Statistik-Testseite</h1>' }));
  await page.getByRole('button', { name: 'Bestehende Statistikseite', exact: true }).click();
  await expect(page.getByTitle('Bestehende Statistikseite der FG GmbH 2026')).toHaveAttribute('src', 'https://fg-gmbh-statistiken-2026.pwalter98.chatgpt.site/');
  await expect(page.getByRole('link', { name: 'Separat öffnen' })).toHaveAttribute('href', 'https://fg-gmbh-statistiken-2026.pwalter98.chatgpt.site/');
});

test('employee dashboard fits a mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#employee');
  await page.getByLabel('Mitarbeiteransicht auswählen').selectOption('p2');
  await expect(page.getByRole('heading', { name: 'Hallo, Studioleitung' })).toBeVisible();
  await page.getByRole('button', { name: 'Gerätestörungen direkt melden als gelesen markieren' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/employee-dashboard-mobile.png', fullPage: true });
});
