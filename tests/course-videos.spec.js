import {test,expect} from '@playwright/test';
import {sharedBackend,sharedIds} from './shared-backend';
import catalog from '../src/function-catalog.json' with {type:'json'};
test.use({launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']},permissions:['camera','microphone']});
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const courseId=id(1800),assignmentId=id(1801),videoId=id(1802);
async function videoBackend(page,{role='admin',missing=false,assigned=false,failFinish=false,failDelete=false,withVideo=false,quiz=false}={}){
 const base=await sharedBackend(page,{role});const state={calls:[],videos:withVideo?[{id:videoId,title:'Geräte erklären',created_by:sharedIds.user,studio_id:null,file_name:'erklaerung.webm',mime_type:'video/webm',file_size:8,object_path:`${sharedIds.user}/${videoId}/original.webm`,state:'ready',used_count:1,created_at:'2026-11-04T10:00:00Z'}]:[],courses:[{id:courseId,title:'Videokurs',lesson_count:1,active:true,created_by:sharedIds.user}],material:[{course_id:courseId,revision:1,pass_percent:quiz?60:80,lessons:[{title:'Gerät kennenlernen',body:'Die Wartung dokumentieren.',...(withVideo?{video_id:videoId}:{})}],questions:quiz?[{type:'single',prompt:'Wann abschließen?',options:['Vorher','Nachher']},{type:'multiple',prompt:'Welche Schritte?',options:['Prüfen','Dokumentieren','Ignorieren']},{type:'text',prompt:'Ansprechpartner?',options:[]}]:[{prompt:'Wann abschließen?',options:['Vorher','Nachher']}]}],assignments:assigned?[{id:assignmentId,course_id:courseId,learner_id:sharedIds.user,studio_id:sharedIds.studio,requires_practice:false}]:[],reads:[],attempts:[],failFinish,failDelete,waitPatch:false,releasePatch:null,tus:new Map()};
 let next=1900;
 await page.route('https://teamhub-test.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1),method=req.method();
  const names=['team_access_context','learning_courses','learning_material','learning_assignments','learning_progress','learning_reads','learning_attempts','learning_videos','learning_video_library','prepare_learning_video','finish_learning_video','prepare_delete_learning_video','finish_delete_learning_video','attach_learning_video','save_learning_course','acknowledge_learning_lesson','submit_learning_quiz'];
  if(!names.includes(name)&&!url.pathname.startsWith('/storage/v1/'))return route.fallback();
  const body=req.headers()['content-type']?.includes('application/json')?req.postDataJSON():null;state.calls.push({name,path:url.pathname,method,body,headers:req.headers()});
  const headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,HEAD,DELETE,OPTIONS','access-control-allow-headers':'*','access-control-expose-headers':'content-range,location,upload-offset,upload-length,tus-resumable','content-type':'application/json'};
  const send=(data,status=200,extra={})=>route.fulfill({status,headers:{...headers,...extra},body:status===204?undefined:JSON.stringify(data)});
  if(method==='OPTIONS')return send(null,204);
  if(url.pathname.startsWith('/storage/v1/upload/resumable')){
   const h=req.headers();let upload=state.tus.get(name);
   if(method==='POST'){
    const metadata=Object.fromEntries(h['upload-metadata'].split(',').map(part=>{const [key,val]=part.split(' ');return[key,Buffer.from(val||'','base64').toString()];}));
    const key='upload-'+next++,size=Number(h['upload-length']),offset=req.postDataBuffer()?.length||0;
    upload={key,size,offset,metadata};state.tus.set(key,upload);
    return send(null,201,{'tus-resumable':'1.0.0',location:`https://teamhub-test.supabase.co/storage/v1/upload/resumable/${key}`,'upload-offset':String(offset)});
   }
   if(!upload)return send(null,404);
   if(method==='HEAD')return send(null,200,{'tus-resumable':'1.0.0','upload-length':String(upload.size),'upload-offset':String(upload.offset)});
   if(method==='PATCH'){
    if(state.waitPatch)await new Promise(resolve=>state.releasePatch=resolve);
    if(Number(h['upload-offset'])!==upload.offset)return send(null,409,{'tus-resumable':'1.0.0'});
    upload.offset+=req.postDataBuffer()?.length||0;
    try{return await send(null,204,{'tus-resumable':'1.0.0','upload-offset':String(upload.offset)});}catch{return;}
   }
   return send(null,204);
  }
  if(url.pathname.startsWith('/storage/v1/object/sign/'))return send({signedURL:`/object/sign/course-videos/test.webm?token=simulated-read-token`});
  if(url.pathname.startsWith('/storage/v1/object/')&&method==='DELETE')return state.failDelete?send({message:'delete failed'},500):send([]);
  if(url.pathname.startsWith('/storage/v1/object/'))return route.fulfill({status:200,headers:{...headers,'content-type':'video/webm'},body:Buffer.from('test-video')});
  if(name==='team_access_context')return send({version:missing?10:11,pages:role==='admin'?['dashboard','tasks','calendar','learning','knowledge','files','chat','feedback','builder','modules','access','controlling']:['dashboard','tasks','calendar','learning','knowledge','chat','feedback'],capabilities:catalog.filter(c=>role==='admin'||c.roles.includes(role)).map(c=>c.key),can_design:role==='admin'});
  if(name==='learning_video_library')return send({items:state.videos.slice(body.p_page*12,body.p_page*12+12),total:state.videos.length});
  if(name==='prepare_learning_video'){
   const v=state.videos.find(v=>v.id===body.p_nonce)||{id:body.p_nonce,title:body.p_title,file_name:body.p_file_name,mime_type:body.p_mime_type,file_size:body.p_file_size,created_by:sharedIds.user,studio_id:body.p_studio,object_path:`${sharedIds.user}/${body.p_nonce}/original.${body.p_file_name.split('.').at(-1)}`,state:'uploading',used_count:0,created_at:'2026-11-04T12:00Z'};
   if(!state.videos.some(old=>old.id===v.id))state.videos.unshift(v);return send(v);
  }
  if(name==='finish_learning_video'){
   if(state.failFinish)return send({code:'23514',message:'Uploaded video metadata not confirmed'},400);
   const v=state.videos.find(v=>v.id===body.p_video),upload=[...state.tus.values()].find(u=>u.metadata.objectName===v.object_path&&u.offset>=u.size);
   if(v.state!=='ready'&&!upload)return send({code:'23514',message:'Uploaded video metadata not confirmed'},400);v.state='ready';return send(null);
  }
  if(name==='prepare_delete_learning_video'){const v=state.videos.find(v=>v.id===body.p_video);v.state='deleting';return send(v.object_path);}
  if(name==='finish_delete_learning_video'){state.videos=state.videos.filter(v=>v.id!==body.p_video);return send(null);}
  if(name==='attach_learning_video'){
   if(assigned)return send({code:'23514',message:'Assigned courses are immutable; create a copy'},400);
   const m=state.material.find(m=>m.course_id===body.p_course);m.lessons[body.p_lesson].video_id=body.p_video;m.revision++;return send(null);
  }
  if(name==='save_learning_course'){
   const cid=id(next++);state.courses.push({id:cid,title:body.p_title,lesson_count:body.p_lessons.length,active:true,created_by:sharedIds.user});state.material.push({course_id:cid,revision:1,pass_percent:body.p_pass_percent||80,lessons:body.p_lessons,questions:body.p_questions});return send(cid);
  }
  if(name==='learning_videos'){const v=state.videos.find(v=>v.id===url.searchParams.get('id')?.slice(3));return v?send(v):send({code:'PGRST116'},406);}
  if(name==='acknowledge_learning_lesson'){state.reads.push({assignment_id:body.p_assignment,lesson_index:body.p_lesson});return send(state.reads.length);}
  if(name==='submit_learning_quiz'){const r={correct:3,total:3,passed:true,pass_percent:60,percent:100};state.attempts.push({...r,id:id(next++),at:'2026-11-04T12:00Z'});return send(r);}
  const tables={learning_courses:state.courses,learning_material:state.material,learning_assignments:state.assignments,learning_progress:state.assignments.map(a=>({assignment_id:a.id,lessons_read:state.reads.length,quiz_passed:!!state.attempts.length,practice_confirmed:false})),learning_reads:state.reads,learning_attempts:state.attempts};return send(tables[name]||[]);
 });return state;
}
async function openStudio(page){await page.goto('/tests/workspace.html?start=learning');await page.getByRole('button',{name:'Videostudio',exact:true}).click();return page.getByRole('dialog',{name:'Videostudio',exact:true});}
async function chooseVideo(page,d,{size=32,name='kurs.mp4'}={}){await d.getByRole('button',{name:'Video aufnehmen / hochladen',exact:true}).click();await d.getByLabel('Videodatei wählen',{exact:true}).setInputFiles({name,mimeType:'video/mp4',buffer:Buffer.alloc(size,1)});}
test('selecting a file is local until explicitly uploaded, then a confirmed video appears in the private library',async({page})=>{
 const state=await videoBackend(page);const d=await openStudio(page);await chooseVideo(page,d);await expect(d.getByLabel('Vorschau deiner Videodatei')).toBeVisible();expect(state.calls.filter(c=>c.name==='prepare_learning_video')).toHaveLength(0);
 await d.getByLabel('Videotitel',{exact:true}).fill('Empfang erklären');await d.getByRole('button',{name:'Video hochladen',exact:true}).click();await expect(d.getByRole('status').filter({hasText:'Video gespeichert.'})).toBeVisible();expect(state.videos[0].state).toBe('ready');
 const post=state.calls.find(c=>c.path==='/storage/v1/upload/resumable'&&c.method==='POST');expect(post.headers['upload-metadata']).toContain('bucketName');expect(post.headers['x-upsert']).toBe('false');
});
test('a real browser recording previews locally and releases camera and microphone after stopping',async({page})=>{
 await page.addInitScript(()=>{window.__streams=[];const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async options=>{const s=await original(options);window.__streams.push(s);return s;};});
 const state=await videoBackend(page);const d=await openStudio(page);await d.getByRole('button',{name:'Video aufnehmen / hochladen',exact:true}).click();await d.getByRole('button',{name:'Kamera einschalten',exact:true}).click();await expect(d.getByLabel('Kameravorschau')).toBeVisible();await d.getByRole('button',{name:'Aufnahme starten',exact:true}).click();await page.waitForTimeout(1300);await d.getByRole('button',{name:'Aufnahme stoppen',exact:true}).click();await expect(d.getByLabel('Vorschau deiner Videodatei')).toBeVisible();await expect.poll(()=>d.getByLabel('Vorschau deiner Videodatei').evaluate(video=>video.videoWidth)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);expect(state.calls.some(c=>c.name==='prepare_learning_video')).toBe(false);await page.keyboard.press('Escape');await expect(d).toHaveCount(0);
});
test('camera denial is explained and file upload remains available',async({page})=>{
 await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('denied','NotAllowedError');};});await videoBackend(page);const d=await openStudio(page);await d.getByRole('button',{name:'Video aufnehmen / hochladen',exact:true}).click();await d.getByRole('button',{name:'Kamera einschalten',exact:true}).click();await expect(d.getByRole('alert')).toContainText('nicht freigegeben');await d.getByLabel('Videodatei wählen',{exact:true}).setInputFiles({name:'stattdessen.mp4',mimeType:'video/mp4',buffer:Buffer.alloc(32)});await expect(d.getByLabel('Vorschau deiner Videodatei')).toBeVisible();
});
test('failed final confirmation preserves the file and retries finalization without uploading twice',async({page})=>{
 const state=await videoBackend(page,{failFinish:true});const d=await openStudio(page);await chooseVideo(page,d);await d.getByRole('button',{name:'Video hochladen',exact:true}).click();await expect(d.getByRole('alert')).toBeVisible();await expect(d.getByLabel('Vorschau deiner Videodatei')).toBeVisible();expect(state.videos[0].state).toBe('uploading');await expect(d.getByText('Video gespeichert. Du kannst es jetzt einer Lektion zuordnen.')).toHaveCount(0);
 state.failFinish=false;await d.getByRole('button',{name:'Upload fortsetzen',exact:true}).click();await expect(d.getByRole('status').filter({hasText:'Video gespeichert.'})).toBeVisible();expect(state.calls.filter(c=>c.path==='/storage/v1/upload/resumable'&&c.method==='POST')).toHaveLength(1);
});
test('a saved video can be chosen in a new course together with mixed examination questions',async({page})=>{
 const state=await videoBackend(page,{withVideo:true});await page.goto('/tests/workspace.html?start=learning');await page.getByRole('button',{name:'Kurs erstellen',exact:true}).click();const editor=page.getByRole('dialog',{name:'Neuen Kurs erstellen',exact:true});await editor.getByRole('button',{name:'Testvorlage einsetzen'}).click();await editor.getByRole('button',{name:'Video aufnehmen / auswählen'}).first().click();const picker=page.getByRole('dialog',{name:'Video für die Lektion auswählen'});await picker.getByRole('button',{name:'Dieses Video verwenden'}).click();await expect(picker).toHaveCount(0);
 await editor.getByLabel('Bestehensgrenze in Prozent').fill('60');await editor.getByLabel('Fragetyp für Frage 1').selectOption('multiple');await editor.getByRole('checkbox',{name:'Antwort 1 ist richtig',exact:true}).check();await editor.getByRole('checkbox',{name:'Antwort 2 ist richtig',exact:true}).check();await editor.getByLabel('Fragetyp für Frage 2').selectOption('text');await editor.getByLabel('Erwartete kurze Antwort für Frage 2').fill('Patrick Walter');await editor.getByRole('button',{name:'Kurs auf dem Server speichern'}).click();await expect(editor).toHaveCount(0);
 const save=state.calls.find(c=>c.name==='save_learning_course').body;expect(save.p_lessons[0].video_id).toBe(videoId);expect(save.p_questions[0].type).toBe('multiple');expect(save.p_questions[1].type).toBe('text');expect(save.p_answers).toEqual([[0,1],'Patrick Walter']);expect(save.p_pass_percent).toBe(60);expect(save.p_questions.some(q=>q.answer)).toBe(false);
});
test('assigned learners receive a signed video URL and submit typed exam answers only after the lesson',async({page})=>{
 const state=await videoBackend(page,{role:'employee',assigned:true,withVideo:true,quiz:true});await page.goto('/tests/workspace.html?start=learning');await expect(page.getByRole('button',{name:'Videostudio',exact:true})).toHaveCount(0);await page.getByRole('button',{name:/Videokurs 0\/1/}).click();await expect(page.getByRole('button',{name:'Quiz auswerten',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Video laden',exact:true}).click();await expect(page.getByLabel('Gerät kennenlernen',{exact:true}).filter({has:page.locator('source')})).toHaveCount(0);await expect(page.locator('.course-video-player video')).toHaveAttribute('src',/token=simulated-read-token/);expect(state.calls.find(c=>c.path.startsWith('/storage/v1/object/sign/')).body.expiresIn).toBe(600);
 await page.getByRole('button',{name:'Lektion als gelesen bestätigen',exact:true}).click();await page.getByRole('radio',{name:'Nachher',exact:true}).check();await page.getByRole('checkbox',{name:'Prüfen',exact:true}).check();await page.getByRole('checkbox',{name:'Dokumentieren',exact:true}).check();await page.getByLabel('Antwort zu Frage 3').fill('Patrick Walter');await page.getByRole('button',{name:'Quiz auswerten',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'3/3 richtig'})).toContainText('Bestanden.');expect(state.calls.find(c=>c.name==='submit_learning_quiz').body.p_answers).toEqual([1,[0,1],'Patrick Walter']);
});
test('an assigned course rejects a video replacement visibly inside the picker',async({page})=>{
 await videoBackend(page,{assigned:true,withVideo:true});await page.goto('/tests/workspace.html?start=learning');await page.getByRole('button',{name:/Videokurs 0\/1/}).click();await page.getByRole('button',{name:'Video wechseln',exact:true}).click();const d=page.getByRole('dialog',{name:'Video für die Lektion auswählen'});await d.getByRole('button',{name:'Dieses Video verwenden'}).click();await expect(d.getByRole('alert')).toContainText('bereits zugewiesen');
});
test('removal failure stays visible and never claims a video was removed',async({page})=>{
 const state=await videoBackend(page,{withVideo:true,failDelete:true});state.videos[0].used_count=0;const d=await openStudio(page);await d.getByRole('button',{name:'Video löschen',exact:true}).click();await expect(d.getByRole('alert')).toBeVisible();await expect(d.getByText('Video entfernt.',{exact:true})).toHaveCount(0);expect(state.videos).toHaveLength(1);expect(state.calls.some(c=>c.name==='finish_delete_learning_video')).toBe(false);
});
test('video studio and course question editor retain the hub design on mobile without overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await videoBackend(page);const d=await openStudio(page);await chooseVideo(page,d);expect(await d.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:'test-results/video-studio-mobile.png'});await page.keyboard.press('Escape');await page.getByRole('button',{name:'Kurs erstellen',exact:true}).click();const editor=page.getByRole('dialog',{name:'Neuen Kurs erstellen'});await editor.getByLabel('Fragetyp für Frage 1').selectOption('multiple');expect(await editor.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:'test-results/video-course-exam-mobile.png'});
});
test('missing video migration leaves existing courses usable and gives the exact SQL setup link',async({page})=>{
 await videoBackend(page,{missing:true});await page.goto('/tests/workspace.html?start=learning');await expect(page.getByRole('link',{name:'011_course_videos.sql öffnen'})).toHaveAttribute('href',/011_course_videos.sql/);await expect(page.getByRole('button',{name:'Videostudio',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:/Videokurs/})).toBeVisible();
});
test('interrupting a chunked upload allows the same file to resume without creating another video',async({page})=>{
 const state=await videoBackend(page);state.waitPatch=true;const d=await openStudio(page);await chooseVideo(page,d,{size:8*1024*1024});await d.getByRole('button',{name:'Video hochladen',exact:true}).click();await expect.poll(()=>!!state.releasePatch).toBe(true);await d.getByRole('button',{name:'Upload unterbrechen',exact:true}).click();await expect(d.getByRole('button',{name:'Upload fortsetzen',exact:true})).toBeVisible();state.waitPatch=false;state.releasePatch();await d.getByRole('button',{name:'Upload fortsetzen',exact:true}).click();await expect(d.getByRole('status').filter({hasText:'Video gespeichert.'})).toBeVisible();expect(state.videos).toHaveLength(1);expect(state.calls.filter(c=>c.path==='/storage/v1/upload/resumable'&&c.method==='POST')).toHaveLength(1);
});
test('closing a camera preview releases every device track',async({page})=>{
 await page.addInitScript(()=>{window.__streams=[];const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async options=>{const s=await original(options);window.__streams.push(s);return s;};});await videoBackend(page);const d=await openStudio(page);await d.getByRole('button',{name:'Video aufnehmen / hochladen',exact:true}).click();await d.getByRole('button',{name:'Kamera einschalten',exact:true}).click();await expect(d.getByLabel('Kameravorschau')).toBeVisible();await d.getByRole('button',{name:'Fenster schließen',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.__streams.length>0&&window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true);
});
