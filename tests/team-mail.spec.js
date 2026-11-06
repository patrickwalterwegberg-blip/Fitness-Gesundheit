import {test,expect} from '@playwright/test';
import {sharedBackend,sharedIds} from './shared-backend';
import catalog from '../src/function-catalog.json' with {type:'json'};
const reference='00000000-0000-4000-8000-000000005001';
async function backend(page,{role='admin',login=true}={}){
 const base=await sharedBackend(page,{role,pages:['tasks','knowledge','learning','access']});const state={login,mailCalls:[],reason:null,failCheck:false,caps:null};
 await page.route('https://teamhub-test.supabase.co/**',async route=>{
  const req=route.request(),name=new URL(req.url()).pathname.split('/').at(-1);const send=(json,status=200)=>route.fulfill({status,json});
  if(name==='team_access_context')return send({version:12,pages:['tasks','knowledge','learning','access'],capabilities:state.caps||catalog.filter(c=>state.login||c.key!=='users.login').map(c=>c.key),can_design:false});
  if(name==='team-access'){state.mailCalls.push(req.postDataJSON());return state.reason?send({code:'email_not_confirmed',reason:state.reason,requestId:reference,message:'must-not-be-shown-private-provider-detail'},502):send({code:'login_link_requested',requestId:reference});}
  if(name==='admin_team_directory'&&state.failCheck&&req.postDataJSON()?.p_query)return send({code:'42501'},403);
  return route.fallback();
 });return {...base,state};
}
async function directory(page){await page.goto('/tests/workspace.html');if(page.viewportSize().width<=760)await page.getByRole('button',{name:'Menü öffnen'}).click();await page.getByRole('button',{name:'Mitarbeiterzugänge',exact:true}).click();}
async function check(page){await page.getByRole('button',{name:'E-Mail-Zugang für Mitarbeiter Beispiel prüfen',exact:true}).click();const dialog=page.getByRole('dialog',{name:'E-Mail-Zugang prüfen',exact:true});await expect(dialog.getByText('Konto im Anmeldedienst vorhanden',{exact:true})).toBeVisible();return dialog;}
test('checking an email account loads fresh scoped directory data and never sends a message',async({page})=>{
 const {calls,state}=await backend(page);await directory(page);const dialog=await check(page);await expect(dialog.getByText('Teamhub-Zugang freigeschaltet',{exact:true})).toBeVisible();await expect(dialog.getByText('Versand und Zustellung noch nicht geprüft',{exact:true})).toBeVisible();await expect(dialog.getByText('mitarbeiter@example.org',{exact:true})).toBeVisible();expect(state.mailCalls).toHaveLength(0);expect(calls.some(c=>c.path.endsWith('admin_team_directory')&&c.body.p_query==='mitarbeiter@example.org')).toBe(true);
});
test('blocked or studio-less accounts are shown from the fresh result and cannot request a link',async({page})=>{
 const {members,state}=await backend(page);await directory(page);members[1].active=false;const dialog=await check(page);await expect(dialog.getByText('Teamhub-Zugang gesperrt',{exact:true})).toBeVisible();await expect(dialog.getByRole('button',{name:'Anmeldelink für geprüften Zugang anfordern'})).toBeDisabled();members[1].active=true;members[1].studio_ids=[];await dialog.getByRole('button',{name:'Zugang erneut prüfen'}).click();await expect(dialog.getByText('Keine Studiozuordnung vorhanden',{exact:true})).toBeVisible();await expect(dialog.getByRole('button',{name:'Anmeldelink für geprüften Zugang anfordern'})).toBeDisabled();expect(state.mailCalls).toHaveLength(0);
});
test('a deliberate login request uses only the verified ID and confirms request, never delivery',async({page})=>{
 const {state}=await backend(page);await directory(page);const dialog=await check(page);await dialog.getByRole('button',{name:'Anmeldelink für geprüften Zugang anfordern'}).click();await expect(dialog.getByRole('status')).toContainText('Die Zustellung ist damit noch nicht bestätigt');await expect(dialog.getByRole('status')).toContainText(reference);expect(state.mailCalls).toEqual([{action:'send_login',userId:sharedIds.colleague}]);await expect(dialog.getByRole('button',{name:/Erneut anfordern in/})).toBeDisabled();
});
test('provider failure category and request reference are visible without raw provider details',async({page})=>{
 const {state}=await backend(page);state.reason='recipient_restricted';await directory(page);const dialog=await check(page);await dialog.getByRole('button',{name:'Anmeldelink für geprüften Zugang anfordern'}).click();await expect(dialog.getByRole('alert')).toContainText('Versand an diese Empfängeradresse abgelehnt');await expect(dialog.getByRole('alert')).toContainText(reference);await expect(dialog.getByRole('status')).toHaveCount(0);await expect(dialog).not.toContainText('must-not-be-shown');expect(state.mailCalls).toHaveLength(1);
});
test('a failed refresh removes earlier checked data and does not allow sending based on stale data',async({page})=>{
 const {state}=await backend(page);await directory(page);const dialog=await check(page);state.failCheck=true;await dialog.getByRole('button',{name:'Zugang erneut prüfen'}).click();await expect(dialog.getByRole('alert')).toBeVisible();await expect(dialog.getByText('Konto im Anmeldedienst vorhanden',{exact:true})).toHaveCount(0);await expect(dialog.getByRole('button',{name:'Anmeldelink für geprüften Zugang anfordern'})).toHaveCount(0);expect(state.mailCalls).toHaveLength(0);
});
test('user-directory access alone exposes neither the mail check nor resend actions',async({page})=>{
 await backend(page,{role:'employee',login:false});await directory(page);await expect(page.getByRole('button',{name:'E-Mail-Zugang für Mitarbeiter Beispiel prüfen'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Anmeldelink für Mitarbeiter Beispiel anfordern'})).toHaveCount(0);
});
test('revoking the delegated login function clears an open email-account check',async({page})=>{
 await page.clock.install({time:new Date('2026-11-06T10:00:00Z')});const {state}=await backend(page,{role:'employee'});await directory(page);await check(page);state.caps=['users.view'];await page.clock.fastForward(31000);await expect(page.getByRole('dialog',{name:'E-Mail-Zugang prüfen',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'E-Mail-Zugang für Mitarbeiter Beispiel prüfen'})).toHaveCount(0);
});
test('the account check fits a phone and returns focus to its trigger without requesting mail',async({page})=>{
 await page.setViewportSize({width:390,height:844});const {state}=await backend(page);await directory(page);const dialog=await check(page);expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);const send=dialog.getByRole('button',{name:'Anmeldelink für geprüften Zugang anfordern',exact:true});await send.scrollIntoViewIfNeeded();const bounds=await send.boundingBox();expect(bounds.y).toBeGreaterThanOrEqual(0);expect(bounds.y+bounds.height).toBeLessThanOrEqual(844);await page.screenshot({path:'test-results/mail-check-mobile.png'});await dialog.getByRole('button',{name:'Fenster schließen'}).click();await expect(page.getByRole('button',{name:'E-Mail-Zugang für Mitarbeiter Beispiel prüfen'})).toBeFocused();expect(state.mailCalls).toHaveLength(0);
});
