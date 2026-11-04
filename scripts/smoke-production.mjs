// Exercises the compiled production entry, with every network request intercepted.
// No connection to the hosted project and no employee emails are made.
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const html=await readFile('dist/Teamhub.html','utf8');
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
 await context.addInitScript(({storageKey,user,token})=>localStorage.setItem(storageKey,JSON.stringify({access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,expires_at:2200000000,user})),{storageKey,user,token});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());calls.push(url.pathname);
  if(url.origin==='https://teamhub-preview.example.org')return route.fulfill({contentType:'text/html',body:html});
  if(url.origin===backend){
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-expose-headers':'content-range','content-type':'application/json','content-range':'*/0'};
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
   let body;
   if(url.pathname==='/auth/v1/user')body=user;
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
 await page.getByRole('button',{name:'Lernhub',exact:true}).click();
 await page.getByText('Noch keine Kurse angelegt. Erstelle einen Kurs oder nutze im Kursformular die Testvorlage.').waitFor();
 assert.ok(calls.includes('/rest/v1/rpc/my_team_dashboard'));
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
 console.log('Compiled production entry opens the personal dashboard and real learning area; all network requests were simulated.');
} finally {await browser.close();}
