import {test,expect} from '@playwright/test';
import {sharedBackend} from './shared-backend';
import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../src/function-catalog.json',import.meta.url),'utf8'));

async function placementBackend(page){
 const base=await sharedBackend(page,{role:'admin',pages:['dashboard','tasks','knowledge','access']});
 const modelCalls=[];
 await page.route('https://teamhub-test.supabase.co/rest/v1/rpc/team_access_context',route=>route.fulfill({json:{version:10,pages:['dashboard','tasks','knowledge','access'],capabilities:catalog.map(item=>item.key),can_design:false}}));
 await page.route('https://teamhub-test.supabase.co/functions/v1/team-assistant',route=>{
  const body=route.request().postDataJSON();if(body.action!=='status')modelCalls.push(body);
  return route.fulfill({json:{code:'assistant_status',mode:'search',reason:'model_missing'}});
 });
 await page.route('https://teamhub-test.supabase.co/rest/v1/rpc/my_team_dashboard',route=>route.fulfill({json:{today:'2026-11-08',counts:{open:0,overdue:0,today:0,done:0},tasks:[],learning:[],knowledge:[]}}));
 await page.route('https://teamhub-test.supabase.co/rest/v1/rpc/team_home_data',route=>route.fulfill({json:{can_manage:true,items:Array.from({length:21},(_,n)=>({id:`00000000-0000-4000-8000-${String(9000+n).padStart(12,'0')}`,kind:'link',title:`QA-Unterlage ${n+1}`,body:'Synthetischer Inhalt für eine lange Startseite.',href:'https://example.org/qa',phone:'',studio_id:null,reader_roles:['admin','studio_manager','employee'],published:true,position:n,revision:1,editable:true}))}}));
 return {...base,modelCalls};
}
async function unobstructed(locator){
 await expect(locator).toBeVisible();
 await expect.poll(()=>locator.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{within:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,hit:hit===el||el.contains(hit)};})).toEqual({within:true,hit:true});
}

test('QA: the assistant shortcut remains outside a private-task modal and its draft survives focus cycling',async({page})=>{
 await page.setViewportSize({width:360,height:740});const state=await placementBackend(page);await page.goto('/tests/workspace.html');
 const launcher=page.getByRole('button',{name:'KI-Assistent öffnen',exact:true});await expect(launcher).toHaveCount(1);
 await page.getByRole('button',{name:'Private Aufgabe erstellen',exact:true}).click();const dialog=page.getByRole('dialog');
 const title=dialog.getByLabel('Titel der privaten Aufgabe',{exact:true}),description=dialog.getByLabel('Beschreibung',{exact:true});
 await title.fill('QA ungespeicherter Auftrag');await description.fill('QA unveränderte private Hinweise');
 // The launcher must not take focus while the native modal makes its surroundings inert.
 await launcher.evaluate(el=>el.focus());expect(await page.evaluate(()=>!!document.activeElement.closest('dialog[open]'))).toBe(true);
 for(let n=0;n<18;n++){await page.keyboard.press(n%3===0?'Shift+Tab':'Tab');expect(await page.evaluate(()=>!!document.activeElement.closest('dialog[open]'))).toBe(true);}
 await expect(title).toHaveValue('QA ungespeicherter Auftrag');await expect(description).toHaveValue('QA unveränderte private Hinweise');
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
 expect(state.calls.filter(c=>c.path==='/rest/v1/tasks'&&['POST','PATCH','DELETE'].includes(c.method))).toHaveLength(0);expect(state.modelCalls).toHaveLength(0);
 await launcher.scrollIntoViewIfNeeded();await unobstructed(launcher);await launcher.focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Dein KI-Assistent',exact:true})).toBeVisible();
});

test('QA: after the shortcut has scrolled away, mobile menu access still opens the assistant without model use',async({page})=>{
 await page.setViewportSize({width:390,height:844});const state=await placementBackend(page);await page.goto('/tests/workspace.html?start=dashboard');
 const launcher=page.getByRole('button',{name:'KI-Assistent öffnen',exact:true});await expect(launcher).toHaveCount(1);await expect(page.getByRole('link',{name:'QA-Unterlage 21 öffnen',exact:true})).toBeVisible();
 await page.screenshot({path:'/tmp/teamhub-1c-qa-390-dashboard.png'});
 await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));expect(await launcher.evaluate(el=>el.getBoundingClientRect().bottom)).toBeLessThanOrEqual(0);
 const menu=page.getByRole('button',{name:'Menü öffnen',exact:true});await unobstructed(menu);await menu.click();const entry=page.getByRole('button',{name:'KI-Assistent',exact:true});await unobstructed(entry);await entry.focus();await page.keyboard.press('Space');
 await expect(page.getByRole('heading',{name:'Dein KI-Assistent',exact:true})).toBeVisible();await expect(launcher).toHaveCount(0);expect(state.modelCalls).toHaveLength(0);await unobstructed(page.getByRole('banner').getByRole('button',{name:'Abmelden',exact:true}));
});

test('QA: a long mobile area title leaves notifications and logout usable next to the separate assistant row',async({page})=>{
 await page.setViewportSize({width:360,height:740});const state=await placementBackend(page);await page.goto('/tests/workspace.html?start=access');
 const banner=page.getByRole('banner');await expect(banner).toContainText('Mitarbeiterzugänge');
 const launcher=page.getByRole('button',{name:'KI-Assistent öffnen',exact:true});await unobstructed(launcher);await unobstructed(banner.getByRole('button',{name:'Menü öffnen',exact:true}));
 const bell=banner.getByRole('button',{name:/Benachrichtigungen:/}),logout=banner.getByRole('button',{name:'Abmelden',exact:true});await unobstructed(bell);await unobstructed(logout);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'/tmp/teamhub-1c-qa-360-access.png'});await bell.click();await expect(page.getByRole('dialog').getByRole('heading',{name:'Benachrichtigungen',exact:true})).toBeVisible();await page.keyboard.press('Escape');
 await logout.click();await expect(page.getByRole('button',{name:'Anmelden',exact:true})).toBeVisible();await expect(launcher).toHaveCount(0);await expect(page.getByRole('button',{name:'KI-Assistent',exact:true})).toHaveCount(0);expect(state.modelCalls).toHaveLength(0);
});
