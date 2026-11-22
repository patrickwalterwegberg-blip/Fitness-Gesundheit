import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {sharedBackend,sharedIds} from './shared-backend';

const courseId='00000000-0000-4000-8000-000000000780',assignmentId='00000000-0000-4000-8000-000000000781';
const printLabel='Drucken / als PDF speichern';
async function evidenceBackend(page,{role='employee',complete=true,foreign=false,legacy=false,error=null,hold=false}={}){
 await sharedBackend(page,{role});
 const course={id:courseId,title:'Sicherheit & Geräte',lesson_count:1,active:!legacy};
 const assignment={id:assignmentId,course_id:courseId,learner_id:foreign?sharedIds.colleague:sharedIds.user,studio_id:sharedIds.studio,requires_practice:!legacy,due_date:null};
 const progress={assignment_id:assignmentId,lessons_read:1,quiz_passed:true,practice_confirmed:complete};
 const proof={version:1,assignment_id:assignmentId,learner_name:'Ümit Müller',studio_name:'Dörpen',course_title:course.title,course_revision:legacy?null:2,lesson_count:1,lessons_read:1,knowledge_confirmed:true,requires_practice:!legacy,practice_confirmed:complete,practice_confirmed_at:legacy?null:'2026-11-22T09:00:00Z',checked_at:'2026-11-22T10:00:00Z'};
 const state={proof,error,hold,release:null,calls:[]};
 await page.route('https://teamhub-test.supabase.co/rest/v1/**',async route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1);
  const tables={learning_courses:[course],learning_assignments:[assignment],learning_progress:[progress],learning_material:legacy?[]:[{course_id:courseId,revision:2,lessons:[{title:'Geräte prüfen',body:'Sicherheit im Studio.'}],questions:[{prompt:'Ist Sicherheit wichtig?',options:['Ja','Nein']}]}],learning_reads:[{assignment_id:assignmentId,lesson_index:0}],learning_attempts:[]};
  if(name==='learning_evidence'){
   state.calls.push(route.request().postDataJSON());
   if(state.hold){state.hold=false;await new Promise(resolve=>{state.release=resolve;});}
   const body=state.error?{code:state.error,message:'Synthetic evidence failure'}:state.proof;
   return route.fulfill({status:state.error?state.error==='42501'?403:400:200,contentType:'application/json',body:JSON.stringify(body)});
  }
  if(Object.hasOwn(tables,name))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(tables[name])});
  return route.fallback();
 });
 await page.addInitScript(()=>{window.__evidencePrints=0;window.print=()=>{window.__evidencePrints++;window.__printedEvidence=document.querySelector('.learning-evidence-print-root')?.textContent;window.__printedClass=document.body.classList.contains('printing-learning-evidence');};});
 return state;
}
async function openCourse(page,{mobile=false}={}){
 await page.goto('/tests/workspace.html');
 if(mobile)await page.getByRole('button',{name:'Menü öffnen',exact:true}).click();
 await page.getByRole('button',{name:'Lernhub',exact:true}).click();
 await page.getByRole('button',{name:/^Sicherheit & Geräte/}).click();
}
async function openEvidence(page,options){await openCourse(page,options);await page.getByRole('button',{name:'Lernnachweis öffnen',exact:true}).click();return page.getByRole('dialog',{name:'Interner Lernnachweis',exact:true});}

test('own completed course opens a server-backed internal learning record without inventing a completion date',async({page})=>{
 const state=await evidenceBackend(page);const dialog=await openEvidence(page);
 await expect(dialog.getByText('Ümit Müller',{exact:true})).toBeVisible();await expect(dialog.getByText('Nachweisstand',{exact:true})).toBeVisible();
 await expect(dialog.getByText(/22\.11\.2026.*11:00.*Europe\/Berlin/)).toBeVisible();await expect(dialog.getByText('Kursversion',{exact:true})).toBeVisible();
 await expect(dialog.getByRole('button',{name:printLabel})).toBeEnabled();expect(state.calls).toEqual([{p_assignment:assignmentId}]);
 await expect(page.locator('.learning-evidence-print-root')).toHaveCount(0);expect(await page.evaluate(()=>window.__evidencePrints)).toBe(0);
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Lernnachweis öffnen',exact:true})).toBeFocused();
});
test('an outstanding mandatory practice confirmation keeps the evidence action disabled without calling its API',async({page})=>{
 const state=await evidenceBackend(page,{complete:false});await openCourse(page);
 await expect(page.getByRole('button',{name:'Lernnachweis öffnen',exact:true})).toBeDisabled();await expect(page.getByText(/Dein Lernnachweis wird nach allen Lesebestätigungen/)).toBeVisible();expect(state.calls).toHaveLength(0);
});
test('a foreign course preview does not offer a personal learning record even to an administrator',async({page})=>{
 const state=await evidenceBackend(page,{role:'admin',foreign:true});await openCourse(page);await expect(page.getByRole('button',{name:'Lernnachweis öffnen',exact:true})).toHaveCount(0);expect(state.calls).toHaveLength(0);
});
test('inactive legacy courses retain a completed personal record and show an undocumented version honestly',async({page})=>{
 await evidenceBackend(page,{legacy:true});const dialog=await openEvidence(page);await expect(dialog.getByText('Nicht dokumentiert',{exact:true})).toBeVisible();await expect(dialog.getByText('Nicht erforderlich',{exact:true})).toBeVisible();await expect(dialog.getByRole('button',{name:printLabel})).toBeEnabled();
});
test('printing revalidates the server state and uses the fresh proof only once while concurrent clicks are blocked',async({page})=>{
 const state=await evidenceBackend(page);const dialog=await openEvidence(page);await expect(dialog.getByRole('button',{name:printLabel})).toBeEnabled();
 state.proof={...state.proof,checked_at:'2026-11-22T11:30:00Z'};state.hold=true;
 await dialog.getByRole('button',{name:printLabel}).evaluate(button=>{button.click();button.click();});await expect.poll(()=>state.calls.length).toBe(2);await expect(dialog.getByRole('button',{name:printLabel})).toBeDisabled();
 state.release();await expect.poll(()=>page.evaluate(()=>window.__evidencePrints)).toBe(1);
 expect(await page.evaluate(()=>window.__printedClass)).toBe(true);expect(await page.evaluate(()=>window.__printedEvidence)).toContain('12:30');
 expect(state.calls).toEqual([{p_assignment:assignmentId},{p_assignment:assignmentId}]);
 await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await expect(page.locator('.learning-evidence-print-root')).toHaveCount(0);expect(await page.evaluate(()=>document.body.classList.contains('printing-learning-evidence'))).toBe(false);
});
test('access revoked after opening removes the previous proof and never opens a print dialog',async({page})=>{
 const state=await evidenceBackend(page);const dialog=await openEvidence(page);await expect(dialog.getByText('Ümit Müller',{exact:true})).toBeVisible();state.error='42501';
 await dialog.getByRole('button',{name:printLabel}).click();await expect(dialog.getByRole('alert')).toContainText('nicht freigegeben');await expect(dialog.getByText('Ümit Müller',{exact:true})).toHaveCount(0);await expect(dialog.getByRole('button',{name:printLabel})).toBeDisabled();await expect(page.locator('.learning-evidence-print-root')).toHaveCount(0);expect(await page.evaluate(()=>window.__evidencePrints)).toBe(0);expect(state.calls).toHaveLength(2);
});
for(const [role,admin] of [['admin',true],['employee',false]])test('a missing evidence migration gives correct setup guidance for '+role,async({page})=>{
 await evidenceBackend(page,{role,error:'PGRST202'});const dialog=await openEvidence(page);await expect(dialog.getByRole('alert')).toContainText('Erweiterung 016');await expect(dialog.getByRole('button',{name:printLabel})).toBeDisabled();
 if(admin)await expect(dialog.getByRole('link',{name:'016_learning_evidence.sql öffnen'})).toHaveAttribute('href',/016_learning_evidence\.sql$/);else await expect(dialog.getByText('Bitte wende dich für die Einrichtung an deine Leitung.')).toBeVisible();
 await expect(dialog.getByText(/Erweiterung 006/)).toHaveCount(0);
});
for(const invalid of ['wrong assignment','incomplete knowledge'])test('an invalid server proof cannot enable print: '+invalid,async({page})=>{
 const state=await evidenceBackend(page);state.proof=invalid==='wrong assignment'?{...state.proof,assignment_id:'another-assignment'}:{...state.proof,knowledge_confirmed:false};const dialog=await openEvidence(page);await expect(dialog.getByRole('alert')).toContainText('keinen gültigen vollständigen Lernnachweis');await expect(dialog.getByRole('button',{name:printLabel})).toBeDisabled();expect(await page.evaluate(()=>window.__evidencePrints)).toBe(0);
});
test('closing a pending evidence request discards its late result and restores the course action',async({page})=>{
 const state=await evidenceBackend(page,{hold:true});const dialog=await openEvidence(page);await expect.poll(()=>state.calls.length).toBe(1);await expect(dialog.getByRole('status')).toContainText('auf dem Server geprüft');await dialog.getByRole('button',{name:'Lernnachweis schließen',exact:true}).click();state.release();
 await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Lernnachweis öffnen',exact:true})).toBeFocused();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(page.locator('.learning-evidence-paper')).toHaveCount(0);await expect(page.locator('.learning-evidence-print-root')).toHaveCount(0);expect(await page.evaluate(()=>window.__evidencePrints)).toBe(0);
});
test('proof strings stay plain text and the mobile dialog remains inside the viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});const state=await evidenceBackend(page);state.proof={...state.proof,learner_name:'Ümit <img src=x onerror="window.evidenceXss=true"> Müller'};const dialog=await openEvidence(page,{mobile:true});await expect(dialog.getByText(state.proof.learner_name,{exact:true})).toBeVisible();await expect(dialog.locator('img')).toHaveCount(0);expect(await page.evaluate(()=>window.evidenceXss)).toBeUndefined();expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/learning-evidence-mobile.png',fullPage:true});
});
test('the actual PDF contains only the current personal evidence and excludes surrounding app content',async({page},testInfo)=>{
 await evidenceBackend(page);const dialog=await openEvidence(page);await expect(dialog.getByRole('button',{name:printLabel})).toBeEnabled();
 await page.evaluate(()=>{const aside=document.createElement('aside');aside.textContent='PRIVATE_APP_MARKER_7K4';document.body.append(aside);});await dialog.getByRole('button',{name:printLabel}).click();await expect.poll(()=>page.evaluate(()=>window.__evidencePrints)).toBe(1);
 await page.emulateMedia({media:'print'});expect(await page.locator('#root').evaluate(el=>getComputedStyle(el).display)).toBe('none');await expect(page.locator('.learning-evidence-print-root')).toBeVisible();
 const path=testInfo.outputPath('internal-learning-evidence.pdf');await page.pdf({path,format:'A4',printBackground:true});const content=execFileSync('pdftotext',[path,'-'],{encoding:'utf8'});
 expect(content).toContain('Interner Lernnachweis');expect(content).toContain('Ümit Müller');expect(content).toContain('Sicherheit & Geräte');expect(content).toContain(assignmentId);expect(content).not.toContain('PRIVATE_APP_MARKER_7K4');expect(content).not.toContain('Nachweise im Studio begleiten');
 await page.emulateMedia({media:'screen'});await dialog.getByRole('button',{name:'Lernnachweis schließen',exact:true}).click();expect(await page.evaluate(()=>document.body.classList.contains('printing-learning-evidence'))).toBe(false);
});
