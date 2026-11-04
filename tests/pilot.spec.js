import { test, expect } from '@playwright/test';
import { sharedBackend,sharedIds } from './shared-backend';

const cid='00000000-0000-4000-8000-000000000080',aid='00000000-0000-4000-8000-000000000081',tid='00000000-0000-4000-8000-000000000082';
async function pilotBackend(page,{role='admin',missing=false,failRead=false,empty=false}={}) {
  const base=await sharedBackend(page,{role});const calls=[];
  const courses=empty?[]:[{id:cid,title:'Einarbeitung Empfang',lesson_count:2,active:true}];
  const assignments=empty?[]:[{id:aid,course_id:cid,learner_id:sharedIds.user,studio_id:sharedIds.studio,due_date:'2026-11-20',requires_practice:true}];
  const progress=empty?[]:[{assignment_id:aid,lessons_read:0,quiz_passed:false,practice_confirmed:false}];
  const material=empty?[]:[{course_id:cid,revision:1,lessons:[{title:'Aufgaben bearbeiten',body:'Erst abschließen, dann als erledigt markieren.'},{title:'Unterlagen finden',body:'Im Wissenshub stehen freigegebene Inhalte.'}],questions:[{prompt:'Wann erledigt markieren?',options:['Direkt beim Öffnen','Nach Abschluss']},{prompt:'Wo sind freigegebene Inhalte?',options:['Im Wissenshub','Im Papierkorb']}]}];
  const reads=[],attempts=[],keys=new Map([[cid,[1,0]]]);
  const tasks=[{id:tid,title:'Reale Testaufgabe öffnen',description:'Aufgabe aus dem Backend',studio_id:sharedIds.studio,assignee_id:sharedIds.user,due_date:'2026-11-04',status:'open',priority:'normal',studio:{name:'Dörpen'},assignee:{full_name:'Patrick Test'}}];
  await page.route('https://teamhub-test.supabase.co/rest/v1/**',async route=>{
    const req=route.request(),url=new URL(req.url()),method=req.method(),body=req.postDataJSON(),name=url.pathname.split('/').at(-1);
    if(!['my_team_dashboard','admin_pilot_status','team_task_calendar','learning_courses','learning_assignments','learning_progress','learning_material','learning_reads','learning_attempts','save_learning_course','acknowledge_learning_lesson','submit_learning_quiz','create_learning_assignment','tasks'].includes(name))return route.fallback();
    calls.push({name,method,body,query:Object.fromEntries(url.searchParams)});
    const send=(value,status=200,headers={})=>route.fulfill({status,headers:{'access-control-allow-origin':'*','access-control-expose-headers':'content-range','content-type':'application/json',...headers},body:JSON.stringify(value)});
    if(missing&&['my_team_dashboard','admin_pilot_status','team_task_calendar','learning_material'].includes(name))return send({code:name==='learning_material'?'PGRST205':'PGRST202'},404);
    if(name==='tasks'){
      if(method==='PATCH'){Object.assign(tasks[0],body);return send(tasks[0]);}
      return send(tasks,200,{'content-range':`0-${tasks.length-1}/${tasks.length}`});
    }
    if(name==='my_team_dashboard')return send({today:'2026-11-04',counts:{open:1,overdue:0,today:1,done:0},tasks,learning:assignments.map(a=>({...a,...courses.find(c=>c.id===a.course_id),...progress.find(p=>p.assignment_id===a.id),id:a.id})),knowledge:[]});
    if(name==='admin_pilot_status')return send({migration:6,active_users:2,tasks:1,courses:courses.length,storage_private:true,documents:2,published:0,drafts:2,pending_uploads:0,unlinked_objects:1});
    if(name==='team_task_calendar')return send({days:[{due_date:'2026-11-04',total:70,done:20}]});
    if(name==='save_learning_course'){
      const id=cid.slice(0,-2)+'90';courses.push({id,title:body.p_title,lesson_count:body.p_lessons.length,active:true});material.push({course_id:id,lessons:body.p_lessons,questions:body.p_questions,revision:1});keys.set(id,body.p_answers);return send(id);
    }
    if(name==='create_learning_assignment'){
      const id=aid.slice(0,-2)+'91';assignments.push({id,course_id:body.p_course,learner_id:body.p_learner,studio_id:body.p_studio,due_date:body.p_due,requires_practice:body.p_practice});progress.push({assignment_id:id,lessons_read:0,quiz_passed:false,practice_confirmed:false});return send(id);
    }
    if(name==='acknowledge_learning_lesson'){
      if(failRead)return send({code:'42501'},403);
      if(!reads.some(r=>r.assignment_id===body.p_assignment&&r.lesson_index===body.p_lesson))reads.push({assignment_id:body.p_assignment,lesson_index:body.p_lesson,read_at:'2026-11-04T10:00:00Z'});
      const count=reads.filter(r=>r.assignment_id===body.p_assignment).length;progress.find(p=>p.assignment_id===body.p_assignment).lessons_read=count;return send(count);
    }
    if(name==='submit_learning_quiz'){
      const a=assignments.find(a=>a.id===body.p_assignment),answers=keys.get(a.course_id),correct=answers.filter((v,i)=>v===body.p_answers[i]).length,result={correct,total:answers.length,passed:correct/answers.length>=0.8};
      attempts.push({...result,id:String(attempts.length),assignment_id:a.id,at:'2026-11-04T10:01:00Z'});progress.find(p=>p.assignment_id===a.id).quiz_passed ||= result.passed;return send(result);
    }
    const tables={learning_courses:courses,learning_assignments:assignments,learning_progress:progress,learning_material:material,learning_reads:reads,learning_attempts:attempts};return send(tables[name]||[]);
  });
  return {...base,calls,courses,assignments,progress,material,reads,attempts};
}
test.beforeEach(async({page})=>{await page.clock.setFixedTime(new Date('2026-11-04T09:00:00Z'));});
test('personal dashboard shows server totals, opens real tasks and diagnoses unpublished knowledge',async({page})=>{
  const state=await pilotBackend(page);await page.goto('/tests/workspace.html?start=dashboard');
  await expect(page.getByRole('heading',{name:'Meine Übersicht',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/Heute fällig/})).toContainText('1');
  await expect(page.getByRole('navigation',{name:'Teambereiche'})).toBeVisible();
  await page.screenshot({path:'test-results/team-dashboard-desktop.png',fullPage:true});
  await expect(page.getByRole('button',{name:/Einarbeitung Empfang 0\/2/})).toBeVisible();
  await page.getByRole('button',{name:'Serverstatus prüfen'}).click();
  await expect(page.getByRole('status')).toContainText('2 Entwürfe');
  await expect(page.getByRole('status')).toContainText('Ein Upload direkt in der Supabase-Konsole erzeugt keinen Wissenseintrag');
  await page.getByRole('button',{name:/Reale Testaufgabe öffnen/}).click();
  await expect(page.getByRole('heading',{name:'Reale Testaufgabe öffnen',level:2})).toBeVisible();
  await page.getByLabel('Bearbeitungsstatus').selectOption('in_progress');
  await expect(page.getByRole('status')).toContainText('Bearbeitungsstatus auf dem Server gespeichert');
  expect(state.calls.some(c=>c.name==='tasks'&&c.method==='PATCH'&&c.body.status==='in_progress')).toBeTruthy();
});
test('calendar uses server aggregation and opens a selected day task',async({page})=>{
  const state=await pilotBackend(page,{role:'employee'});await page.goto('/tests/workspace.html');await page.getByRole('button',{name:'Kalender',exact:true}).click();
  const date=page.getByRole('button',{name:'4.11.2026, 70 Aufgaben',exact:true});
  await expect(date).toContainText('50 offen');await date.click();
  await expect(page.getByRole('heading',{name:'4.11.2026 · 1 Aufgaben'})).toBeVisible();
  await page.getByRole('button',{name:/Reale Testaufgabe öffnen/}).click();
  await expect(page.getByRole('heading',{name:'Reale Testaufgabe öffnen',level:2})).toBeVisible();
  expect(state.calls.some(c=>c.name==='team_task_calendar'&&c.body.p_month==='2026-11-01')).toBeTruthy();
});
test('learner completes real reading and quiz with persisted separate practice status',async({page})=>{
  const state=await pilotBackend(page,{role:'employee'});await page.goto('/tests/workspace.html');await page.getByRole('button',{name:'Lernhub',exact:true}).click();
  await expect(page.getByRole('button',{name:'Kurs erstellen'})).toHaveCount(0);
  await page.getByRole('button',{name:/Einarbeitung Empfang 0\/2/}).click();
  await expect(page.getByText('Der Wissenscheck wird nach allen Lesebestätigungen freigeschaltet.')).toBeVisible();
  await page.getByRole('button',{name:'Lektion als gelesen bestätigen',exact:true}).click();
  await expect(page.getByRole('button',{name:'Als gelesen bestätigt'})).toBeDisabled();
  await page.getByRole('button',{name:'2. Unterlagen finden'}).click();
  await page.getByRole('button',{name:'Lektion als gelesen bestätigen',exact:true}).click();
  await page.getByRole('radio',{name:'Nach Abschluss',exact:true}).check();await page.getByRole('radio',{name:'Im Wissenshub',exact:true}).check();
  await page.getByRole('button',{name:'Quiz auswerten',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'2/2 richtig'})).toContainText('Bestanden.');
  await expect(page.getByText('Praxis: Bestätigung durch Geschäftsführung offen')).toBeVisible();
  expect(state.progress[0].quiz_passed).toBe(true);expect(state.progress[0].practice_confirmed).toBe(false);expect(state.reads).toHaveLength(2);
  expect(state.calls.find(c=>c.name==='submit_learning_quiz').body.p_answers).toEqual([1,0]);
  await page.reload();await page.getByRole('button',{name:'Lernhub',exact:true}).click();await page.getByRole('button',{name:/Einarbeitung Empfang 2\/2/}).click();
  await expect(page.getByText('Quiz: bestanden', {exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Letzte Quizversuche'})).toBeVisible();
});
test('administrator creates a course only on save and assigns it to their own real account',async({page})=>{
  const state=await pilotBackend(page,{empty:true});await page.goto('/tests/workspace.html');await page.getByRole('button',{name:'Lernhub',exact:true}).click();
  await page.getByRole('button',{name:'Kurs erstellen',exact:true}).click();await page.getByRole('button',{name:'Testvorlage einsetzen'}).click();
  expect(state.calls.filter(c=>c.name==='save_learning_course')).toHaveLength(0);
  await page.getByRole('button',{name:'Kurs auf dem Server speichern',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('heading',{name:'[TEST] Den Teamhub kennenlernen',exact:true})).toBeVisible();
  expect(state.courses).toHaveLength(1);expect(state.assignments).toHaveLength(0);
  await page.getByRole('button',{name:'Kurs zuweisen',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Lernauftrag auf dem Server erstellt'})).toBeVisible();
  expect(state.assignments[0].learner_id).toBe(sharedIds.user);expect(state.assignments[0].requires_practice).toBe(false);
  await expect(page.getByRole('button',{name:'Lektion als gelesen bestätigen',exact:true})).toBeVisible();
});
test('missing pilot migration has an actionable message and existing tasks remain usable',async({page})=>{
  await pilotBackend(page,{missing:true});await page.goto('/tests/workspace.html?start=dashboard');
  await expect(page.getByRole('alert')).toContainText('Erweiterung 006');await expect(page.getByRole('link',{name:'006_pilot_learning.sql öffnen'})).toHaveAttribute('href',/006_pilot_learning.sql/);
  await page.getByRole('button',{name:'Aufgaben',exact:true}).click();await expect(page.getByRole('button',{name:/Reale Testaufgabe öffnen/})).toBeVisible();
  await page.getByRole('button',{name:'Lernhub',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Erweiterung 006');
});
test('failed reading acknowledgment does not invent progress or unlock the quiz',async({page})=>{
  const state=await pilotBackend(page,{role:'employee',failRead:true});await page.goto('/tests/workspace.html');await page.getByRole('button',{name:'Lernhub',exact:true}).click();await page.getByRole('button',{name:/Einarbeitung Empfang 0\/2/}).click();
  await page.getByRole('button',{name:'Lektion als gelesen bestätigen',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('fehlen deinem Konto die Rechte');await expect(page.getByRole('button',{name:'Quiz auswerten',exact:true})).toHaveCount(0);
  expect(state.reads).toHaveLength(0);expect(state.progress[0].lessons_read).toBe(0);
});
test('personal overview, course reader and editor fit a mobile viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});await pilotBackend(page);await page.goto('/tests/workspace.html?start=dashboard');
  await expect(page.getByRole('heading',{name:'Meine Übersicht',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/team-dashboard-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Menü öffnen'}).click();
  await expect(page.getByRole('button',{name:'Menü schließen'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Menü öffnen'})).toBeFocused();
  await page.getByRole('button',{name:'Menü öffnen'}).click();
  await page.screenshot({path:'test-results/team-navigation-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Lernhub',exact:true}).click();
  await expect(page.getByRole('button',{name:'Menü öffnen'})).toHaveAttribute('aria-expanded','false');await page.getByRole('button',{name:/Einarbeitung Empfang 0\/2/}).click();
  await expect(page.getByText('Erst abschließen, dann als erledigt markieren.')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Kurs erstellen',exact:true}).click();await page.getByRole('button',{name:'Testvorlage einsetzen'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.screenshot({path:'test-results/pilot-mobile.png',fullPage:true});
});
