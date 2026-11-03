import { test, expect } from '@playwright/test';

const sites = ['Sögel', 'Bersenbrück', 'Dörpen', 'Lathen', 'Haselünne', 'Löningen', 'Werlte'];

test('all real studio names appear in selection, task assignment and statistics', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Studio auswählen').locator('option')).toHaveText(['Alle Studios', ...sites]);
  await page.getByRole('button', { name: 'Aufgabe erstellen', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Studio', { exact: false }).first().locator('option')).toHaveText(sites);
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.goto('/#statistics');
  for (const site of sites) await expect(page.getByRole('cell', { name: site, exact: true })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/Studio 0[2-7]/);
});

test('existing browser data migrates once without losing content or completion status', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('fg-hub-studio', JSON.stringify('Studio 03'));
    const collections = ['tasks', 'docs', 'leads', 'inventory', 'orders', 'equipment', 'campaigns', 'people', 'contacts', 'feedback', 'notices'];
    for (const key of collections) {
      const item = {
        id: key === 'people' ? 'p1' : 'legacy-' + key,
        name: 'Patrick Walter', title: 'Eigener Testeintrag', studio: 'Studio 03',
        person: 'Patrick Walter', role: 'Geschäftsführung', status: 'Erledigt',
        due: '2026-11-03', category: 'Team', repeat: 'Einmalig', priority: 'Normal',
        done: true, stock: 8, min: 5, tags: [],
        content: 'Unveränderter Originaltext mit Studio 03.',
        customField: 'Eigene Ergänzung bleibt erhalten',
      };
      localStorage.setItem('fg-hub-' + key, JSON.stringify([item]));
    }
    localStorage.setItem('fg-hub-notices', JSON.stringify([
      { id: 'notice-3', title: 'Inventur', studio: 'Studio 05', priority: 'Info', body: 'Beispielhinweis für Studio 05: Bestände vor Ort zählen und mit der Lagerübersicht abgleichen.' },
      { id: 'custom-notice', title: 'Eigener Hinweis', studio: 'Studio 06', priority: 'Info', body: 'Mein eigener Hinweis zu Studio 06 bleibt unverändert.' },
    ]));
  });
  await page.reload();
  await expect(page.getByLabel('Studio auswählen')).toHaveValue('Bersenbrück');
  await expect(page.getByRole('button', { name: 'Eigener Testeintrag', exact: true }).first()).toBeVisible();
  const snapshot = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('fg-hub-')).map(k => [k, JSON.parse(localStorage.getItem(k))])));
  for (const key of ['tasks', 'docs', 'leads', 'inventory', 'orders', 'equipment', 'campaigns', 'people', 'contacts', 'feedback']) {
    expect(snapshot['fg-hub-' + key][0].studio).toBe('Bersenbrück');
    expect(snapshot['fg-hub-' + key][0].customField).toBe('Eigene Ergänzung bleibt erhalten');
  }
  expect(snapshot['fg-hub-tasks'][0].done).toBe(true);
  expect(snapshot['fg-hub-docs'][0].content).toBe('Unveränderter Originaltext mit Studio 03.');
  expect(snapshot['fg-hub-notices'][0].studio).toBe('Haselünne');
  expect(snapshot['fg-hub-notices'][0].body).toContain('für Haselünne:');
  expect(snapshot['fg-hub-notices'][1].studio).toBe('Löningen');
  expect(snapshot['fg-hub-notices'][1].body).toBe('Mein eigener Hinweis zu Studio 06 bleibt unverändert.');
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fg-hub-tasks')))).toEqual(snapshot['fg-hub-tasks']);
});
