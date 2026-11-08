import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {sharedBackend,sharedIds} from './shared-backend';
const catalog=JSON.parse(readFileSync(new URL('../src/function-catalog.json',import.meta.url),'utf8'));
test.use({launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']},permissions:['camera','microphone']});
const pending=n=>({id:`00000000-0000-4000-8000-${String(9700+n).padStart(12,'0')}`,title:`QA Upload ${n}`,created_by:sharedIds.user,studio_id:sharedIds.studio,file_name:`original-${n}.mp4`,mime_type:'video/mp4',file_size:32+n,object_path:`${sharedIds.user}/qa-${n}/original.mp4`,state:'uploading',used_count:0,created_at:'2026-11-08T10:00:00Z'});
async function setup(page,{openStudio=true}={}){
 await sharedBackend(page,{role:'admin',pages:['dashboard','learning','knowledge']});const state={videos:[pending(1),pending(2)],writes:[],storage:[]};
 await page.route('https://teamhub-test.supabase.co/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname,name=path.split('/').at(-1),send=data=>route.fulfill({json:data});
  if(path.startsWith('/storage/v1/')){state.storage.push({method:request.method(),path});return route.fulfill({status:400,json:{message:'Unexpected storage access in local-only QA'}});}
  if(name==='team_access_context')return send({version:11,pages:['dashboard','learning','knowledge'],capabilities:catalog.map(item=>item.key),can_design:false});
  if(name==='learning_video_library')return send({items:state.videos,total:state.videos.length});
  if(['learning_courses','learning_material','learning_assignments','learning_progress','learning_reads','learning_attempts'].includes(name))return send([]);
  if(/^(prepare_|finish_|attach_|save_)/.test(name)&&/video|learning_course/.test(name)){state.writes.push({name,body:request.postDataJSON()});return route.fulfill({status:400,json:{message:'Unexpected write in local-only QA'}});}
  return route.fallback();
 });
 await page.goto('/tests/workspace.html?start=learning');if(openStudio)await page.getByRole('button',{name:'Videostudio',exact:true}).click();return{...state,studio:openStudio?page.getByRole('dialog',{name:'Videostudio',exact:true}):null};
}
const review=page=>page.getByRole('dialog',{name:'Geöffnete Videoauswahl wechseln?',exact:true});
const resume=(studio,n)=>studio.locator('.video-library-item').filter({hasText:`QA Upload ${n}`}).getByRole('button',{name:'Fortsetzen',exact:true});
async function selectOriginal(studio,video){await studio.getByLabel('Videodatei wählen',{exact:true}).setInputFiles({name:video.file_name,mimeType:video.mime_type,buffer:Buffer.alloc(video.file_size,7)});await expect(studio.getByLabel('Vorschau deiner Videodatei',{exact:true})).toBeVisible();}
async function assertOriginal(studio,url,size){const preview=studio.getByLabel('Vorschau deiner Videodatei',{exact:true});await expect(preview).toHaveAttribute('src',url);const page=studio.page();const [download]=await Promise.all([page.waitForEvent('download'),studio.getByRole('link',{name:'Video auf diesem Gerät sichern',exact:true}).click()]);expect([...readFileSync(await download.path())]).toEqual(Array(size).fill(7));}
function noServerChanges(state){expect(state.writes).toEqual([]);expect(state.storage).toEqual([]);expect(state.videos.map(v=>v.state)).toEqual(['uploading','uploading']);}

test('QA: alternating existing tickets preserves the same original until each switch is confirmed',async({page})=>{
 const state=await setup(page),d=state.studio;await resume(d,1).click();await selectOriginal(d,state.videos[0]);const urlA=await d.getByLabel('Vorschau deiner Videodatei').getAttribute('src');
 await resume(d,1).click();await expect(review(page)).toHaveCount(0);await assertOriginal(d,urlA,state.videos[0].file_size);
 await resume(d,2).click();await review(page).getByRole('button',{name:'Geöffnete Auswahl behalten',exact:true}).click();await assertOriginal(d,urlA,state.videos[0].file_size);await expect(d.locator('.video-capture .video-pending-context')).toContainText('QA Upload 1');
 await resume(d,2).click();await review(page).getByRole('button',{name:'Auswahl verwerfen und wechseln',exact:true}).click();await expect(d.locator('.video-capture .video-pending-context')).toContainText('QA Upload 2');await expect(d.getByLabel('Vorschau deiner Videodatei')).toHaveCount(0);
 await selectOriginal(d,state.videos[1]);const urlB=await d.getByLabel('Vorschau deiner Videodatei').getAttribute('src');await resume(d,2).click();await expect(review(page)).toHaveCount(0);await assertOriginal(d,urlB,state.videos[1].file_size);
 await resume(d,1).click();await page.keyboard.press('Escape');await expect(review(page)).toHaveCount(0);await expect(d).toBeVisible();await assertOriginal(d,urlB,state.videos[1].file_size);
 await resume(d,1).click();await review(page).getByRole('button',{name:'Auswahl verwerfen und wechseln',exact:true}).click();await expect(d.locator('.video-capture .video-pending-context')).toContainText('QA Upload 1');await expect(d.getByLabel('Vorschau deiner Videodatei')).toHaveCount(0);noServerChanges(state);
});

test('QA: a hand-camera file keeps its title, studio and downloadable bytes when switching is cancelled',async({page})=>{
 await page.setViewportSize({width:390,height:844});const state=await setup(page),d=state.studio;await d.getByRole('button',{name:'Video aufnehmen / hochladen',exact:true}).click();
 await d.getByLabel('Mit Handykamera aufnehmen',{exact:true}).setInputFiles({name:'handykamera.mp4',mimeType:'video/mp4',buffer:Buffer.alloc(48,7)});await d.getByLabel('Videotitel',{exact:true}).fill('QA Handyentwurf');await d.getByRole('combobox',{name:'Freigabe für Studio',exact:true}).selectOption(sharedIds.otherStudio);const url=await d.getByLabel('Vorschau deiner Videodatei').getAttribute('src');
 await resume(d,2).click();await expect(review(page)).toContainText('QA Upload 2');await page.keyboard.press('Escape');await expect(review(page)).toHaveCount(0);await expect(d).toBeVisible();await assertOriginal(d,url,48);await expect(d.getByLabel('Videotitel',{exact:true})).toHaveValue('QA Handyentwurf');await expect(d.getByRole('combobox',{name:'Freigabe für Studio',exact:true})).toHaveValue(sharedIds.otherStudio);await expect(d.getByRole('link',{name:'Video auf diesem Gerät sichern',exact:true})).toHaveAttribute('href',url);
 await resume(d,1).click();await expect(review(page)).toContainText('QA Upload 1');await review(page).getByRole('button',{name:'Geöffnete Auswahl behalten',exact:true}).click();await assertOriginal(d,url,48);noServerChanges(state);
});

test('QA: active recording blocks a capture switch and its stopped draft then requires explicit discard',async({page})=>{
 const state=await setup(page),d=state.studio;await d.getByRole('button',{name:'Video aufnehmen / hochladen',exact:true}).click();await d.getByRole('button',{name:'Kamera einschalten',exact:true}).click();await d.getByRole('button',{name:'Aufnahme starten',exact:true}).click();
 await expect(resume(d,1)).toBeDisabled();await expect(d.getByRole('button',{name:'Video aufnehmen / hochladen',exact:true})).toBeDisabled();await page.waitForTimeout(1200);await d.getByRole('button',{name:'Aufnahme stoppen',exact:true}).click();await expect(d.getByLabel('Vorschau deiner Videodatei',{exact:true})).toBeVisible();const url=await d.getByLabel('Vorschau deiner Videodatei').getAttribute('src');
 await resume(d,2).click();await expect(review(page)).toBeVisible();await page.keyboard.press('Escape');await expect(review(page)).toHaveCount(0);await expect(d.getByLabel('Vorschau deiner Videodatei')).toHaveAttribute('src',url);await expect(d.getByLabel('Videotitel',{exact:true})).toHaveValue('Neue Videoaufnahme');
 await resume(d,1).click();await review(page).getByRole('button',{name:'Auswahl verwerfen und wechseln',exact:true}).click();await expect(d.getByLabel('Vorschau deiner Videodatei')).toHaveCount(0);await expect(d.locator('.video-capture .video-pending-context')).toContainText('QA Upload 1');noServerChanges(state);
});


test('QA: nested picker close review cancels only itself and preserves the unsaved parent course',async({page})=>{
 await page.setViewportSize({width:390,height:844});const state=await setup(page,{openStudio:false});
 await page.getByRole('button',{name:'Kurs erstellen',exact:true}).click();const editor=page.getByRole('dialog',{name:'Neuen Kurs erstellen',exact:true});
 await editor.getByLabel('Kurstitel',{exact:true}).fill('QA Kurs bleibt offen');await editor.getByLabel('Titel der Lektion 1',{exact:true}).fill('QA Lektion bleibt offen');await editor.getByRole('textbox',{name:'Inhalt der Lektion 1',exact:true}).fill('QA Inhalt des noch ungespeicherten Kurses.');
 const attachment=editor.getByRole('button',{name:'Video aufnehmen / auswählen',exact:true}).first();await attachment.click();const picker=page.getByRole('dialog',{name:'Video für die Lektion auswählen',exact:true});
 await picker.getByRole('button',{name:'Video aufnehmen / hochladen',exact:true}).click();await picker.getByLabel('Videodatei wählen',{exact:true}).setInputFiles({name:'kurs-entwurf.mp4',mimeType:'video/mp4',buffer:Buffer.alloc(54,7)});await picker.getByLabel('Videotitel',{exact:true}).fill('QA unveröffentlichtes Kursvideo');const url=await picker.getByLabel('Vorschau deiner Videodatei').getAttribute('src');
 const closing=page.getByRole('dialog',{name:'Videostudio schließen?',exact:true});await page.keyboard.press('Escape');await expect(closing).toBeVisible();expect(await closing.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:'/tmp/teamhub-1d-qa-nested-390.png'});
 await page.keyboard.press('Escape');await expect(closing).toHaveCount(0);await expect(picker).toBeVisible();await assertOriginal(picker,url,54);await expect(picker.getByLabel('Videotitel',{exact:true})).toHaveValue('QA unveröffentlichtes Kursvideo');
 await picker.getByRole('button',{name:'Fenster schließen',exact:true}).click();await closing.getByRole('button',{name:'Geöffnete Auswahl behalten',exact:true}).click();await assertOriginal(picker,url,54);
 await page.keyboard.press('Escape');await closing.getByRole('button',{name:'Auswahl verwerfen und schließen',exact:true}).click();await expect(picker).toHaveCount(0);await expect(editor).toBeVisible();await expect(editor.getByLabel('Kurstitel',{exact:true})).toHaveValue('QA Kurs bleibt offen');await expect(editor.getByLabel('Titel der Lektion 1',{exact:true})).toHaveValue('QA Lektion bleibt offen');await expect(editor.getByRole('textbox',{name:'Inhalt der Lektion 1',exact:true})).toHaveValue('QA Inhalt des noch ungespeicherten Kurses.');
 await attachment.click();await expect(picker.locator('.video-capture')).toHaveCount(0);await page.keyboard.press('Escape');await expect(picker).toHaveCount(0);await expect(editor).toBeVisible();noServerChanges(state);
});
