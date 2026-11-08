import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {sharedBackend,sharedIds} from './shared-backend';
const catalog=JSON.parse(readFileSync(new URL('../src/function-catalog.json',import.meta.url),'utf8'));
const uidB='00000000-0000-4000-8000-000000009999';
const id=n=>`00000000-0000-4000-8000-${String(8000+n).padStart(12,'0')}`;
const rows=page=>page.locator('.team-task-list > button');
const task=(n,changes={})=>({id:id(n),title:`QA-Aufgabe ${n}`,description:'QA-Beschreibung',studio_id:sharedIds.studio,assignee_id:sharedIds.user,created_by:sharedIds.user,due_date:'2026-11-04',status:'open',priority:'normal',private:false,studio:{name:'Dörpen'},assignee:{full_name:'QA-Konto'},...changes});
async function backend(page,{day='2026-11-04',tasks=[task(1),task(2,{status:'in_progress'}),task(3,{status:'done'})]}={}){
 await sharedBackend(page);
 const userA={id:sharedIds.user,email:'qa-a@example.org',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}},userB={id:uidB,email:'qa-b@example.org',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
 const state={day,tasks,pages:['dashboard','tasks','knowledge','learning'],user:userA,calls:[],detailStarted:false,detailFinished:false,releaseDetail:null,waitForDetail:null};
 const profile=()=>({id:state.user.id,full_name:state.user.id===uidB?'QA Konto B':'QA Konto A',role:state.user.id===uidB?'employee':'admin',active:true});
 const send=(route,data,status=200,extra={})=>route.fulfill({status,headers:{'access-control-allow-origin':'*','access-control-expose-headers':'content-range','content-type':'application/json',...extra},body:status===204?undefined:JSON.stringify(data)});
 await page.route('https://teamhub-test.supabase.co/functions/v1/team-assistant',route=>send(route,{code:'assistant_status',mode:'search',reason:'model_missing'}));
 await page.route('https://teamhub-test.supabase.co/auth/v1/**',async route=>{
  const url=new URL(route.request().url());if(url.pathname.endsWith('/user'))return send(route,state.user);
  if(url.pathname.endsWith('/logout'))return send(route,null,204);
  if(url.pathname.endsWith('/token')){state.user=userB;const payload=Buffer.from(JSON.stringify({sub:uidB,aud:'authenticated',role:'authenticated',exp:2200000000})).toString('base64url');return send(route,{access_token:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'+payload+'.qa-b',refresh_token:'qa-refresh-b',token_type:'bearer',expires_in:3600,expires_at:2200000000,user:userB});}
  return route.fallback();
 });
 await page.route('https://teamhub-test.supabase.co/rest/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1),query=Object.fromEntries(url.searchParams);state.calls.push({name,method:req.method(),query});
  if(name==='profiles')return send(route,url.searchParams.has('id')?[profile()]:[profile(),{id:sharedIds.colleague,full_name:'QA Andere Person',role:'employee',active:true}]);
  if(name==='studio_memberships')return send(route,[{user_id:state.user.id,studio_id:sharedIds.studio},{user_id:state.user.id,studio_id:sharedIds.otherStudio}]);
  if(name==='team_access_context')return send(route,{version:12,pages:state.pages,capabilities:catalog.filter(c=>profile().role==='admin'||c.roles.includes('employee')).map(c=>c.key),can_design:false});
  if(name==='my_team_dashboard'){
   const mine=state.tasks.filter(t=>t.assignee_id===state.user.id&&(!t.private||t.created_by===state.user.id)),pending=mine.filter(t=>t.status!=='done');return send(route,{today:state.day,counts:{open:pending.length,overdue:pending.filter(t=>t.due_date<state.day).length,today:pending.filter(t=>t.due_date===state.day).length,done:mine.length-pending.length},tasks:pending.slice(0,8),learning:[],knowledge:[]});
  }
  if(name==='my_onboarding'&&!state.tasks.some(t=>t.assignee_id===state.user.id))return send(route,{plans:[]});
  if(name==='my_onboarding')return send(route,{plans:[{id:id(700),title:'QA-Einarbeitung',description:'Testplan',learner_id:state.user.id,learner_name:profile().full_name,mentor_name:'QA Mentor',studio_id:sharedIds.studio,studio_name:'Dörpen',starts_on:state.day,total:1,done:0,steps:[{id:id(701),title:'QA-Studioschritt',description:'Testschritt',kind:'task',category:'tools',position:0,due_date:state.day,task_id:(state.tasks.find(t=>t.assignee_id===state.user.id)||state.tasks[0]).id,task_status:'open',done:false}]}]});
  if(['learning_courses','learning_assignments','learning_progress','learning_material','learning_reads','learning_attempts'].includes(name))return send(route,[]);
  if(name==='task_comments')return send(route,[]);
  if(name!=='tasks')return route.fallback();
  if(req.method()!=='GET')return send(route,{message:'Unexpected mutation in independent read-only QA'},400);
  if(url.searchParams.has('id')&&state.waitForDetail){
   const chosen=state.tasks.find(t=>'eq.'+t.id===query.id);state.detailStarted=true;await state.waitForDetail;
   try{await send(route,chosen);}catch{/* Aborted requests are safe: no stale client payload should be committed. */}finally{state.detailFinished=true;}return;
  }
  let result=state.tasks.filter(t=>(!t.private||t.created_by===state.user.id&&t.assignee_id===state.user.id)&&(profile().role==='admin'||t.assignee_id===state.user.id));
  for(const [key,condition] of url.searchParams){if(!['id','assignee_id','studio_id','status','due_date'].includes(key))continue;const split=condition.indexOf('.'),op=condition.slice(0,split),value=condition.slice(split+1);result=result.filter(t=>op==='eq'?String(t[key])===value:op==='neq'?String(t[key])!==value:op==='lt'?t[key]<value:op==='lte'?t[key]<=value:op==='gte'?t[key]>=value:false);}
  result.sort((a,b)=>a.due_date.localeCompare(b.due_date)||a.id.localeCompare(b.id));const total=result.length,offset=Number(query.offset||0),limit=Number(query.limit||total||1),slice=result.slice(offset,offset+limit);
  return send(route,req.headers().accept?.includes('vnd.pgrst.object')?(slice[0]||null):slice,200,{'content-range':slice.length?`${offset}-${offset+slice.length-1}/${total}`:`*/${total}`});
 });return state;
}
async function choose(page,label){await page.locator('.pilot-stats').getByRole('button',{name:new RegExp(label)}).click();}
async function releaseDetail(page,state){state.releaseDetail();await expect.poll(()=>state.detailFinished).toBe(true);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}

test.beforeEach(async({page})=>{await page.clock.setFixedTime(new Date('2026-11-04T09:00:00Z'));});

// Independent cases augment the developer matrix. No real accounts, API writes,
// provider calls or device claims are made by these local browser fixtures.
test('QA: explicit status removes a due-date constraint and studio narrows only the personal set',async({page})=>{
 await backend(page,{tasks:[task(1),task(2,{status:'in_progress',studio_id:sharedIds.otherStudio}),task(3,{due_date:'2026-11-03',status:'done'}),task(4,{due_date:'2026-11-05',status:'done'}),task(5,{assignee_id:sharedIds.colleague})]});
 await page.goto('/tests/workspace.html?start=dashboard');await choose(page,'Heute fällig');await expect(rows(page)).toHaveCount(2);await page.getByRole('combobox',{name:'Standort',exact:true}).selectOption(sharedIds.otherStudio);await expect(rows(page).locator('h3')).toHaveText(['QA-Aufgabe 2']);
 await page.getByRole('combobox',{name:'Standort',exact:true}).selectOption('all');await page.getByRole('combobox',{name:'Status',exact:true}).selectOption('done');await expect(rows(page).locator('h3')).toHaveText(['QA-Aufgabe 3','QA-Aufgabe 4']);await expect(page.getByRole('heading',{name:/Meine Aufgaben/})).not.toContainText('Heute fällig');
});
test('QA: a real previous page two is reset by the dashboard tile',async({page})=>{
 await backend(page,{tasks:Array.from({length:62},(_,n)=>task(n,{due_date:'2026-11-03',assignee_id:n>=56?sharedIds.colleague:sharedIds.user}))});await page.goto('/tests/workspace.html');await expect(rows(page)).toHaveCount(50);await page.getByRole('button',{name:'Weitere Aufgaben',exact:true}).click();await expect(rows(page)).toHaveCount(12);
 await page.getByRole('navigation',{name:'Teambereiche'}).getByRole('button',{name:/Übersicht|Startseite/}).click();await choose(page,'Überfällig');await expect(rows(page)).toHaveCount(50);await expect(page.locator('.team-task-pagination')).toContainText('56 Aufgaben · Seite 1 von 2');
});
for(const spec of [{day:'2026-03-29',instant:'2026-03-28T23:30:00Z',previous:'2026-03-28',next:'2026-03-30'},{day:'2026-10-25',instant:'2026-10-25T01:30:00Z',previous:'2026-10-24',next:'2026-10-26'}])test(`QA: Berlin DST date ${spec.day} is independent of the browser timezone`,async({browser})=>{
 const context=await browser.newContext({timezoneId:'Pacific/Honolulu'}),page=await context.newPage();try{await page.clock.setFixedTime(new Date(spec.instant));const state=await backend(page,{day:spec.day,tasks:[task(1,{due_date:spec.previous}),task(2,{due_date:spec.day}),task(3,{due_date:spec.day,status:'in_progress'}),task(4,{due_date:spec.day,status:'done'}),task(5,{due_date:spec.next})]});await page.goto('/tests/workspace.html?start=dashboard');await choose(page,'Heute fällig');await expect(rows(page).locator('h3')).toHaveText(['QA-Aufgabe 2','QA-Aufgabe 3']);const query=state.calls.filter(c=>c.name==='tasks').at(-1).query;expect(query.due_date).toBe('eq.'+spec.day);}finally{await context.close();}
});
test('QA: a zero-valued tile opens its honest empty personal list',async({page})=>{
 const state=await backend(page,{tasks:[]});await page.goto('/tests/workspace.html?start=dashboard');await choose(page,'Heute fällig');await expect(page.getByText('Du hast heute keine noch offenen Aufgaben.',{exact:true})).toBeVisible();await expect(page.locator('.team-task-pagination')).toContainText('0 Aufgaben');expect(state.calls.filter(c=>c.name==='tasks').every(c=>c.method==='GET')).toBe(true);
});
for(const source of ['assistant','academy'])test(`QA: late ${source} task detail is discarded after source-page revocation`,async({page})=>{
 const secret=task(1,{title:'QA Alte vertrauliche Aufgabe',description:'QA_ALTER_PRIVATINHALT',private:true}),state=await backend(page,{tasks:[secret]});state.waitForDetail=new Promise(resolve=>{state.releaseDetail=resolve;});
 await page.goto('/tests/workspace.html?start='+(source==='assistant'?'dashboard':'learning'));
 if(source==='assistant'){await page.getByRole('button',{name:'KI-Assistent öffnen',exact:true}).click();await page.getByLabel('Deine Frage an den Assistenten').fill('Welche meiner Aufgaben sind heute fällig?');await page.getByRole('button',{name:'Frage stellen',exact:true}).click();await page.locator('.assistant-task').click();}
 else{await page.getByRole('button',{name:'Mein Onboarding',exact:true}).click();await page.getByRole('button',{name:'Aufgabe öffnen',exact:true}).click();}
 await expect.poll(()=>state.detailStarted).toBe(true);state.pages=state.pages.filter(p=>p!==(source==='assistant'?'knowledge':'learning'));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.getByRole('heading',{name:'Meine Übersicht',exact:true})).toBeVisible();await releaseDetail(page,state);await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByText('QA_ALTER_PRIVATINHALT',{exact:true})).toHaveCount(0);
});
test('QA: delayed private detail from account A is never shown after account B signs in',async({page})=>{
 const secret=task(1,{title:'QA Konto A Aufgabe',description:'QA_NUR_KONTO_A',private:true}),state=await backend(page,{tasks:[secret,task(2,{assignee_id:uidB,created_by:uidB,title:'QA Konto B Aufgabe'})]});state.waitForDetail=new Promise(resolve=>{state.releaseDetail=resolve;});await page.goto('/tests/workspace.html?start=learning');await page.getByRole('button',{name:'Mein Onboarding',exact:true}).click();await page.getByRole('button',{name:'Aufgabe öffnen',exact:true}).click();await expect.poll(()=>state.detailStarted).toBe(true);
 await page.getByRole('button',{name:'Abmelden',exact:true}).click();await page.getByLabel('Deine Firmen-E-Mail-Adresse').fill('qa-b@example.org');await page.getByLabel('Dein Teamhub-Passwort',{exact:true}).fill('NurLokalerQA-Test-2026!');await page.getByRole('button',{name:'Anmelden',exact:true}).click();await expect(page.getByRole('heading',{name:'Hallo, QA.'})).toBeVisible();await expect(page.locator('.page-heading p').filter({hasText:'qa-b@example.org'})).toBeVisible();await releaseDetail(page,state);await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByText('QA_NUR_KONTO_A',{exact:true})).toHaveCount(0);
});

for(const width of [360,390])test(`QA: focused personal heading remains uncovered by the sticky header at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===360?740:844});await backend(page);
 await page.goto('/tests/workspace.html?start=dashboard');
 const tile=page.locator('.pilot-stats').getByRole('button',{name:/Heute fällig/});
 await tile.focus();await page.keyboard.press('Enter');await expect(rows(page)).toHaveCount(2);
 const heading=page.getByRole('heading',{name:/Meine Aufgaben/});await expect(heading).toBeFocused();
 const geometry=await heading.evaluate(el=>{const r=el.getBoundingClientRect(),header=document.querySelector('.team-shell-topbar').getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{headingTop:r.top,headerBottom:header.bottom,headingAtCenter:hit===el||el.contains(hit)};});
 expect(geometry.headingTop).toBeGreaterThanOrEqual(geometry.headerBottom);expect(geometry.headingAtCenter).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`/tmp/teamhub-1a-${width}-viewport.png`});
 const reset=page.getByRole('button',{name:'Alle meine Aufgaben anzeigen',exact:true});await expect(reset).toBeVisible();await reset.click();
 await expect(rows(page)).toHaveCount(3);await expect(heading).toHaveText('Meine Aufgaben · Alle Status');
});
