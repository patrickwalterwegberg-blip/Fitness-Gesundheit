import {test,expect} from '@playwright/test';
import {sharedBackend,sharedIds} from './shared-backend';

// Independent boundary cases; all accounts and responses remain local test doubles.
async function qaHome(page,{canManage=true,pendingSave=false}={}){
 await sharedBackend(page,{role:'admin',pages:['dashboard','tasks']});
 const state={writes:[],items:[],release:null};
 const wait=pendingSave?new Promise(resolve=>{state.release=resolve;}):null;
 await page.route('https://teamhub-test.supabase.co/rest/v1/**',async route=>{
  const request=route.request(),name=new URL(request.url()).pathname.split('/').at(-1);
  const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(name==='team_access_context')return send({version:10,pages:['dashboard','tasks'],capabilities:['home.create','home.publish'],can_design:false});
  if(name==='my_team_dashboard')return send({today:'2026-11-08',counts:{open:0,overdue:0,today:0,done:0},tasks:[],learning:[],knowledge:[]});
  if(name==='team_home_data'){const args=request.postDataJSON();return send({can_manage:canManage,items:state.items.filter(item=>args.p_manage||item.published)});}
  if(name!=='save_team_home_item')return route.fallback();
  const args=request.postDataJSON();state.writes.push(args);
  if(wait){await wait;return send({code:'42501'},403);}
  const item={id:'00000000-0000-4000-8000-000000007777',kind:args.p_kind,title:args.p_title,body:args.p_body,href:args.p_href,phone:args.p_phone,studio_id:args.p_studio,reader_roles:args.p_roles,published:args.p_published,position:args.p_position,revision:1,editable:true};state.items.push(item);return send(item);
 });return state;
}

test('QA: home.create alone cannot bypass a false server management gate',async({page})=>{
 const state=await qaHome(page,{canManage:false});await page.goto('/tests/workspace.html?start=dashboard');
 await expect(page.getByText('Für dich sind aktuell keine wichtigen Links freigegeben.',{exact:true})).toBeVisible();
 for(const name of ['Link hinzufügen','Neuigkeit hinzufügen','Ansprechpartner hinzufügen','Startseite bearbeiten'])await expect(page.getByRole('button',{name,exact:true})).toHaveCount(0);
 expect(state.writes).toHaveLength(0);
});

test('QA: only explicit publication and the selected studio reach the create RPC',async({page})=>{
 await page.setViewportSize({width:390,height:844});const state=await qaHome(page);await page.goto('/tests/workspace.html?start=dashboard');await page.getByRole('button',{name:'Link hinzufügen',exact:true}).click();
 const dialog=page.getByRole('dialog');await mobileSnapshot(page,dialog,390);await expect(dialog.locator('input[name="published"]')).not.toBeChecked();
 await dialog.locator('input[name="title"]').fill('QA Link im gewählten Studio');await dialog.locator('input[name="href"]').fill('https://example.org/qa');
 await dialog.locator('select[name="studio"]').selectOption(sharedIds.otherStudio);await dialog.locator('input[name="published"]').check();
 await dialog.getByRole('button',{name:'Eintrag speichern',exact:true}).click();await expect(dialog).toHaveCount(0);
 expect(state.writes).toHaveLength(1);expect(state.writes[0]).toMatchObject({p_id:null,p_revision:null,p_kind:'link',p_title:'QA Link im gewählten Studio',p_href:'https://example.org/qa',p_studio:sharedIds.otherStudio,p_published:true});
 await page.getByRole('button',{name:'Mitarbeiteransicht',exact:true}).click();await expect(page.locator('.home-section-link')).toContainText('QA Link im gewählten Studio');
});

test('QA: a pending denied create blocks dismissal and preserves all unsaved fields',async({page})=>{
 await page.setViewportSize({width:360,height:740});const state=await qaHome(page,{pendingSave:true});await page.goto('/tests/workspace.html?start=dashboard');await page.getByRole('button',{name:'Ansprechpartner hinzufügen',exact:true}).click();
 const dialog=page.getByRole('dialog');await mobileSnapshot(page,dialog,360);const values={title:'QA Kontaktentwurf',body:'QA Erreichbarkeit',href:'mailto:qa@example.org',phone:'+49 123 456'};
 await dialog.locator('input[name="title"]').fill(values.title);await dialog.locator('textarea[name="body"]').fill(values.body);await dialog.locator('input[name="href"]').fill(values.href);await dialog.locator('input[name="phone"]').fill(values.phone);await dialog.locator('select[name="studio"]').selectOption(sharedIds.otherStudio);await dialog.locator('input[name="position"]').fill('27');
 const roles=dialog.locator('.home-reader-roles input');await roles.first().uncheck();const selectedBefore=await roles.evaluateAll(inputs=>inputs.map(input=>input.checked));
 try{
  await dialog.getByRole('button',{name:'Eintrag speichern',exact:true}).click();await expect.poll(()=>state.writes.length).toBe(1);
  await expect(dialog.getByRole('button',{name:'Startseitenformular schließen',exact:true})).toBeDisabled();await expect(dialog.getByRole('button',{name:'Abbrechen',exact:true})).toBeDisabled();
  await page.keyboard.press('Escape');await expect(dialog).toBeVisible();state.release();
  await expect(dialog.getByRole('alert')).toBeVisible();
  for(const [name,value] of Object.entries(values))await expect(dialog.locator(`${name==='body'?'textarea':'input'}[name="${name}"]`)).toHaveValue(value);
  await expect(dialog.locator('select[name="studio"]')).toHaveValue(sharedIds.otherStudio);await expect(dialog.locator('input[name="position"]')).toHaveValue('27');await expect(dialog.locator('input[name="published"]')).not.toBeChecked();expect(await roles.evaluateAll(inputs=>inputs.map(input=>input.checked))).toEqual(selectedBefore);
  await dialog.getByRole('button',{name:'Abbrechen',exact:true}).click();await expect(dialog).toHaveCount(0);expect(state.writes).toHaveLength(1);expect(state.items).toHaveLength(0);
 }finally{state.release();}
});

async function mobileSnapshot(page,dialog,width){
 await expect(dialog.locator('input[name="title"]')).toBeFocused();
 const bounds=await dialog.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`/tmp/teamhub-1b-${width}-viewport.png`});await page.screenshot({path:`/tmp/teamhub-1b-${width}-full.png`,fullPage:true});
}
