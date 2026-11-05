import {test,expect} from '@playwright/test';
import {sharedBackend,sharedIds} from './shared-backend';
import catalog from '../src/function-catalog.json' with {type:'json'};
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function scheduleBackend(page,{role='employee',failSave=false,failRead=false}={}){
 const base=await sharedBackend(page,{role});const state={calls:[],tasks:[],events:[],plans:[],notifications:[{id:2,kind:'task',target_id:id(20),title:'Aufgabe fällig',body:'Geräte prüfen',occurred_at:'2026-11-04T09:00:00Z',read_at:null},{id:1,kind:'chat',channel_id:id(90),title:'Neue Chatnachricht',body:'Gesamtes Team',occurred_at:'2026-11-04T08:00:00Z',read_at:null}]};let next=100;
 await page.route('https://teamhub-test.supabase.co/rest/v1/**',async route=>{
  const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1),method=req.method(),body=req.postDataJSON();
  if(!['team_access_context','tasks','calendar_events','maintenance_plans','team_schedule_month','save_maintenance_plan','team_notification_inbox','mark_team_notifications_read'].includes(name))return route.fallback();
  state.calls.push({name,method,body,query:Object.fromEntries(url.searchParams)});
  const send=(data,status=200,extra={})=>route.fulfill({status,headers:{'access-control-allow-origin':'*','access-control-expose-headers':'content-range','content-type':'application/json',...extra},body:JSON.stringify(data)});
  if(name==='team_access_context')return send({version:10,pages:role==='admin'?['dashboard','tasks','calendar','learning','knowledge','files','chat','feedback','builder','modules','access','controlling']:['dashboard','tasks','calendar','learning','knowledge','chat','feedback'],capabilities:catalog.filter(c=>role==='admin'||c.roles.includes(role)).map(c=>c.key),can_design:role==='admin'});
  if(name==='team_notification_inbox')return send({items:state.notifications.slice(body.p_offset,body.p_offset+body.p_size),total:state.notifications.length,unread:state.notifications.filter(n=>!n.read_at).length});
  if(name==='mark_team_notifications_read'){if(failRead)return send({code:'42501'},403);state.notifications.filter(n=>body.p_ids.includes(n.id)).forEach(n=>n.read_at='2026-11-04T10:00Z');return send(null);}
  if(name==='team_schedule_month'){
   const count=new Map();function d(day){if(!count.has(day))count.set(day,{day,tasks:0,open:0,maintenance:0,events:0});return count.get(day);}
   for(const t of state.tasks){const day=d(t.due_date);day.tasks++;if(t.status!=='done')day.open++;if(t.maintenance_plan_id)day.maintenance++;}
   for(const e of state.events.filter(e=>!e.cancelled))d(e.starts_at.slice(0,10)).events++;
   return send({days:[...count.values()]});
  }
  if(name==='save_maintenance_plan'){
   if(failSave)return send({code:'42501'},403);
   const p={id:id(next++),device:body.p_device,serial:body.p_serial,instructions:body.p_instructions,studio_id:body.p_studio,assignee_id:body.p_assignee,due_date:body.p_due,interval_months:body.p_interval,updated_at:'2026-11-04T10:00Z'};state.plans.push(p);state.tasks.push({id:id(next++),title:'Wartung: '+p.device,description:p.instructions,studio_id:p.studio_id,assignee_id:p.assignee_id,due_date:p.due_date,maintenance_plan_id:p.id,repeat_unit:'month',repeat_every:p.interval_months,status:'open',private:false,studio:{name:'Dörpen'},assignee:{full_name:'Mitarbeiter Beispiel'}});return send(p.id);
  }
  const rows=state[name==='tasks'?'tasks':name==='calendar_events'?'events':'plans'];
  if(method==='POST'||method==='PATCH'){
   if(failSave)return send({code:'42501'},403);
   const row=method==='POST'?{id:id(next++),created_by:sharedIds.user,updated_at:'2026-11-04T10:00Z',status:'open',cancelled:false,studio:{name:'Dörpen'},assignee:{full_name:'Patrick Test'},...body}:rows.find(r=>r.id===url.searchParams.get('id').slice(3));
   if(method==='POST')rows.push(row);else Object.assign(row,body);return send(row);
  }
  let result=rows.filter(r=>[...url.searchParams].every(([key,value])=>!value.startsWith('eq.')||r[key]===value.slice(3)||String(r[key])===value.slice(3)));
  if(req.headers().accept?.includes('vnd.pgrst.object'))return result.length?send(result[0]):send({code:'PGRST116'},406);
  const offset=Number(req.headers().range?.split('-')[0]||url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||25),total=result.length;result=result.slice(offset,offset+limit);
  return send(result,200,{'content-range':`${offset}-${offset+result.length-1}/${total}`});
 });return state;
}
test.beforeEach(async({page})=>{await page.clock.setFixedTime(new Date('2026-11-04T09:00:00Z'));});
test('employees create a private six-month recurring task with themselves as the only assignee',async({page})=>{
 const state=await scheduleBackend(page);await page.goto('/tests/workspace.html');
 await expect(page.getByRole('button',{name:'Teamaufgabe erstellen',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Private Aufgabe erstellen',exact:true}).click();const dialog=page.getByRole('dialog');
 await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Titel der privaten Aufgabe')).toBeFocused();
 await dialog.getByLabel('Titel der privaten Aufgabe').fill('Meine Vorbereitung');await dialog.getByRole('combobox',{name:'Wiederholung',exact:true}).selectOption('month');await dialog.getByLabel('Abstand der Wiederholung').fill('6');
 await expect(dialog.getByLabel('Verantwortliche Person')).toBeDisabled();await expect(dialog.getByLabel('Verantwortliche Person').locator('option')).toHaveCount(1);
 expect(state.calls.filter(c=>c.name==='tasks'&&c.method==='POST')).toHaveLength(0);
 await dialog.getByRole('button',{name:'Private Aufgabe speichern'}).click();await expect(dialog).toHaveCount(0);
 const call=state.calls.find(c=>c.name==='tasks'&&c.method==='POST');expect(call.body).toMatchObject({private:true,assignee_id:sharedIds.user,repeat_unit:'month',repeat_every:6});
 await expect(page.getByRole('status').filter({hasText:'Private Aufgabe gespeichert'})).toBeVisible();await page.getByRole('button',{name:/Meine Vorbereitung/}).click();await expect(page.getByText('Alle 6 Monate',{exact:true})).toBeVisible();
});
test('leadership can assign an individual employee without changing their role',async({page})=>{
 const state=await scheduleBackend(page,{role:'admin'});await page.goto('/tests/workspace.html');await page.getByRole('button',{name:'Teamaufgabe erstellen',exact:true}).click();const d=page.getByRole('dialog');
 await d.getByLabel('Titel der Teamaufgabe').fill('Gerätekontrolle');await d.getByLabel('Verantwortliche Person').selectOption(sharedIds.colleague);await d.getByRole('button',{name:'Teamaufgabe speichern'}).click();await expect(d).toHaveCount(0);
 expect(state.calls.find(c=>c.name==='tasks'&&c.method==='POST').body).toMatchObject({private:false,assignee_id:sharedIds.colleague});
});
test('calendar creates real private appointments using Berlin time and exposes no team option for employees',async({page})=>{
 const state=await scheduleBackend(page);await page.goto('/tests/workspace.html?start=calendar');await page.getByRole('button',{name:'Termin anlegen',exact:true}).click();const d=page.getByRole('dialog');
 await d.getByLabel('Termintitel').fill('Mein Gespräch');await d.getByLabel('Beginn · Berliner Zeit').fill('2026-11-04T13:00');await d.getByLabel('Ende · Berliner Zeit').fill('2026-11-04T14:00');await expect(d.getByLabel('Sichtbarkeit').locator('option')).toHaveCount(1);
 await d.getByRole('button',{name:'Termin speichern'}).click();await expect(d).toHaveCount(0);expect(state.events[0]).toMatchObject({private:true,starts_at:'2026-11-04T12:00:00.000Z',ends_at:'2026-11-04T13:00:00.000Z'});await expect(page.getByRole('button',{name:/Mein Gespräch/})).toBeVisible();
 await page.getByRole('button',{name:/Mein Gespräch/}).click();await page.getByRole('dialog').getByRole('button',{name:'Termin absagen'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);expect(state.events[0].cancelled).toBe(true);
});
test('maintenance saves a six-month plan and its generated task appears on the same calendar day',async({page})=>{
 const state=await scheduleBackend(page,{role:'studio_manager'});await page.goto('/tests/workspace.html?start=calendar');await page.getByRole('button',{name:'Gerätewartung',exact:true}).click();await page.getByRole('button',{name:'Wartungsplan anlegen'}).click();const d=page.getByRole('dialog');
 await d.getByLabel('Gerät / Wartungsbezeichnung').fill('Laufband 1');await d.getByLabel('Seriennummer / Gerätenummer').fill('SN-123');await d.getByLabel('Verantwortliche Person').selectOption(sharedIds.colleague);await expect(d.getByLabel('Wiederholung alle … Monate')).toHaveValue('6');await d.getByRole('button',{name:'Wartungsplan speichern'}).click();await expect(d).toHaveCount(0);
 expect(state.calls.find(c=>c.name==='save_maintenance_plan').body).toMatchObject({p_device:'Laufband 1',p_interval:6,p_assignee:sharedIds.colleague});
 await page.getByRole('button',{name:'Kalender',exact:true}).last().click();await expect(page.getByRole('button',{name:'4.11.2026, 0 Termine, 1 Aufgaben, 1 Wartungen'})).toBeVisible();await page.getByRole('button',{name:/Wartung: Laufband 1/}).click();await expect(page.getByRole('heading',{name:'Wartung: Laufband 1',exact:true,level:2})).toBeVisible();
});
test('the bell opens a chronological notification field and preserves read notifications',async({page})=>{
 const state=await scheduleBackend(page);await page.goto('/tests/workspace.html');await page.getByRole('button',{name:'Benachrichtigungen: 2 ungelesen'}).click();const d=page.getByRole('dialog');await expect(d.getByRole('heading',{name:'Benachrichtigungen',exact:true})).toBeVisible();
 await expect(d.locator('.notification-item').first()).toContainText('Aufgabe fällig');await expect(d.locator('.notification-item').last()).toContainText('Neue Chatnachricht');
 await d.getByRole('button',{name:'Angezeigte als gelesen'}).click();await expect(d.getByText('0 ungelesen · 2 Meldungen')).toBeVisible();await expect(d.locator('.notification-item')).toHaveCount(2);expect(state.notifications.every(n=>n.read_at)).toBe(true);
 await page.keyboard.press('Escape');await expect(d).toHaveCount(0);await expect(page.getByRole('button',{name:'Benachrichtigungen: 0 ungelesen'})).toBeFocused();
});
test('failed writes keep the form and inputs visible with no saved appointment or false success',async({page})=>{
 const state=await scheduleBackend(page,{failSave:true});await page.goto('/tests/workspace.html?start=calendar');await page.getByRole('button',{name:'Termin anlegen',exact:true}).click();const d=page.getByRole('dialog');await d.getByLabel('Termintitel').fill('Nicht gespeichert');await d.getByRole('button',{name:'Termin speichern'}).click();await expect(d.getByRole('alert')).toContainText('fehlt dir die Freigabe');await expect(d.getByLabel('Termintitel')).toHaveValue('Nicht gespeichert');expect(state.events).toHaveLength(0);await expect(page.getByText('Termin gespeichert.',{exact:true})).toHaveCount(0);
});
test('failed notification read confirmations keep the unread state and the error visible',async({page})=>{
 const state=await scheduleBackend(page,{failRead:true});await page.goto('/tests/workspace.html');await page.getByRole('button',{name:'Benachrichtigungen: 2 ungelesen'}).click();const d=page.getByRole('dialog');await d.getByRole('button',{name:'Angezeigte als gelesen'}).click();await expect(d.getByRole('alert')).toBeVisible();expect(state.notifications.every(n=>!n.read_at)).toBe(true);await expect(d.getByText('2 ungelesen · 2 Meldungen')).toBeVisible();
});
test('calendar, appointment editor and notification field fit a mobile viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});await scheduleBackend(page,{role:'admin'});await page.goto('/tests/workspace.html?start=calendar');await expect(page.getByRole('heading',{name:'Kalender & Aufgaben'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/schedule-mobile.png',fullPage:true});await page.getByRole('button',{name:'Termin anlegen',exact:true}).click();let d=page.getByRole('dialog');await expect(d.getByLabel('Termintitel')).toBeFocused();expect(await d.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);await page.screenshot({path:'test-results/schedule-appointment-mobile.png'});await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Benachrichtigungen: 2 ungelesen'}).click();d=page.getByRole('dialog');await expect(d.getByRole('heading',{name:'Benachrichtigungen',exact:true})).toBeVisible();expect(await d.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);await page.screenshot({path:'test-results/schedule-notifications-mobile.png'});
});
