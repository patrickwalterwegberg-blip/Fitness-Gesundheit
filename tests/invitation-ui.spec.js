import {test,expect} from '@playwright/test';
import {sharedBackend} from './shared-backend';

async function openDirectory(page){
 await page.goto('/tests/workspace.html');
 if(page.viewportSize().width<=760)await page.getByRole('button',{name:'Menü öffnen'}).click();
 await page.getByRole('button',{name:'Mitarbeiterzugänge',exact:true}).click();
}
for(const viewport of [{width:1440,height:800},{width:390,height:844}]){
 test(`invitation button reveals and focuses its form immediately at ${viewport.width}px`,async({page})=>{
  await page.setViewportSize(viewport);const backend=await sharedBackend(page);
  for(let n=0;n<15;n++)backend.members.push({...backend.members[1],id:`00000000-0000-4000-9000-${String(n).padStart(12,'0')}`,full_name:`Zusätzliches Teammitglied ${n}`,email:`test-${n}@example.org`});
  await openDirectory(page);const trigger=page.getByRole('button',{name:'Mitarbeiter einladen',exact:true});await expect(trigger).toBeEnabled();await trigger.click();
  await expect(page.getByRole('heading',{name:'Neuen Mitarbeiter einladen',exact:true})).toBeInViewport();
  await expect(page.getByLabel('Name des Mitarbeiters',{exact:true})).toBeFocused();
  expect(backend.calls.some(c=>c.path.startsWith('/functions/'))).toBe(false);
 });
}

test('failed invitation is explained inside the visible form and preserves the entered email',async({page})=>{
 await sharedBackend(page);let requests=0;
 await page.route('https://teamhub-test.supabase.co/functions/v1/team-access',async route=>{requests++;await route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({code:'invitation_not_confirmed'})});});
 await openDirectory(page);await page.getByRole('button',{name:'Mitarbeiter einladen',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Neuen Mitarbeiter einladen',exact:true});
 await dialog.getByLabel('Name des Mitarbeiters',{exact:true}).fill('Test Mitarbeiter');await dialog.getByLabel('Firmen-E-Mail für den Zugang',{exact:true}).fill('testkonto@example.org');await dialog.getByRole('button',{name:'Einladung anfordern',exact:true}).click();
 await expect(dialog.getByRole('alert')).toContainText('Einladung konnte beim E-Mail-Dienst nicht bestätigt');await expect(dialog.getByRole('alert')).toBeInViewport();await expect(dialog.getByLabel('Firmen-E-Mail für den Zugang',{exact:true})).toHaveValue('testkonto@example.org');await expect(page.getByRole('status')).toHaveCount(0);expect(requests).toBe(1);
});

test('login-link request from a lower row shows its confirmed request result in the viewport',async({page})=>{
 await page.setViewportSize({width:1440,height:800});const backend=await sharedBackend(page);
 for(let n=0;n<15;n++)backend.members.push({...backend.members[1],id:`00000000-0000-4000-9000-${String(n).padStart(12,'0')}`,full_name:`Testperson ${n}`,email:`test-${n}@example.org`});
 const sent=[];await page.route('https://teamhub-test.supabase.co/functions/v1/team-access',async route=>{sent.push(route.request().postDataJSON());await route.fulfill({contentType:'application/json',body:JSON.stringify({code:'login_link_requested'})});});
 await openDirectory(page);await page.getByRole('button',{name:'Anmeldelink für Testperson 14 anfordern',exact:true}).click();const status=page.getByRole('status').filter({hasText:'Anmeldelink beim E-Mail-Dienst angefordert'});await expect(status).toBeVisible();await expect(status).toBeInViewport();await expect(status).toContainText('noch nicht bestätigt');expect(sent).toEqual([{action:'send_login',userId:backend.members.at(-1).id}]);
});

test('canceling the invitation restores the trigger and never requests a mail',async({page})=>{
 const backend=await sharedBackend(page);await openDirectory(page);const trigger=page.getByRole('button',{name:'Mitarbeiter einladen',exact:true});await trigger.click();await expect(page.getByLabel('Name des Mitarbeiters',{exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Neuen Mitarbeiter einladen',exact:true})).toHaveCount(0);await expect(trigger).toBeFocused();expect(backend.calls.some(c=>c.path.startsWith('/functions/'))).toBe(false);
});
