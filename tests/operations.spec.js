import {test,expect} from '@playwright/test';
import {sharedBackend} from './shared-backend';
import {operationsFixture} from './operations-fixture';
import catalog from '../src/function-catalog.json' with {type:'json'};
async function backend(page,{role='admin'}={}){
 const base=await sharedBackend(page,{role});const state={result:operationsFixture(),failure:null,queries:[],pages:['dashboard','tasks','calendar','knowledge','access'],caps:catalog.map(c=>c.key)};
 await page.route('https://teamhub-test.supabase.co/rest/v1/rpc/team_access_context',route=>route.fulfill({json:{version:13,pages:state.pages,capabilities:state.caps,can_design:false}}));
 await page.route('https://teamhub-test.supabase.co/rest/v1/rpc/admin_operations_status',route=>{state.queries.push(route.request().postDataJSON());return state.failure?route.fulfill({status:403,json:state.failure}):route.fulfill({json:state.result});});
 return {...base,state};
}
async function start(page,where='dashboard'){await page.goto('/tests/workspace.html?start='+where);if(where==='access')await page.getByRole('heading',{name:'Dein Team. Alle Profile im Überblick.'}).waitFor();await page.getByRole('button',{name:'Betriebsprüfung öffnen',exact:true}).click();return page.getByRole('dialog',{name:'Betriebsprüfung',exact:true});}
test('admin opens a fresh read-only operational inventory on the homepage; no mail or mutation is requested',async({page})=>{
 const {state,calls}=await backend(page);await page.goto('/tests/workspace.html?start=dashboard');await expect(page.getByRole('button',{name:'Betriebsprüfung öffnen',exact:true})).toBeVisible();expect(state.queries).toHaveLength(0);await page.getByRole('button',{name:'Betriebsprüfung öffnen',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Betriebsprüfung',exact:true});await expect(dialog.getByText(/Serverprüfung am/)).toBeVisible();await expect(dialog.getByText('Aktive Mitarbeiter ohne Studio: 0',{exact:true})).toBeVisible();await expect(dialog.getByText(/Weitere Nachweise bleiben offen/)).toBeVisible();await expect(dialog.getByText(/Cron-Erweiterung nicht vorhanden/)).toBeVisible();expect(state.queries).toEqual([{}]);expect(calls.some(c=>c.path.includes('/functions/v1/team-access'))).toBe(false);expect(calls.some(c=>['PATCH','DELETE'].includes(c.method))).toBe(false);
});
test('global inventory is also reachable from employee administration',async({page})=>{
 const {state}=await backend(page);const dialog=await start(page,'access');await expect(dialog.getByText(/Serverprüfung am/)).toBeVisible();expect(state.queries).toHaveLength(1);
});
test('public storage, missing RLS and suspicious counts remain visible as review items rather than a general approval',async({page})=>{
 const {state}=await backend(page);state.result.buckets[0].private=false;state.result.tables[0].rls=false;state.result.quality.active_without_studio=3;const dialog=await start(page);await expect(dialog.getByText(/Dateibereich ist öffentlich/)).toBeVisible();await expect(dialog.getByText(/RLS nicht aktiv/)).toBeVisible();await expect(dialog.getByText('Aktive Mitarbeiter ohne Studio: 3',{exact:true})).toBeVisible();expect(await dialog.locator('.ops-attention').count()).toBeGreaterThanOrEqual(4);await expect(dialog.getByText(/Datenschutzinformation, Anbietervereinbarungen/)).toBeVisible();
});
test('a failed refresh discards the previous report and does not leave stale successful checks visible',async({page})=>{
 const {state}=await backend(page);const dialog=await start(page);await expect(dialog.getByText(/Serverprüfung am/)).toBeVisible();state.failure={code:'42501',message:'private-provider-detail@example.org'};await dialog.getByRole('button',{name:'Betriebsprüfung aktualisieren',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('aktive Admin-');await expect(dialog.locator('.operations-findings')).toHaveCount(0);await expect(dialog.locator('.operations-timestamp')).toHaveCount(0);await expect(dialog).not.toContainText('private-provider-detail');state.failure=null;await dialog.getByRole('button',{name:'Betriebsprüfung aktualisieren',exact:true}).click();await expect(dialog.getByText(/Serverprüfung am/)).toBeVisible();
});
test('missing RPC gives the exact setup file without installing or changing data automatically',async({page})=>{
 const {state}=await backend(page);state.failure={code:'PGRST202'};const dialog=await start(page);await expect(dialog.getByRole('alert')).toContainText('Erweiterung 014');await expect(dialog.getByRole('link',{name:'Erweiterung 014 öffnen'})).toHaveAttribute('href',/014_operations_check\.sql$/);await expect(dialog.locator('.operations-findings')).toHaveCount(0);expect(state.queries).toHaveLength(1);
});
test('incomplete snapshots cannot produce apparently successful checks',async({page})=>{
 const {state}=await backend(page);delete state.result.quality.auth_without_profile;const dialog=await start(page);await expect(dialog.getByRole('alert')).toContainText('nicht bestätigt');await expect(dialog.locator('.operations-findings')).toHaveCount(0);
});
test('delegated employee managers cannot open the operational inventory',async({page})=>{
 const {state}=await backend(page,{role:'employee'});await page.goto('/tests/workspace.html?start=dashboard');await expect(page.getByRole('heading',{name:'Meine Übersicht',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Betriebsprüfung öffnen',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Mitarbeiterzugänge',exact:true}).click();await expect(page.getByRole('heading',{name:'Dein Team. Alle Profile im Überblick.'})).toBeVisible();await expect(page.getByRole('button',{name:'Betriebsprüfung öffnen',exact:true})).toHaveCount(0);expect(state.queries).toHaveLength(0);
});
test('the inventory fits a phone, allows scrolling to refresh and restores focus when closed',async({page})=>{
 await page.setViewportSize({width:390,height:844});await backend(page);await page.goto('/tests/workspace.html?start=dashboard');await page.getByRole('button',{name:'Betriebsprüfung öffnen',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Betriebsprüfung',exact:true});await expect(dialog.getByText(/Serverprüfung am/)).toBeVisible();expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);const refresh=dialog.getByRole('button',{name:'Betriebsprüfung aktualisieren',exact:true});await refresh.scrollIntoViewIfNeeded();const box=await refresh.boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(844);await page.screenshot({path:'test-results/operations-mobile.png'});await dialog.getByRole('button',{name:'Fenster schließen',exact:true}).click();await expect(page.getByRole('button',{name:'Betriebsprüfung öffnen',exact:true})).toBeFocused();
});
test('withdrawn area access clears an open operational report on the next permission refresh',async({page})=>{
 await page.clock.install({time:new Date('2026-11-06T10:00:00Z')});const {state}=await backend(page);const dialog=await start(page);await expect(dialog.getByText(/Serverprüfung am/)).toBeVisible();state.pages=['tasks'];state.caps=[];await page.clock.fastForward(31000);await expect(page.getByRole('dialog',{name:'Betriebsprüfung',exact:true})).toHaveCount(0);await expect(page.getByText(/Serverprüfung am/)).toHaveCount(0);expect(state.queries).toHaveLength(1);
});
