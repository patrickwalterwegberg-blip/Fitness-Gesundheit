import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const uid='00000000-0000-4000-8000-000000000001',site='00000000-0000-4000-8000-000000000003';
const initialPassword='Test-Passphrase-2026!';
function sessionFor(id=uid){const user={id,email:id===uid?'patrick@example.org':'colleague@example.org',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};const payload=Buffer.from(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',exp:2200000000})).toString('base64url');return {access_token:`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.test-signature`,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,expires_at:2200000000,user};}
const recoveryUrl=()=>'/tests/workspace.html?team=1#'+new URLSearchParams({access_token:sessionFor().access_token,refresh_token:'test-refresh',token_type:'bearer',expires_in:'3600',type:'recovery'});
async function authBackend(page,{loggedIn=false,active=true,unknownEmail=false,failUpdate=false,failLogout=false,failEmail=false,invalidRecovery=false}={}){
 const calls=[],session=sessionFor();const state={password:initialPassword,failLogout};
 if(loggedIn)await page.addInitScript(session=>localStorage.setItem('sb-teamhub-test-auth-token',JSON.stringify(session)),session);
 await page.route('https://teamhub-test.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method(),body=req.postDataJSON();calls.push({path:url.pathname,method,body,query:Object.fromEntries(url.searchParams)});
  const send=(value,status=200)=>route.fulfill({status,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-expose-headers':'X-Supabase-Api-Version','X-Supabase-Api-Version':'2024-01-01','content-type':'application/json'},body:status===204?undefined:JSON.stringify(value)});
  if(method==='OPTIONS')return send(null,204);
  if(url.pathname==='/auth/v1/token')return body.password===state.password&&body.email===session.user.email?send(session):send({code:'invalid_credentials',message:'Invalid login credentials'},400);
  if(url.pathname==='/auth/v1/recover')return failEmail?send({code:'over_email_send_rate_limit',message:'rate limit'},429):send({});
  if(url.pathname==='/auth/v1/otp')return unknownEmail?send({code:'signup_disabled',message:'Signups not allowed for otp'},400):send({});
  if(url.pathname==='/auth/v1/user'){
   if(method==='PUT'){if(failUpdate)return send({code:'weak_password',message:'Weak password'},422);state.password=body.password;return send(session.user);}
   if(invalidRecovery)return send({code:'bad_jwt',message:'Invalid recovery session'},401);
   return send(session.user);
  }
  if(url.pathname==='/auth/v1/logout')return state.failLogout?send({message:'Logout unavailable'},500):send(null,204);
  if(url.pathname==='/rest/v1/profiles')return send(url.searchParams.has('id')?[{id:uid,full_name:'Patrick Test',role:'admin',active}]:[{id:uid,full_name:'Patrick Test',role:'admin',active}]);
  if(url.pathname==='/rest/v1/studios')return send([{id:site,name:'Dörpen'}]);
  if(url.pathname==='/rest/v1/studio_memberships')return send([]);
  if(url.pathname==='/rest/v1/tasks')return send([{id:'task-1',title:'Geschützte Teamaufgabe',studio_id:site,assignee_id:uid,status:'open',due_date:'2026-11-04',priority:'normal',studio:{name:'Dörpen'},assignee:{full_name:'Patrick Test'}}]);
  return send({message:'Unbekannte Testanfrage'},404);
 });
 return {calls,state,session};
}

test('email and personal password sign in, never auto-register, and logout clears private views',async({page})=>{
 const {calls}=await authBackend(page);await page.goto('/tests/workspace.html');
 await expect(page.getByRole('heading',{name:'Willkommen im Team.'})).toBeVisible();
 await page.getByLabel('Deine Firmen-E-Mail-Adresse').fill('patrick@example.org');await page.getByLabel('Dein Teamhub-Passwort',{exact:true}).fill(initialPassword);
 await page.getByRole('button',{name:'Anmelden',exact:true}).click();await expect(page.getByRole('heading',{name:'Hallo, Patrick.'})).toBeVisible();await expect(page.getByRole('button',{name:/Geschützte Teamaufgabe/})).toBeVisible();
 const token=calls.find(c=>c.path==='/auth/v1/token');expect(token.query.grant_type).toBe('password');expect(token.body.email).toBe('patrick@example.org');expect(token.body.password).toBe(initialPassword);
 expect(calls.some(c=>['/auth/v1/signup','/auth/v1/otp','/auth/v1/recover'].includes(c.path))).toBe(false);
 expect(await page.evaluate(password=>JSON.stringify({...localStorage,...sessionStorage}).includes(password),initialPassword)).toBe(false);
 await page.getByRole('button',{name:'Abmelden',exact:true}).click();await expect(page.getByRole('button',{name:'Anmelden',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/Geschützte Teamaufgabe/})).toHaveCount(0);
 expect(await page.getByLabel('Dein Teamhub-Passwort',{exact:true}).inputValue()).toBe('');
});
test('incorrect password stays on login without reading any team data',async({page})=>{
 const {calls}=await authBackend(page);await page.goto('/tests/workspace.html');await page.getByLabel('Deine Firmen-E-Mail-Adresse').fill('patrick@example.org');await page.getByLabel('Dein Teamhub-Passwort',{exact:true}).fill('wrong-password');await page.getByRole('button',{name:'Anmelden',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Prüfe E-Mail und Passwort');expect(calls.some(c=>c.path.startsWith('/rest/'))).toBe(false);await expect(page.getByRole('button',{name:'Anmelden',exact:true})).toBeEnabled();
});
test('password login cannot bypass an inactive employee profile',async({page})=>{
 const {calls}=await authBackend(page,{active:false});await page.goto('/tests/workspace.html');await page.getByLabel('Deine Firmen-E-Mail-Adresse').fill('patrick@example.org');await page.getByLabel('Dein Teamhub-Passwort',{exact:true}).fill(initialPassword);await page.getByRole('button',{name:'Anmelden',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Dein Zugang ist noch nicht freigeschaltet.'})).toBeVisible();expect(calls.some(c=>c.path==='/rest/v1/tasks')).toBe(false);
});
test('first password request uses the existing allowed redirect and a neutral answer with cooldown',async({page})=>{
 const {calls}=await authBackend(page,{unknownEmail:true});await page.goto('/tests/workspace.html');await page.getByRole('button',{name:'Passwort festlegen / vergessen?',exact:true}).click();await page.getByLabel('Deine Firmen-E-Mail-Adresse').fill('unknown@example.org');await page.getByRole('button',{name:'Link zum Passwort festlegen senden'}).click();
 await expect(page.getByRole('status')).toContainText('Falls für diese Adresse ein Konto eingerichtet ist');await expect(page.getByRole('button',{name:/Erneut anfordern in/})).toBeDisabled();
 const recovery=calls.find(c=>c.path==='/auth/v1/recover');expect(recovery.body.email).toBe('unknown@example.org');expect(recovery.query.redirect_to).toBe('http://127.0.0.1:5173/tests/workspace.html?team=1');expect(calls.some(c=>c.path==='/auth/v1/signup'||c.path.startsWith('/rest/'))).toBe(false);
});
test('dedicated login page sends recovery back to the already allowed app root',async({page})=>{
 const {calls}=await authBackend(page);const html=await readFile('tests/workspace.html','utf8');await page.route('http://127.0.0.1:5173/Fitness-Gesundheit/login.html',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto('/Fitness-Gesundheit/login.html');await page.getByRole('button',{name:'Passwort festlegen / vergessen?',exact:true}).click();await page.getByLabel('Deine Firmen-E-Mail-Adresse').fill('patrick@example.org');await page.getByRole('button',{name:'Link zum Passwort festlegen senden'}).click();await expect(page.getByRole('status')).toContainText('E-Mail zum Festlegen deines Passworts');expect(calls.find(c=>c.path==='/auth/v1/recover').query.redirect_to).toBe('http://127.0.0.1:5173/Fitness-Gesundheit/?team=1');
});
test('email delivery failure never claims that a password link was sent',async({page})=>{
 await authBackend(page,{failEmail:true});await page.goto('/tests/workspace.html');await page.getByRole('button',{name:'Passwort festlegen / vergessen?',exact:true}).click();await page.getByLabel('Deine Firmen-E-Mail-Adresse').fill('patrick@example.org');await page.getByRole('button',{name:'Link zum Passwort festlegen senden'}).click();await expect(page.getByRole('alert')).toContainText('Zu viele Versuche');await expect(page.getByRole('status')).toHaveCount(0);
});
test('verified recovery sets a confirmed password, logs out, then accepts the new password',async({page})=>{
 const {calls,state}=await authBackend(page);await page.goto(recoveryUrl());await expect(page.getByRole('heading',{name:'Dein neues Teamhub-Passwort.'})).toBeVisible();await expect(page).not.toHaveURL(/access_token/);expect(calls.some(c=>c.path.startsWith('/rest/'))).toBe(false);
 await page.getByLabel('Neues Passwort',{exact:true}).fill('Neue-Test-Passphrase-2026!');await page.getByLabel('Neues Passwort wiederholen',{exact:true}).fill('Eine-andere-Passphrase');await page.getByRole('button',{name:'Passwort speichern und abmelden'}).click();await expect(page.getByRole('alert')).toContainText('stimmen nicht überein');expect(calls.some(c=>c.method==='PUT')).toBe(false);
 await page.getByLabel('Neues Passwort wiederholen',{exact:true}).fill('Neue-Test-Passphrase-2026!');await page.getByRole('button',{name:'Passwort speichern und abmelden'}).click();await expect(page.getByRole('button',{name:'Anmelden',exact:true})).toBeVisible();await expect(page.getByRole('status')).toContainText('Passwort wurde gespeichert');
 expect(state.password).toBe('Neue-Test-Passphrase-2026!');expect(calls.find(c=>c.path==='/auth/v1/logout').query.scope).toBe('global');expect(await page.evaluate(()=>Object.keys(sessionStorage).some(k=>k.startsWith('fg-team-password-recovery')))).toBe(false);
 await page.getByLabel('Deine Firmen-E-Mail-Adresse').fill('patrick@example.org');await page.getByLabel('Dein Teamhub-Passwort',{exact:true}).fill(state.password);await page.getByRole('button',{name:'Anmelden',exact:true}).click();await expect(page.getByRole('heading',{name:'Hallo, Patrick.'})).toBeVisible();
});
test('password setup survives reload only for the same verified account',async({page})=>{
 const {calls}=await authBackend(page);await page.goto(recoveryUrl());await expect(page.getByRole('heading',{name:'Dein neues Teamhub-Passwort.'})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'Dein neues Teamhub-Passwort.'})).toBeVisible();expect(calls.filter(c=>c.path==='/auth/v1/user'&&c.method==='GET').length).toBeGreaterThanOrEqual(2);expect(calls.some(c=>c.path.startsWith('/rest/'))).toBe(false);
});
test('a pending password marker from another account never opens password setup',async({page})=>{
 const {calls}=await authBackend(page,{loggedIn:true});await page.goto('/tests/workspace.html');await expect(page.getByRole('heading',{name:'Hallo, Patrick.'})).toBeVisible();
 await page.evaluate(()=>sessionStorage.setItem('fg-team-password-recovery:https://teamhub-test.supabase.co',JSON.stringify({userId:'00000000-0000-4000-8000-000000000002',at:Date.now()})));
 await page.reload();await expect(page.getByRole('heading',{name:'Hallo, Patrick.'})).toBeVisible();await expect(page.getByLabel('Neues Passwort',{exact:true})).toHaveCount(0);expect(calls.some(c=>c.method==='PUT')).toBe(false);
});
test('a forged recovery hint or failed token verification cannot open the password update form',async({page})=>{
 await authBackend(page,{loggedIn:true,invalidRecovery:true});await page.goto('/tests/workspace.html#type=recovery');await expect(page.getByRole('heading',{name:'Hallo, Patrick.'})).toBeVisible();await expect(page.getByLabel('Neues Passwort',{exact:true})).toHaveCount(0);
 await page.goto(recoveryUrl());await expect(page.getByRole('heading',{name:'Passwort-Link nicht bestätigt.'})).toBeVisible();await expect(page.getByLabel('Neues Passwort',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:/Geschützte Teamaufgabe/})).toHaveCount(0);
});
test('server password rejection preserves the form without reporting success',async({page})=>{
 const {state}=await authBackend(page,{failUpdate:true});await page.goto(recoveryUrl());await page.getByLabel('Neues Passwort',{exact:true}).fill('Neue-Test-Passphrase-2026!');await page.getByLabel('Neues Passwort wiederholen',{exact:true}).fill('Neue-Test-Passphrase-2026!');await page.getByRole('button',{name:'Passwort speichern und abmelden'}).click();await expect(page.getByRole('alert')).toContainText('erfüllt die Vorgaben nicht');await expect(page.getByRole('heading',{name:'Dein neues Teamhub-Passwort.'})).toBeVisible();expect(state.password).toBe(initialPassword);await expect(page.getByRole('status')).toHaveCount(0);
});
test('successful password save with failed logout clearly reports both outcomes',async({page})=>{
 const {state}=await authBackend(page,{failLogout:true});await page.goto(recoveryUrl());await page.getByLabel('Neues Passwort',{exact:true}).fill('Neue-Test-Passphrase-2026!');await page.getByLabel('Neues Passwort wiederholen',{exact:true}).fill('Neue-Test-Passphrase-2026!');await page.getByRole('button',{name:'Passwort speichern und abmelden'}).click();await expect(page.getByRole('alert')).toContainText('Abmeldung weiterer Sitzungen konnte nicht bestätigt werden');await expect(page.getByLabel('Neues Passwort',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Anmelden',exact:true})).toBeVisible();expect(state.password).toBe('Neue-Test-Passphrase-2026!');
});
test('signed-in staff can request password setup for their own email',async({page})=>{
 const {calls}=await authBackend(page,{loggedIn:true});await page.goto('/tests/workspace.html');await page.getByRole('button',{name:'Passwort festlegen / ändern'}).click();await expect(page.getByLabel('Deine Firmen-E-Mail-Adresse')).toHaveAttribute('readonly','');await page.getByRole('button',{name:'Link zum Passwort festlegen senden'}).click();await expect(page.getByRole('status')).toContainText('E-Mail zum Festlegen deines Passworts');expect(calls.find(c=>c.path==='/auth/v1/recover').body.email).toBe('patrick@example.org');
});
test('logout clears local private views even when server revocation cannot be confirmed',async({page})=>{
 await authBackend(page,{loggedIn:true,failLogout:true});await page.goto('/tests/workspace.html');await expect(page.getByRole('button',{name:/Geschützte Teamaufgabe/})).toBeVisible();await page.getByRole('button',{name:'Abmelden',exact:true}).click();await expect(page.getByRole('button',{name:'Anmelden',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/Geschützte Teamaufgabe/})).toHaveCount(0);await expect(page.getByRole('alert')).toContainText('serverseitige Abmeldung konnte nicht bestätigt werden');
});
test('password fields support visibility controls and the login fits desktop and mobile',async({page})=>{
 await authBackend(page);await page.goto('/tests/workspace.html');await page.getByLabel('Dein Teamhub-Passwort',{exact:true}).fill(initialPassword);await page.getByRole('button',{name:'Dein Teamhub-Passwort anzeigen'}).click();await expect(page.getByLabel('Dein Teamhub-Passwort',{exact:true})).toHaveAttribute('type','text');await page.getByRole('button',{name:'Dein Teamhub-Passwort verbergen'}).click();await expect(page.getByLabel('Dein Teamhub-Passwort',{exact:true})).toHaveAttribute('type','password');
 await page.screenshot({path:'test-results/password-login-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/password-login-mobile.png',fullPage:true});
});
