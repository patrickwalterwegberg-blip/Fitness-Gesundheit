import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-11-04T10:00:00+01:00')); });
async function profile(page, id) {
  if(await page.getByRole('button',{name:'Mitarbeiterdetails schließen'}).isVisible())await page.getByRole('button',{name:'Mitarbeiterdetails schließen'}).click();
  await page.getByRole('button', { name: 'Demo-Profil wechseln', exact: true }).click();
  await page.getByLabel('Profil für die Vorschau').selectOption(id);
}
async function createModule(page, title, label, type = 'text', target = 'standalone') {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Neues Modul', exact: true }).click();
  await page.getByLabel('Modulname', { exact: true }).fill(title);
  await page.getByLabel('Bereich des Moduls', { exact: true }).selectOption(target);
  await page.getByRole('button', { name: 'Feld hinzufügen', exact: true }).click();
  await page.getByLabel('Feldbezeichnung 1', { exact: true }).fill(label);
  await page.getByLabel('Feldtyp 1', { exact: true }).selectOption(type);
  await page.getByLabel('Pflichtfeld 1', { exact: true }).check();
}
async function publish(page) { await page.getByRole('button', { name: 'Veröffentlichen', exact: true }).click(); await expect(page.locator('.admin-success')).toContainText('Neue Modulversion veröffentlicht'); }
async function openModule(page, title) { if(await page.getByRole('button',{name:'Moduleditor schließen'}).isVisible()){await page.getByRole('dialog').getByRole('button',{name:'Modul öffnen',exact:true}).click();return;} await page.locator('.builder-module-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) }).getByRole('button', { name: 'Modul öffnen' }).click(); }

test('module versions preserve original records and can be restored', async ({ page }) => {
  await createModule(page, 'Serviceprotokoll', 'Seriencode');
  await publish(page);
  await openModule(page, 'Serviceprotokoll');
  await page.getByRole('button', { name: 'Neuer Eintrag', exact: true }).click();
  await page.getByLabel('Standort des Eintrags').selectOption('Dörpen');
  await page.getByLabel('Seriencode').fill('ORIGINAL-123');
  await page.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
  await page.getByRole('button', { name: 'Eintrag 1', exact: true }).click();
  await expect(page.locator('.module-record-detail')).toContainText('ORIGINAL-123');
  await page.goto('/#builder');
  const card = page.locator('.builder-module-card').filter({ has: page.getByRole('heading', { name: 'Serviceprotokoll', exact: true }) });
  await card.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
  await page.getByLabel('Feldtyp 1').selectOption('number');
  await page.getByLabel('Feldbezeichnung 1').fill('Prüfwert');
  await publish(page);
  await openModule(page, 'Serviceprotokoll');
  await page.getByRole('button', { name: 'Eintrag 1', exact: true }).click();
  await expect(page.locator('.module-record-detail')).toContainText('Seriencode');
  await expect(page.locator('.module-record-detail')).toContainText('ORIGINAL-123');
  await page.goto('/#builder');
  await card.locator('summary').click();
  await card.locator('.module-version').filter({ hasText: 'Version 1' }).getByRole('button', { name: 'Wiederherstellen' }).click();
  const state = await page.evaluate(() => ({ modules: JSON.parse(localStorage.getItem('fg-hub-modules')), records: JSON.parse(localStorage.getItem('fg-hub-module-records')) }));
  const module = state.modules.find(m => m.versions.some(v => v.schema.title === 'Serviceprotokoll'));
  expect(module.versions).toHaveLength(3);
  expect(module.versions[2].schema.fields[0].type).toBe('text');
  expect(state.records).toHaveLength(1);
  expect(state.records[0].versionId).toBe(module.versions[0].id);
});

test('selected editor can draft but cannot publish or open controlling', async ({ page }) => {
  await page.goto('/#builder');
  await page.getByRole('button', { name: 'Berechtigungen', exact: true }).click();
  await page.getByLabel('Marketing-Team: Erstellen', { exact: true }).check();
  await expect(page.getByLabel('Marketing-Team: Bearbeiten', { exact: true })).toBeChecked();
  await profile(page, 'p3');
  await createModule(page, 'Marketingablauf', 'Aktionsname');
  await expect(page.getByRole('button', { name: 'Veröffentlichen', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Entwurf speichern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Entwurf gespeichert');
  await page.goto('/#controlling');
  await expect(page.getByRole('heading', { name: 'Controlling nur für die Geschäftsführung' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'CSV exportieren', exact: true })).toHaveCount(0);
  await page.goto('/#custom');
  await expect(page.getByRole('heading', { name: 'Marketingablauf', exact: true })).toHaveCount(0);
});

test('unselected profile cannot use the module builder', async ({ page }) => {
  await page.goto('/'); await profile(page, 'p2'); await page.goto('/#builder');
  await expect(page.getByRole('heading', { name: 'Modulbaukasten nicht freigegeben' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Neues Modul', exact: true })).toHaveCount(0);
});

test('custom fields can be attached to an existing device', async ({ page }) => {
  await createModule(page, 'Wartungsdaten', 'Servicenummer', 'text', 'equipment');
  await publish(page); await page.goto('/#equipment');
  await page.getByRole('button', { name: 'Zusatzfelder für Laufband 01', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Neuer Eintrag', exact: true }).click();
  await page.getByLabel('Servicenummer').fill('SERVICE-TEST-55');
  await page.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Laufband 01', exact: true }).click();
  await expect(page.locator('.module-record-detail')).toContainText('SERVICE-TEST-55');
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('fg-hub-module-records')));
  expect(records[0].entityId).toBe('e1'); expect(records[0].studio).toBe('Dörpen');
});

test('learning goals distinguish reading, knowledge and administrator-confirmed practice', async ({ page }) => {
  await page.goto('/#controlling');
  await page.getByRole('button', { name: 'Lernziel zuweisen' }).click();
  await page.getByLabel('Mitarbeiter für das Lernziel').selectOption('p2');
  await page.getByLabel('Kurs für das Lernziel').selectOption('c1');
  await page.getByLabel('Standort des Lernziels').selectOption('Dörpen');
  await page.getByLabel('Praktische Einweisung muss zusätzlich bestätigt werden').check();
  await page.getByRole('button', { name: 'Lernziel speichern', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Praxis bestätigen', exact: true })).toBeDisabled();
  await profile(page, 'p2'); await page.goto('/#learning');
  const course = page.locator('.course-card').filter({ has: page.getByRole('heading', { name: 'Willkommen im Team', exact: true }) });
  await course.getByRole('button', { name: 'Jetzt starten', exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Gelesen & verstanden', exact: true }).click();
  await course.getByRole('button', { name: 'Wissenstest starten', exact: true }).click();
  await page.getByLabel('Nur beim Verkauf von Mitgliedschaften').check();
  await page.getByRole('button', { name: 'Wissenstest auswerten', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Noch nicht bestanden');
  await page.getByLabel('Beim Finden von Wissen, Aufgaben und Ansprechpartnern').check();
  await page.getByRole('button', { name: 'Wissenstest auswerten', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Wissenstest bestanden');
  await page.getByRole('button', { name: 'Schließen', exact: true }).click();
  await profile(page, 'p1'); await page.goto('/#controlling');
  await page.getByRole('button', { name: 'Details zu Studioleitung', exact: true }).click();
  await page.getByRole('button', { name: 'Praxis bestätigen', exact: true }).click();
  await page.getByLabel('Notiz zur Praxiseinweisung').fill('Praktische Einweisung vor Ort durchgeführt.');
  await page.getByLabel('Ich bestätige, dass die praktische Einweisung durchgeführt und geprüft wurde.').check();
  await page.getByRole('button', { name: 'Praxisbestätigung speichern', exact: true }).click();
  await expect(page.getByText('Lernziel abgeschlossen', { exact: true })).toBeVisible();
  const confirmations = await page.evaluate(() => JSON.parse(localStorage.getItem('fg-hub-practice-confirmations')));
  expect(confirmations[0].by).toBe('p1');
  expect(confirmations[0].byName).toBe('Patrick Walter');
});

test('controlling shows documented completion actor and respects the completion period', async ({ page }) => {
  await page.goto('/'); await profile(page, 'p2');
  await page.getByRole('button', { name: 'Bestand an Proteinshakes prüfen erledigen', exact: true }).click();
  await profile(page, 'p1'); await page.goto('/#controlling');
  await page.getByLabel('Mitarbeiter im Controlling').selectOption('p2');
  await page.getByRole('button', { name: 'Details zu Studioleitung', exact: true }).click();
  await expect(page.locator('.control-detail')).toContainText('Erledigt von: Studioleitung');
  await page.getByRole('button',{name:'Mitarbeiterdetails schließen'}).click();
  await page.getByLabel('Zeitraum für Aufgabenabschlüsse').selectOption('custom');
  await page.getByLabel('Abschluss von').fill('2027-01-01'); await page.getByLabel('Abschluss bis').fill('2027-01-31');
  const row = page.locator('.control-table tbody tr').first();
  await expect(row.locator('td').nth(3)).toHaveText('0');
  await expect(row.locator('td').nth(1)).toHaveText('2');
});

test('module file fields store originals and allow later download', async ({ page }) => {
  await createModule(page, 'Prüfprotokolle', 'Protokolldatei', 'file');
  await publish(page); await openModule(page, 'Prüfprotokolle');
  await page.getByRole('button', { name: 'Neuer Eintrag', exact: true }).click();
  await page.getByLabel('Protokolldatei').setInputFiles({ name: 'protokoll.txt', mimeType: 'text/plain', buffer: Buffer.from('Unverändertes Testprotokoll') });
  await page.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
  await page.getByRole('button', { name: 'Eintrag 1', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'protokoll.txt', exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe('protokoll.txt');
});

test('builder and controlling fit mobile screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createModule(page, 'Mobiler Ablauf', 'Kontrollnotiz');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/module-builder-mobile.png', fullPage: true });
  await page.goto('/#controlling');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/controlling-mobile.png', fullPage: true });
});


test('module record popup edits its original version and cancellation leaves saved data intact',async({page})=>{
 await createModule(page,'Prüfprotokoll','Prüfnotiz');await publish(page);await openModule(page,'Prüfprotokoll');
 await page.getByRole('button',{name:'Neuer Eintrag',exact:true}).click();const form=page.getByRole('dialog',{name:'Neuer Eintrag · Version 1'});
 await form.getByLabel('Prüfnotiz *',{exact:true}).fill('Erste Kontrolle');await form.getByRole('button',{name:'Eintrag speichern'}).click();
 await page.getByRole('button',{name:'Eintrag 1',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Eintrag bearbeiten'}).click();
 const editor=page.getByRole('dialog',{name:'Eintrag bearbeiten · Version 1'});await expect(editor.getByLabel('Prüfnotiz *',{exact:true})).toHaveValue('Erste Kontrolle');await expect(editor.getByLabel('Prüfnotiz *',{exact:true})).toBeFocused();
 await editor.getByLabel('Prüfnotiz *',{exact:true}).fill('Geprüft und ergänzt');await editor.getByRole('button',{name:'Eintrag speichern'}).click();
 await page.getByRole('button',{name:'Eintrag 1',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Geprüft und ergänzt');
 await page.getByRole('dialog').getByRole('button',{name:'Eintrag bearbeiten'}).click();await editor.getByLabel('Prüfnotiz *',{exact:true}).fill('Nicht speichern');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Eintrag 1',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Geprüft und ergänzt');await expect(page.getByRole('dialog')).not.toContainText('Nicht speichern');
});


test('Escape closes only the top additional-field popup and returns focus to the parent',async({page})=>{
 await createModule(page,'Wartungsfenster','Servicenotiz','text','equipment');await publish(page);await page.getByRole('button',{name:'Moduleditor schließen'}).click();await page.goto('/#equipment');
 await page.getByRole('button',{name:'Zusatzfelder für Laufband 01',exact:true}).click();const parent=page.getByRole('dialog');const trigger=parent.getByRole('button',{name:'Neuer Eintrag',exact:true});await trigger.click();
 const child=page.getByRole('dialog',{name:'Neuer Eintrag · Version 1'});await expect(child).toBeVisible();await child.getByLabel('Servicenotiz').fill('Nicht speichern');await page.keyboard.press('Escape');await expect(child).toHaveCount(0);await expect(page.getByRole('dialog')).toHaveCount(1);await expect(trigger).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('fg-hub-module-records')))).toEqual([]);
});
