// Exercises the compiled production entry, with every network request intercepted.
// No connection to the hosted project and no employee emails are made.
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const html=await readFile('dist/Teamhub.html','utf8');
const functionCatalog=JSON.parse(await readFile('src/function-catalog.json','utf8'));
const loginHtml=await readFile('dist/login.html','utf8');
const backend=process.env.VITE_SUPABASE_URL||'https://ftcurcqduzrxsvkujfql.supabase.co';
assert.ok(html.includes(backend),'Build with the public production backend configuration first');
const host=new URL(backend).hostname,storageKey=`sb-${host.split('.')[0]}-auth-token`;
const uid='00000000-0000-4000-8000-000000000001';
const user={id:uid,email:'production-smoke@example.org',aud:'authenticated',role:'authenticated',user_metadata:{},app_metadata:{}};
const profile={id:uid,full_name:'Testkonto Produktion',role:'admin',active:true};
const payload=Buffer.from(JSON.stringify({sub:uid,aud:'authenticated',role:'authenticated',exp:2200000000})).toString('base64url');
const token=`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.test-signature`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try {
 const context=await browser.newContext();
 const errors=[],unexpected=[],calls=[];
 await context.addInitScript(({storageKey,user,token})=>{if(!sessionStorage.getItem('production-smoke-seeded')){localStorage.setItem(storageKey,JSON.stringify({access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,expires_at:2200000000,user}));sessionStorage.setItem('production-smoke-seeded','1');}},{storageKey,user,token});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());calls.push(url.pathname);
  if(url.origin==='https://teamhub-preview.example.org')return route.fulfill({contentType:'text/html',body:url.pathname.endsWith('/login.html')?loginHtml:html});
  if(url.origin===backend){
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-expose-headers':'content-range','content-type':'application/json','content-range':'*/0'};
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(url.pathname==='/auth/v1/logout')return route.fulfill({status:204,headers});
   let body;
   if(url.pathname==='/auth/v1/user')body=user;
   else if(url.pathname==='/auth/v1/token'){
    const credentials=route.request().postDataJSON();
    assert.equal(url.searchParams.get('grant_type'),'password');
    assert.equal(credentials.email,user.email);
    assert.equal(credentials.password,'Smoke-Test-Passphrase-2026!');
    body={access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,expires_at:2200000000,user};
   }
   else if(url.pathname==='/rest/v1/rpc/team_access_context')body={version:11,capabilities:functionCatalog.map(c=>c.key),pages:['dashboard','tasks','calendar','learning','knowledge','files','modules','builder','chat','feedback','access','controlling'],can_design:true};
   else if(url.pathname==='/rest/v1/team_member_info')body={job_title:'Produktionstest',phone:'',started_on:null};
   else if(url.pathname==='/rest/v1/rpc/admin_team_directory')body={members:[],total:0,studios:[{id:'00000000-0000-4000-8000-000000000002',name:'Dörpen'}]};
   else if(url.pathname==='/rest/v1/rpc/team_home_data')body={can_manage:true,items:[]};
   else if(url.pathname==='/rest/v1/rpc/team_notification_inbox')body={items:[],unread:0,total:0};
   else if(url.pathname==='/rest/v1/rpc/team_schedule_month')body={days:[]};
   else if(url.pathname==='/rest/v1/calendar_events')body=[];
   else if(url.pathname==='/rest/v1/rpc/learning_video_library')body={items:[],total:0};
   else if(url.pathname==='/rest/v1/rpc/team_chat_inbox')body={channels:[],unread:0};
   else if(url.pathname==='/rest/v1/profiles')body=url.searchParams.has('id')?profile:[profile];
   else if(url.pathname==='/rest/v1/rpc/my_team_dashboard')body={today:'2026-11-04',counts:{open:0,today:0,overdue:0,done:0},tasks:[],learning:[],knowledge:[]};
   else if(['/rest/v1/tasks','/rest/v1/studios','/rest/v1/studio_memberships','/rest/v1/learning_courses','/rest/v1/learning_assignments','/rest/v1/learning_progress','/rest/v1/learning_material','/rest/v1/learning_reads'].includes(url.pathname))body=[];
   else {unexpected.push(url.pathname);return route.abort();}
   return route.fulfill({status:200,headers,body:JSON.stringify(body)});
  }
  unexpected.push(url.href);return route.abort();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://teamhub-preview.example.org/');
 await page.getByRole('heading',{name:'Meine Übersicht',exact:true}).waitFor();
 await page.getByText('Aktuell sind dir keine offenen Aufgaben zugewiesen.').waitFor();
 await page.getByRole('button',{name:'Mein Mitarbeiterprofil öffnen'}).click();
 await page.getByRole('dialog',{name:'Mein Mitarbeiterprofil'}).getByText('Produktionstest',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Mein Profil schließen'}).click();
 await page.getByRole('button',{name:'Kalender',exact:true}).click();
 await page.getByRole('heading',{name:'Kalender & Aufgaben',exact:true}).waitFor();
 await page.getByRole('button',{name:'Termin anlegen',exact:true}).click();
 const appointment=page.getByRole('dialog',{name:'Termin anlegen',exact:true});
 await appointment.waitFor();
 assert.ok(await appointment.getByLabel('Termintitel').evaluate(el=>el===document.activeElement),'Appointment must focus the title field');
 await appointment.getByRole('button',{name:'Fenster schließen'}).click();
 await page.getByRole('button',{name:'Benachrichtigungen: 0 ungelesen'}).click();
 await page.getByRole('dialog',{name:'Benachrichtigungen',exact:true}).getByText('Du hast noch keine Benachrichtigungen.').waitFor();
 await page.getByRole('dialog',{name:'Benachrichtigungen',exact:true}).getByRole('button',{name:'Fenster schließen'}).click();
 await page.getByRole('button',{name:'Mitarbeiterzugänge',exact:true}).click();
 await page.getByRole('button',{name:'Mitarbeiter einladen',exact:true}).click();
 const inviteDialog=page.getByRole('dialog',{name:'Neuen Mitarbeiter einladen',exact:true});
 await inviteDialog.waitFor();
 assert.ok(await inviteDialog.getByLabel('Name des Mitarbeiters',{exact:true}).evaluate(el=>el===document.activeElement),'Invitation must focus the name field');
 const inviteHeading=await inviteDialog.getByRole('heading',{name:'Neuen Mitarbeiter einladen'}).boundingBox();
 assert.ok(inviteHeading&&inviteHeading.y>=0&&inviteHeading.y<page.viewportSize().height,'Invitation heading must be in viewport');
 await inviteDialog.getByRole('button',{name:'Zugangsformular schließen'}).click();
 await page.getByRole('button',{name:'Lernhub',exact:true}).click();
 await page.getByText('Noch keine Kurse angelegt. Erstelle einen Kurs oder nutze im Kursformular die Testvorlage.').waitFor();
 await page.getByRole('button',{name:'Videostudio',exact:true}).click();
 const videoStudio=page.getByRole('dialog',{name:'Videostudio',exact:true});
 await videoStudio.getByText('Noch keine passenden Videos. Nimm ein Video auf oder lade eine Datei hoch.').waitFor();
 await videoStudio.getByRole('button',{name:'Video aufnehmen / hochladen',exact:true}).click();
 await videoStudio.getByLabel('Videodatei wählen',{exact:true}).setInputFiles({name:'smoke.mp4',mimeType:'video/mp4',buffer:Buffer.from('local-video-preview')});
 await videoStudio.getByLabel('Vorschau deiner Videodatei',{exact:true}).waitFor();
 assert.ok(!calls.includes('/rest/v1/rpc/prepare_learning_video'),'Choosing a local video must not upload it');
 await videoStudio.getByRole('button',{name:'Fenster schließen',exact:true}).click();
 await page.getByRole('button',{name:'Abmelden',exact:true}).click();
 await page.goto('https://teamhub-preview.example.org/Fitness-Gesundheit/login.html');
 await page.getByRole('heading',{name:'Willkommen im Team.'}).waitFor();
 await page.getByLabel('Deine Firmen-E-Mail-Adresse').fill(user.email);
 await page.getByLabel('Dein Teamhub-Passwort',{exact:true}).fill('Smoke-Test-Passphrase-2026!');
 await page.getByRole('button',{name:'Anmelden',exact:true}).click();
 await page.getByRole('heading',{name:'Meine Übersicht',exact:true}).waitFor();
 assert.ok(calls.includes('/rest/v1/rpc/my_team_dashboard'));
 assert.ok(calls.includes('/auth/v1/token'));
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
 console.log('Compiled production entry, visible invitation and calendar dialogs, notification inbox, academy and local video preview, logout and dedicated password-login page passed; all network requests were simulated.');
} finally {await browser.close();}
