import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { sharedBackend, sharedIds } from './shared-backend';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-11-04T10:00:00+01:00')); });
async function files(page) { await page.goto('/tests/workspace.html'); if(page.viewportSize().width<=760)await page.getByRole('button',{name:'Menü öffnen'}).click(); await page.getByRole('button', { name: 'Dateien', exact: true }).click(); }
async function article(page, title, text) {
  await page.getByRole('button', { name: 'Artikel schreiben', exact: true }).click();
  await page.getByLabel('Titel des Inhalts', { exact: true }).fill(title);
  await page.getByLabel('Artikeltext', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Entwurf speichern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Entwurf gemeinsam gespeichert');
}
async function upload(page, name, mimeType, buffer) {
  await page.getByRole('button', { name: 'Datei hochladen', exact: true }).click();
  await page.getByLabel('Originaldatei auswählen', { exact: true }).setInputFiles({ name, mimeType, buffer });
  await page.getByRole('button', { name: 'Entwurf speichern', exact: true }).click();
}

test('shared articles require publication and remain plain text in search and detail', async ({ page }) => {
  const backend = await sharedBackend(page); await files(page);
  const text = 'Handtuch am Empfang. <img src=x onerror="window.untrustedExecuted=true">';
  await article(page, 'Empfangsablauf', text);
  await expect(page.locator('.knowledge-article')).toHaveText(text);
  expect(await page.evaluate(() => window.untrustedExecuted)).toBeUndefined();
  expect(backend.documents[0].published_version_id).toBeNull();
  await page.getByRole('button', { name: 'Version freigeben', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Version freigegeben');
  await page.getByRole('button', { name: 'Wissenshub', exact: true }).click();
  await page.getByLabel('Wissen durchsuchen', { exact: true }).fill('Handtuch');
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Empfangsablauf', exact: true })).toBeVisible();
  expect(backend.calls.some(c => c.path.endsWith('/search_knowledge') && c.body.p_query === 'Handtuch')).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('fg-hub-docs'))).toBeNull();
});

test('shared file upload preserves original bytes and older versions', async ({ page }) => {
  const backend = await sharedBackend(page); await files(page);
  const original = Buffer.from('Original checklist 123');
  await upload(page, 'checkliste.txt', 'text/plain', original);
  await expect(page.getByRole('status')).toContainText('Entwurf gemeinsam gespeichert');
  await expect(page.locator('.knowledge-article')).toHaveText(original.toString());
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Original herunterladen', exact: true }).click();
  const received = await download; expect(received.suggestedFilename()).toBe('checkliste.txt');
  expect(await readFile(await received.path())).toEqual(original);
  await page.getByRole('button', { name: 'Version freigeben', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Version freigegeben');
  const firstId = backend.versions[0].id, firstPath = backend.versions[0].object_path;
  await page.getByRole('button', { name: 'Neue Version', exact: true }).click();
  await page.getByLabel('Originaldatei auswählen', { exact: true }).setInputFiles({ name: 'checkliste.txt', mimeType: 'text/plain', buffer: Buffer.from('Updated checklist 456') });
  await page.getByRole('button', { name: 'Entwurf speichern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Entwurf gemeinsam gespeichert');
  await expect(page.locator('.knowledge-article')).toHaveText('Updated checklist 456');
  expect(backend.documents[0].published_version_id).toBe(firstId);
  expect(backend.originals.get(firstPath)).toEqual(original);
  expect(backend.versions[1].object_path).not.toBe(firstPath);
});

test('employee can suggest content only for own studio and cannot release it', async ({ page }) => {
  const backend = await sharedBackend(page, { role: 'employee', pages: ['dashboard','tasks','calendar','learning','knowledge','chat','feedback','files'] }); await files(page);
  await article(page, 'Vorschlag vom Empfang', 'Hinweise zur morgendlichen Kontrolle.');
  await expect(page.locator('.knowledge-detail')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Version freigeben', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Freigabe & Zugriff', exact: true })).toHaveCount(0);
  expect(backend.documents[0].studio_id).toBe(sharedIds.studio);
  expect(backend.calls.some(c => c.path.endsWith('/publish_knowledge_version'))).toBe(false);
});

test('failed upload keeps inputs, cleans the reserved object and never reports success', async ({ page }) => {
  const backend = await sharedBackend(page, { failUpload: true }); await files(page);
  await upload(page, 'fehler.txt', 'text/plain', Buffer.from('Keep this original'));
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Titel des Inhalts', { exact: true })).toHaveValue('fehler.txt');
  await expect(page.getByRole('status')).toHaveCount(0);
  expect(backend.calls.some(c => c.method === 'DELETE' && c.path.startsWith('/storage/'))).toBe(true);
  expect(backend.calls.some(c => c.path.endsWith('/cancel_knowledge_upload'))).toBe(true);
  expect(backend.calls.some(c => c.path.endsWith('/finish_knowledge_upload'))).toBe(false);
  expect(backend.versions).toHaveLength(0);
});

test('image and video previews use authenticated downloads without public links', async ({ page }) => {
  const backend = await sharedBackend(page); await files(page);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64');
  await upload(page, 'kontrolle.png', 'image/png', png);
  await page.getByRole('button', { name: /Vorschau laden/ }).click();
  await expect(page.getByRole('img', { name: 'kontrolle.png', exact: true })).toBeVisible();
  await expect.poll(() => page.getByRole('img', { name: 'kontrolle.png', exact: true }).evaluate(img => img.naturalWidth)).toBe(1);
  await upload(page, 'training.mp4', 'video/mp4', Buffer.from('test video payload'));
  await page.getByRole('button', { name: /Vorschau laden/ }).click();
  await expect(page.locator('.knowledge-preview video')).toHaveAttribute('controls', '');
  await expect(page.locator('.knowledge-preview video')).toHaveAttribute('src', /^blob:/);
  expect(backend.calls.some(c => c.path.includes('/object/public/'))).toBe(false);
  expect(backend.calls.some(c => c.path.includes('/object/sign/'))).toBe(false);
});

test('missing knowledge migration gives concrete setup guidance', async ({ page }) => {
  await sharedBackend(page, { missingKnowledge: true }); await files(page);
  await expect(page.getByRole('alert')).toContainText('Migration 004');
  await expect(page.getByRole('link', { name: 'Datenbankerweiterung öffnen' })).toHaveAttribute('href', /004_knowledge_files.sql$/);
  await expect(page.getByRole('heading', { name: 'Studio-Check', exact: true })).toHaveCount(0);
});

test('new article versions start from selected text and permission settings are revisioned', async ({ page }) => {
  const backend = await sharedBackend(page); await files(page);
  await article(page, 'Sicherheitsablauf', 'Bisher geprüfter Ablauf.');
  await page.getByRole('button', { name: 'Version freigeben', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Version freigegeben');
  await page.getByRole('button', { name: 'Neue Version', exact: true }).click();
  await expect(page.getByLabel('Artikeltext', { exact: true })).toHaveValue('Bisher geprüfter Ablauf.');
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await page.getByRole('button', { name: 'Freigabe & Zugriff', exact: true }).click();
  await page.getByLabel('Inhalt archivieren', { exact: true }).check();
  await page.getByRole('button', { name: 'Zugriff speichern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Freigaben auf dem Server gespeichert');
  const request = backend.calls.find(c => c.path.endsWith('/set_knowledge_access'));
  expect(request.body.p_expected_revision).toBe(2);
  expect(request.body.p_archived).toBe(true);
});

test('shared knowledge editor fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sharedBackend(page); await files(page);
  await page.getByRole('button', { name: 'Datei hochladen', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/shared-knowledge-mobile.png', fullPage: true });
});

test('an uploaded draft can be found, released and displayed in knowledge with filters reset', async ({ page }) => {
  const backend = await sharedBackend(page); await files(page);
  await upload(page, 'studio-anleitung.txt', 'text/plain', Buffer.from('Freigegebene Studioanleitung.'));
  await expect(page.getByRole('status')).toContainText('Entwurf gemeinsam gespeichert');
  await expect(page.locator('.knowledge-detail')).toContainText('Dieser Inhalt ist ein Entwurf');
  await page.getByRole('button', { name: 'Wissenshub', exact: true }).click();
  await expect(page.locator('.knowledge-empty')).toContainText('Neue Uploads bleiben bis zur Freigabe');
  await page.getByRole('button', { name: 'Sichtbare Entwürfe anzeigen', exact: true }).click();
  const card = page.locator('.shared-document-card').filter({ has: page.getByRole('heading', { name: 'studio-anleitung.txt', exact: true }) });
  await card.click();
  await expect(page.getByRole('button', { name: 'Version freigeben', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Version freigeben', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Version freigegeben');
  await expect(page.getByLabel('Freigabestatus', { exact: true })).toHaveValue('published');
  await expect(card).toBeVisible();
  await page.getByLabel('Thema', { exact: true }).selectOption('Einarbeitung');
  await expect(card).toHaveCount(0);
  await page.getByRole('button', { name: 'Filter zurücksetzen', exact: true }).click();
  await expect(card).toBeVisible();
  expect(backend.documents[0].published_version_id).toBe(backend.versions[0].id);
});

test('published files open the shared knowledge view directly', async ({ page }) => {
  await sharedBackend(page); await files(page);
  await upload(page, 'regelwerk.txt', 'text/plain', Buffer.from('Studio-Regelwerk.'));
  await page.getByRole('button', { name: 'Version freigeben', exact: true }).click();
  await page.getByRole('button', { name: 'Wissenshub öffnen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Gutes Wissen. Für dein Team.', exact: true })).toBeVisible();
  await expect(page.locator('.shared-document-card').filter({ hasText: 'regelwerk.txt' })).toBeVisible();
});

test('unfinished upload removal cannot report success after a Storage failure', async ({ page }) => {
  const backend = await sharedBackend(page, { failUpload: true, failRemove: true }); await files(page);
  await upload(page, 'unvollstaendig.txt', 'text/plain', Buffer.from('Unvollständig'));
  await expect(page.getByRole('alert')).toContainText('unvollständiger Upload kann zurückgeblieben sein');
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await page.getByRole('button', { name: 'Dateien und Wissen aktualisieren', exact: true }).click();
  await page.locator('.shared-document-card').filter({ hasText: 'unvollstaendig.txt' }).click();
  await page.getByRole('button', { name: 'Unvollständigen Upload entfernen', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  expect(backend.versions).toHaveLength(1);
  expect(backend.calls.some(c => c.path.endsWith('/cancel_knowledge_upload'))).toBe(false);
});

test('switching accounts clears the previous document before the new profile loads', async ({ page }) => {
  await sharedBackend(page); await files(page);
  await article(page, 'Privater Adminentwurf', 'Dieser Inhalt gehört zur vorherigen Sitzung.');
  await expect(page.locator('.knowledge-article')).toBeVisible();
  const nextUser = '00000000-0000-4000-8000-000000000009';
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('https://teamhub-test.supabase.co/rest/v1/profiles*', async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('id') !== 'eq.' + nextUser) return route.fallback();
    await gate;
    return route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([{ id: nextUser, full_name: 'Neue Person', role: 'employee', active: true }]) });
  });
  await page.evaluate(id => {
    const key = 'sb-teamhub-test-auth-token';
    const previous = JSON.parse(localStorage.getItem(key));
    const session = { ...previous, user: { ...previous.user, id, email: 'neu@example.org' } };
    localStorage.setItem(key, JSON.stringify(session));
    const channel = new BroadcastChannel(key); channel.postMessage({ event: 'SIGNED_IN', session }); channel.close();
  }, nextUser);
  try { await expect(page.locator('.knowledge-article')).toHaveCount(0); }
  finally { release(); }
  await expect(page.getByRole('heading', { name: 'Hallo, Neue.', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mitarbeiterzugänge', exact: true })).toHaveCount(0);
});
