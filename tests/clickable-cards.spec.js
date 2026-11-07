import {test,expect} from '@playwright/test';
const record=(page,key)=>page.evaluate(key=>JSON.parse(localStorage.getItem('fg-hub-'+key)),key);
async function clickSurface(page,element){await element.scrollIntoViewIfNeeded();const box=await element.boundingBox();expect(box).not.toBeNull();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);}
test.beforeEach(async({page})=>{await page.clock.setFixedTime(new Date('2026-11-04T09:00:00Z'));});

test('device card opens prefilled editing, preserves identity and cancellation changes nothing',async({page})=>{
 await page.goto('/#equipment');const before=await record(page,'equipment');const card=page.locator('.equipment-card').filter({has:page.getByRole('heading',{name:'Laufband 01',exact:true})});
 await clickSurface(page,card.getByRole('heading'));const popup=page.getByRole('dialog',{name:'Gerät bearbeiten'});await expect(popup.getByLabel('Seriennummer')).toHaveValue(before[0].serial);await popup.getByLabel('Hersteller / Modell').fill('Aktualisiertes Modell');await popup.getByRole('button',{name:'Gerät speichern'}).click();
 const after=await record(page,'equipment');expect(after).toHaveLength(before.length);expect(after[0]).toEqual({...before[0],model:'Aktualisiertes Modell'});expect(after.slice(1)).toEqual(before.slice(1));
 await clickSurface(page,card.getByRole('heading'));await popup.getByLabel('Gerätename').fill('Nicht speichern');await page.keyboard.press('Escape');expect(await record(page,'equipment')).toEqual(after);await page.reload();await expect(card).toContainText('Aktualisiertes Modell');
});
test('equipment status and service controls remain independent from the card edit action',async({page})=>{
 await page.goto('/#equipment');const card=page.locator('.equipment-card').first();await card.getByRole('combobox').click();await page.keyboard.press('Escape');await card.getByRole('combobox').selectOption('Außer Betrieb');await expect(page.getByRole('dialog')).toHaveCount(0);expect((await record(page,'equipment'))[0].status).toBe('Außer Betrieb');
 await card.getByRole('button',{name:'Serviceaufgabe für Laufband 01'}).click();await expect(page.getByLabel('Was steht an?')).toHaveValue('Laufband 01: Service koordinieren');
});
test('CRM card editing and drag and drop preserve the existing contact and separate controls',async({page})=>{
 await page.goto('/#crm');const before=await record(page,'leads');const card=page.locator('.lead-card').filter({has:page.getByRole('heading',{name:'Interessent A',exact:true})});await clickSurface(page,card.getByRole('heading'));
 const popup=page.getByRole('dialog',{name:'Kontakt bearbeiten'});await expect(popup.getByLabel('Quelle')).toHaveValue('Website');await popup.getByLabel('Quelle').fill('Empfehlung');await popup.getByRole('button',{name:'Kontakt speichern'}).click();expect((await record(page,'leads'))[0]).toEqual({...before[0],source:'Empfehlung'});
 await card.getByRole('combobox').click();await page.keyboard.press('Escape');await card.getByRole('combobox').selectOption('Wiedervorlage');await expect(page.getByRole('dialog')).toHaveCount(0);
 await card.dragTo(page.locator('.pipeline-column').filter({has:page.getByRole('heading',{name:'Neue Leads',exact:true})}));await expect.poll(async()=>(await record(page,'leads'))[0].stage).toBe('Neue Leads');await expect(page.getByRole('dialog')).toHaveCount(0);expect(await record(page,'leads')).toHaveLength(before.length);
});
test('campaign surface opens its plan and editing keeps the campaign status and ID',async({page})=>{
 await page.goto('/#marketing');const before=await record(page,'campaigns');await clickSurface(page,page.locator('.campaign-cover').first());const popup=page.getByRole('dialog');await expect(popup).toContainText(before[0].desc);expect(await record(page,'campaigns')).toEqual(before);
 await popup.getByRole('button',{name:'Planung bearbeiten',exact:true}).click();await expect(page.getByLabel('Name der Kampagne')).toHaveValue(before[0].name);await page.getByLabel('Ziel & Angebot').fill('Überarbeitete lokale Planung');await page.getByRole('button',{name:'Entwurf speichern',exact:true}).click();expect((await record(page,'campaigns'))[0]).toEqual({...before[0],desc:'Überarbeitete lokale Planung'});
});
test('contact surface edits prefilled details while the telephone link remains independent',async({page})=>{
 await page.goto('/#contacts');let card=page.locator('.contact-card').first();await clickSurface(page,card.getByRole('heading'));const popup=page.getByRole('dialog');await expect(popup.getByLabel('Name / Zuständigkeit')).toHaveValue('Studioleitung');await popup.getByLabel('Telefonnummer').fill('+49 30 123456');await popup.getByRole('button',{name:'Kontakt speichern'}).click();card=page.locator('.contact-card').first();
 await page.evaluate(()=>document.addEventListener('click',event=>{if(event.target.closest('a[href^="tel:"]'))event.preventDefault();}));const call=card.getByRole('link',{name:'Anrufen'});await expect(call).toHaveAttribute('href','tel:+4930123456');await call.click();await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('read-only integration cards open using the keyboard without creating a connection',async({page})=>{
 const requests=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1'))requests.push(r.url());});await page.goto('/#settings');const open=page.getByRole('button',{name:'Dropbox als Anbindung öffnen'});await open.focus();await page.keyboard.press('Enter');const popup=page.getByRole('dialog',{name:'Dropbox'});await expect(popup).toContainText('Nicht verbunden');await page.keyboard.press('Escape');await expect(popup).toHaveCount(0);expect(requests).toEqual([]);
});
test('personal notice surface opens its text without marking it as read',async({page})=>{
 await page.goto('/#employee');const notice=page.locator('.employee-notice').first();const title=await notice.getByRole('heading').textContent();const before=await record(page,'notice-reads');await clickSurface(page,notice.getByRole('heading'));await expect(page.getByRole('dialog',{name:title})).toContainText('Beispielhinweis');expect(await record(page,'notice-reads')).toEqual(before);await page.keyboard.press('Escape');await notice.getByRole('button',{name:/als gelesen markieren/}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('statistic and controlling cards show matching read-only details',async({page})=>{
 await page.goto('/#statistics');await clickSurface(page,page.locator('.chart-panel').getByRole('heading'));await expect(page.getByRole('dialog',{name:'Aufgaben je Studio'}).getByRole('table')).toBeVisible();await page.keyboard.press('Escape');await page.goto('/#controlling');await page.getByRole('button',{name:'Offene Aufgaben öffnen',exact:true}).click();const popup=page.getByRole('dialog',{name:'Offene Aufgaben'});await expect(popup.locator('.control-task-link').first()).toBeVisible();await popup.locator('.control-task-link').first().click();await expect(page.getByRole('dialog')).toHaveCount(1);await expect(page.getByLabel('Bearbeitungsstatus')).toBeVisible();
});
test('card editing fits a phone and touching its surface opens the correct form',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#equipment');await clickSurface(page,page.locator('.equipment-card').first().getByRole('heading'));const popup=page.getByRole('dialog',{name:'Gerät bearbeiten'});await expect(popup).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/clickable-card-phone.png'});await page.keyboard.press('Escape');await expect(popup).toHaveCount(0);
});
