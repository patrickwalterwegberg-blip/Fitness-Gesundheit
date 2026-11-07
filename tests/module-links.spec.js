import {test,expect} from '@playwright/test';
import {sharedBackend,sharedIds} from './shared-backend';

const teamEntries=[['dashboard','Meine Übersicht'],['tasks','Aufgaben'],['calendar','Kalender'],['learning','Lernhub'],['knowledge','Wissenshub'],['chat','Chat'],['feedback','Feedback'],['files','Dateien'],['modules','Eigene Module'],['builder','Modulbaukasten'],['controlling','Controlling'],['access','Mitarbeiterzugänge']];
async function navigationBackend(page){
 const state=await sharedBackend(page);
 await page.route('https://teamhub-test.supabase.co/rest/v1/**',async route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1);
  const data={my_team_dashboard:{today:'2026-11-07',counts:{open:0,overdue:0,today:0,done:0},tasks:[],learning:[],knowledge:[]},team_task_calendar:{days:[]},team_feedback_list:{items:[],total:0},admin_controlling:{profiles:[],studios:[],tasks:[],courses:[],assignments:[],progress:[]}};
  if(Object.hasOwn(data,name))return route.fulfill({json:data[name]});
  if(['learning_courses','learning_assignments','learning_progress','learning_material','learning_reads','learning_attempts','custom_modules','module_drafts','module_versions','module_records','module_permissions'].includes(name))return route.fulfill({json:[]});
  return route.fallback();
 });return state;
}
test('each shared module menu link opens the correct area without runtime errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await navigationBackend(page);await page.goto('/tests/workspace.html?start=dashboard');
 for(const [id,label] of teamEntries){
  await page.getByRole('navigation',{name:'Teambereiche'}).getByRole('button',{name:label,exact:true}).click();
  await expect(page.locator('.team-shell-topbar .breadcrumb strong')).toHaveText(label);
  const headings={dashboard:'Meine Übersicht',calendar:'Aufgabenkalender',learning:'Lernen, anwenden, weiterkommen.',knowledge:'Gutes Wissen. Für dein Team.',chat:'Teamchat',feedback:'Feedback & Ideen',files:'Eure Dateien. An einem Ort.',modules:'Ein Platz für eure Prozesse.',builder:'Euer Alltag. Eure Module.',controlling:'Dein Team im Überblick.',access:'Dein Team. Alle Profile im Überblick.'};
  if(headings[id])await expect(page.getByRole('heading',{name:headings[id],exact:true})).toBeVisible();
  if(id==='tasks')await expect(page.locator('.team-task-list')).toBeVisible();
  if(id==='builder')await expect(page.getByRole('button',{name:'Neues Modul',exact:true})).toBeVisible();
  if(id==='controlling')await expect(page.getByRole('heading',{name:'Dein Team im Überblick.'})).toBeVisible();
  if(id==='access')await expect(page.getByRole('button',{name:'Mitarbeiter einladen',exact:true})).toBeVisible();
 }
 expect(errors).toEqual([]);
});
test('demo module menu destinations remain separate and every link changes the page',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#overview');
 const entries=[['employee','Mein Dashboard'],['tasks','Aufgaben'],['calendar','Kalender'],['knowledge','Wissenshub'],['learning','Lernhub'],['files','Dateien'],['custom','Eigene Module'],['team','Mitarbeiter'],['feedback','Feedback'],['crm','Kontakte & CRM'],['marketing','Marketinghub'],['equipment','Geräte'],['inventory','Lager & Bestellungen'],['statistics','Statistiken'],['contacts','Notfallkontakte'],['mail','E-Mail-Zentrale'],['builder','Modulbaukasten'],['controlling','Controlling'],['overview','Übersicht']];
 for(const [id,label] of entries){await page.locator('.sidebar').getByRole('button',{name:label,exact:true}).click();await expect(page).toHaveURL(new RegExp('#'+id+'$'));await expect(page.locator('main').getByRole('heading',{level:1}).first()).toBeVisible();}
 expect(errors).toEqual([]);
});
test('mobile module editor opens at its first field, keeps invalid input and restores keyboard focus',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#builder');const trigger=page.getByRole('button',{name:'Neues Modul',exact:true});await trigger.click();
 const popup=page.getByRole('dialog',{name:'Neues Modul gestalten'});await expect(popup).toBeVisible();await expect(popup.getByLabel('Modulname',{exact:true})).toBeFocused();
 await popup.getByLabel('Modulname',{exact:true}).fill('Mobiler Prüfablauf');await popup.getByRole('button',{name:'Veröffentlichen',exact:true}).click();
 await expect(popup.getByRole('alert')).toBeVisible();await expect(popup.getByLabel('Modulname',{exact:true})).toHaveValue('Mobiler Prüfablauf');
 await page.keyboard.press('Tab');expect(await popup.evaluate(el=>el.contains(document.activeElement))).toBe(true);
 const bounds=await popup.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(390);
 await page.screenshot({path:'test-results/module-popup-phone.png'});await page.keyboard.press('Escape');await expect(popup).toHaveCount(0);await expect(trigger).toBeFocused();
});
test('home feedback shortcut opens an editable popup immediately and can be cancelled',async({page})=>{
 await navigationBackend(page);await page.goto('/tests/workspace.html?start=dashboard');await page.locator('.home-function-grid').getByRole('button',{name:/Feedback geben/}).click();
 const popup=page.getByRole('dialog',{name:'Feedback geben'});await expect(popup).toBeVisible();await popup.getByLabel('Titel deines Feedbacks').fill('Vorschlag');await page.keyboard.press('Escape');await expect(popup).toHaveCount(0);
});
test('dashboard knowledge link opens the selected document as a popup',async({page})=>{
 const state=await navigationBackend(page);const doc={id:'00000000-0000-4000-8000-000000000161',title:'Direkte Studioanleitung',summary:'Direkt öffnen',category:'Einarbeitung',tags:[],studio_id:sharedIds.studio,reader_roles:['admin','employee'],created_by:sharedIds.user,published_version_id:'v-direct',archived:false,revision:1};state.documents.push(doc);state.versions.push({id:'v-direct',document_id:doc.id,version:1,state:'ready',kind:'article',title:doc.title,summary:doc.summary,tags:[],text_content:'Genau dieser freigegebene Inhalt.',created_at:'2026-11-07T10:00:00Z',published_at:'2026-11-07T10:00:00Z'});
 await page.route('**/rest/v1/rpc/my_team_dashboard',route=>route.fulfill({json:{today:'2026-11-07',counts:{open:0,overdue:0,today:0,done:0},tasks:[],learning:[],knowledge:[doc]}}));await page.goto('/tests/workspace.html?start=dashboard');await page.getByRole('button',{name:/Direkte Studioanleitung/}).click();
 const popup=page.getByRole('dialog',{name:doc.title});await expect(popup).toContainText('Genau dieser freigegebene Inhalt.');await page.keyboard.press('Escape');await expect(popup).toHaveCount(0);
});
