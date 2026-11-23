import { test, expect } from '@playwright/test';
import { sharedBackend } from './shared-backend';
import { readFile } from 'node:fs/promises';

// Exercise the real entry point: mounting TeamWorkspace alone misses demo hooks.
async function configuredEntry(page) {
  await page.route('**/src/backend-config.js*', route => route.fulfill({
    contentType: 'application/javascript',
    body: "export function backendConfig(){return {url:'https://teamhub-test.supabase.co',publishableKey:'sb_publishable_test_only'};}",
  }));
}
async function demoStorage(page) {
  return page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('fg-hub-'))));
}

for (const entry of ['/', '/?team=1', '/login.html']) {
  test(`team entry ${entry} does not initialize demo data`, async ({ page }) => {
    await configuredEntry(page);
    await page.goto(entry);
    await expect(page.getByRole('heading', { name: 'Willkommen im Team.', exact: true })).toBeVisible();
    expect(await demoStorage(page)).toEqual({});
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Willkommen im Team.', exact: true })).toBeVisible();
    expect(await demoStorage(page)).toEqual({});
  });
}

test('team entry preserves existing local records without migration or writes', async ({ page }) => {
  await configuredEntry(page);
  const stored = '[ { "id": "kept-local", "title": "Meine lokale Notiz", "studio": "Studio 03" } ]';
  await page.addInitScript(value => {
    localStorage.setItem('fg-hub-tasks', value);
    window.demoWrites = [];
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, data) {
      if (key.startsWith('fg-hub-')) window.demoWrites.push(key);
      return setItem.call(this, key, data);
    };
  }, stored);
  await page.goto('/?team=1');
  await expect(page.getByRole('heading', { name: 'Willkommen im Team.', exact: true })).toBeVisible();
  expect(await demoStorage(page)).toEqual({ 'fg-hub-tasks': stored });
  expect(await page.evaluate(() => window.demoWrites)).toEqual([]);
});

test('admin opts into demo and returns to the same team session without transferring demo tasks', async ({ page }) => {
  await configuredEntry(page);
  const backend = await sharedBackend(page);
  await page.goto('/?team=1');
  await expect(page.getByRole('heading', { name: 'Hallo, Patrick.', exact: true })).toBeVisible();
  expect(await demoStorage(page)).toEqual({});
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem('sb-teamhub-test-auth-token')).access_token);
  await page.getByRole('button', { name: 'Zur Demo', exact: true }).click();
  await expect(page.locator('.demo-mode-banner')).toContainText('Demo-Vorschau');
  await page.getByRole('button', { name: 'Aufgaben', exact: true }).click();
  await page.getByRole('button', { name: 'Aufgabe erstellen', exact: true }).click();
  await page.getByLabel('Was steht an?').fill('Nur in meiner lokalen Demo');
  await page.getByRole('dialog').getByRole('button', { name: 'Aufgabe erstellen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Nur in meiner lokalen Demo', exact: true })).toBeVisible();
  const localTasks = (await demoStorage(page))['fg-hub-tasks'];
  await page.getByRole('button', { name: 'Zum Teamzugang', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hallo, Patrick.', exact: true })).toBeVisible();
  expect((await demoStorage(page))['fg-hub-tasks']).toBe(localTasks);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sb-teamhub-test-auth-token')).access_token)).toBe(session);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hallo, Patrick.', exact: true })).toBeVisible();
  expect((await demoStorage(page))['fg-hub-tasks']).toBe(localTasks);
  await page.getByRole('button', { name: 'Zur Demo', exact: true }).click();
  await page.getByRole('button', { name: 'Aufgaben', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Nur in meiner lokalen Demo', exact: true })).toBeVisible();
  expect(backend.calls.filter(c => c.path === '/rest/v1/tasks' && c.method !== 'GET')).toEqual([]);
  expect(backend.calls.filter(c => c.path.startsWith('/auth/') && c.method !== 'GET')).toEqual([]);
});

test('mobile employee entry stays in the team and does not create demo records', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await configuredEntry(page);
  await sharedBackend(page, { role: 'employee' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hallo, Patrick.', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zur Demo', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Menü öffnen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Aufgaben', exact: true })).toBeVisible();
  expect(await demoStorage(page)).toEqual({});
});

test('mobile demo banner and browser history keep the Team/Demo boundary', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await configuredEntry(page);
  await page.goto('/#overview');
  const banner = page.locator('.demo-mode-banner');
  await expect(banner).toContainText('nur in diesem Browser');
  const teamButton = page.getByRole('button', { name: 'Zum Teamzugang', exact: true });
  await expect(teamButton).toBeInViewport();
  expect(await banner.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-demo-boundary.png') });
  const stored = await demoStorage(page);
  await teamButton.click();
  await expect(page.getByRole('heading', { name: 'Willkommen im Team.', exact: true })).toBeVisible();
  expect(await demoStorage(page)).toEqual(stored);
  await page.goBack();
  await expect(banner).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Willkommen im Team.', exact: true })).toBeVisible();
  expect(await demoStorage(page)).toEqual(stored);
});

for (const via of ['button', 'history']) {
  test(`pending local upload survives Team switch via ${via}`, async ({ page }) => {
    await configuredEntry(page);
    await page.addInitScript(() => {
      const text = File.prototype.text;
      File.prototype.text = async function () {
        if (this.name === 'demo-boundary.txt') await new Promise(resolve => { window.releaseDemoText = resolve; });
        return text.call(this);
      };
    });
    await page.goto('/#files');
    await page.getByLabel('Dateien auswählen', { exact: true }).setInputFiles({ name: 'demo-boundary.txt', mimeType: 'text/plain', buffer: Buffer.from('Lokaler Upload bleibt erhalten.') });
    await page.waitForFunction(() => typeof window.releaseDemoText === 'function');
    await page.getByRole('button', { name: 'Zum Teamzugang', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Willkommen im Team.', exact: true })).toBeVisible();
    if (via === 'history') {
      await page.goBack();
      await expect(page.locator('.demo-mode-banner')).toBeVisible();
      await page.goForward();
      await expect(page.getByRole('heading', { name: 'Willkommen im Team.', exact: true })).toBeVisible();
    }
    await page.evaluate(() => window.releaseDemoText());
    await expect.poll(async () => JSON.parse((await demoStorage(page))['fg-hub-docs']).filter(d => d.title === 'demo-boundary.txt').length).toBe(1);
    await page.goBack();
    await page.getByRole('button', { name: /demo-boundary\.txt/ }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('dialog').getByRole('button', { name: 'Herunterladen', exact: true }).click();
    expect(await readFile(await (await download).path(), 'utf8')).toBe('Lokaler Upload bleibt erhalten.');
  });
}
