import {test,expect} from '@playwright/test';
import {sharedBackend,sharedIds} from './shared-backend';
import catalog from '../src/function-catalog.json' with {type:'json'};
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const first=id(4001),target=id(4002),assignment=id(4003);
async function backend(page,{missing=false,failRead=false,lateCourse=false}={}){
 await sharedBackend(page,{role:'employee'});const state={missing,failRead,openedLookup:false,calls:[],read:false};
 const courses=[{id:first,title:'Einführung',lesson_count:1,active:true},{id:target,title:'Sicherheitstraining',lesson_count:1,active:true}];
 await page.route('https://teamhub-test.supabase.co/rest/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1),body=req.postDataJSON();const known=['team_access_context','my_onboarding','team_notification_inbox','mark_team_notifications_read','learning_courses','learning_assignments','learning_progress','learning_material','learning_reads','learning_attempts'];if(!known.includes(name))return route.fallback();state.calls.push({name,body,query:Object.fromEntries(url.searchParams)});const send=(json,status=200)=>route.fulfill({status,json});
  if(name==='team_access_context')return send({version:12,pages:['tasks','learning','calendar','knowledge','chat','feedback'],capabilities:catalog.filter(c=>c.roles.includes('employee')).map(c=>c.key),can_design:false});
  if(name==='my_onboarding')return send({plans:[]});
  if(name==='team_notification_inbox')return send({items:[{id:1,kind:'learning',target_id:assignment,title:'Dein Sicherheitskurs',body:'Neuer Lernauftrag',occurred_at:'2026-11-06T10:00:00Z',read_at:state.read?'2026-11-06T11:00:00Z':null}],total:1,unread:state.read?0:1});
  if(name==='mark_team_notifications_read'){if(state.failRead)return send({code:'42501'},403);state.read=true;return send(null);}
  if(name==='learning_courses')return send(lateCourse&&!state.openedLookup?courses.slice(0,1):courses);
  if(name==='learning_assignments'){if(url.searchParams.has('id'))state.openedLookup=true;const rows=[{id:id(4004),course_id:first,learner_id:sharedIds.user,studio_id:sharedIds.studio},{id:assignment,course_id:target,learner_id:sharedIds.user,studio_id:sharedIds.studio}];return send(url.searchParams.has('id')?state.missing?[]:rows.filter(a=>a.id===url.searchParams.get('id').slice(3)):rows);}
  if(name==='learning_material')return send(courses.map(c=>({course_id:c.id,revision:1,lessons:[{title:'Start',body:c.id===target?'Genau dieser Sicherheitskurs wurde zugewiesen.':'Einführungstext'}],questions:[{prompt:'Bereit?',options:['Ja','Nein']}],pass_percent:80})));
  return send([]);
 });return state;
}
async function openFromOnboarding(page){await page.goto('/tests/workspace.html?start=learning');await page.getByRole('button',{name:'Mein Onboarding',exact:true}).click();await expect(page.getByRole('heading',{name:'Dein Onboarding startet hier.',exact:true})).toBeVisible();await page.getByRole('button',{name:'Benachrichtigungen: 1 ungelesen',exact:true}).click();return page.getByRole('dialog',{name:'Benachrichtigungen',exact:true});}
test('a learning notification leaves onboarding and opens its actual assigned course, including on a second visit',async({page})=>{
 const state=await backend(page,{lateCourse:true});let dialog=await openFromOnboarding(page);await dialog.getByRole('button',{name:'Lernhub öffnen',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByText('Genau dieser Sicherheitskurs wurde zugewiesen.',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Sicherheitstraining',exact:true})).toBeVisible();expect(state.read).toBe(true);const lookup=state.calls.find(c=>c.name==='learning_assignments'&&c.query.id);expect(lookup.query.learner_id).toBe('eq.'+sharedIds.user);await page.getByRole('button',{name:'Kurs schließen',exact:true}).click();await page.getByRole('button',{name:'Benachrichtigungen: 0 ungelesen'}).click();dialog=page.getByRole('dialog',{name:'Benachrichtigungen',exact:true});await dialog.getByRole('button',{name:'Lernhub öffnen',exact:true}).click();await expect(page.getByText('Genau dieser Sicherheitskurs wurde zugewiesen.',{exact:true})).toBeVisible();expect(state.calls.filter(c=>c.name==='mark_team_notifications_read')).toHaveLength(1);
});
test('a no longer available learning target stays unread and does not navigate away',async({page})=>{
 const state=await backend(page,{missing:true});const dialog=await openFromOnboarding(page);await dialog.getByRole('button',{name:'Lernhub öffnen',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('Lernauftrag ist nicht mehr verfügbar');expect(state.read).toBe(false);expect(state.calls.some(c=>c.name==='mark_team_notifications_read')).toBe(false);await dialog.getByRole('button',{name:'Fenster schließen'}).click();await expect(page.getByRole('heading',{name:'Dein Onboarding startet hier.',exact:true})).toBeVisible();
});
test('failure to confirm read state keeps the notification open and does not change the current view',async({page})=>{
 const state=await backend(page,{failRead:true});const dialog=await openFromOnboarding(page);await dialog.getByRole('button',{name:'Lernhub öffnen',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible();expect(state.read).toBe(false);await expect(page.locator('.pilot-reader')).toHaveCount(0);state.failRead=false;await dialog.getByRole('button',{name:'Lernhub öffnen',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByText('Genau dieser Sicherheitskurs wurde zugewiesen.',{exact:true})).toBeVisible();
});
