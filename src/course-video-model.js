import {Upload} from 'tus-js-client';
export const videoBucket='course-videos';
export const maxVideoBytes=50*1024*1024;
export const maxRecordingSeconds=5*60;
export const videoAccept='.mp4,.webm,.mov,video/mp4,video/webm,video/quicktime';
export const videoMigrationUrl='https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/011_course_videos.sql';
export function videoMime(file){const ext=file?.name?.split('.').at(-1)?.toLowerCase();const type=({mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime'})[ext];if(!type||file.type&&!file.type.startsWith(type)&&file.type!=='application/octet-stream')return null;return type;}
export function validateVideo(file){if(!file||!Number.isFinite(file.size)||file.size<1)throw {localMessage:'Die Videodatei ist leer.'};if(file.size>maxVideoBytes)throw {localMessage:'Das Video ist größer als 50 MB. Bitte wähle eine kürzere oder kleinere Datei.'};if(!videoMime(file))throw {localMessage:'Bitte wähle ein Video im Format MP4, WebM oder MOV.'};if(file.name.length>180)throw {localMessage:'Bitte kürze den Dateinamen auf höchstens 180 Zeichen.'};}
export function recorderMime(Recorder=globalThis.MediaRecorder){return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','video/webm'].find(type=>Recorder?.isTypeSupported?.(type))||'';}
export function videoError(error){
 if(error?.localMessage)return error.localMessage;
 if(['PGRST202','PGRST205','42P01','42703'].includes(error?.code))return 'Die Erweiterung 011 für das Videostudio ist noch nicht eingerichtet.';
 if(error?.code==='42501')return 'Für dieses Video oder diese Aktion fehlt dir die Freigabe.';
 if(error?.code==='40001')return 'Der Kurs wurde inzwischen geändert. Bitte neu laden und das Video erneut zuordnen.';
 if(error?.message?.includes('Assigned courses'))return 'Dieser Kurs ist bereits zugewiesen und bleibt unverändert. Bitte verwende das Video in einem neuen Kurs.';
 if(error?.message?.includes('in use are preserved'))return 'Dieses Video wird bereits in einem Kurs verwendet. Entferne zuerst die Zuordnung in einem noch nicht zugewiesenen Kurs.';
 if(error?.message?.includes('Video-only lesson'))return 'Diese Lektion besteht nur aus einem Video. Ersetze das Video, statt es zu entfernen.';
 if(error?.message?.includes('another studio'))return 'Ein Kursvideo ist für ein anderes Studio bestimmt. Bitte nutze den passenden Standort oder ein Video für alle Studios.';
 if(error?.message?.includes('unfinished video uploads'))return 'Bitte entferne zuerst einen unvollständigen Upload aus der Videobibliothek.';
 if(error?.message?.includes('Video is being deleted'))return 'Dieser Eintrag wird gerade entfernt. Aktualisiere die Bibliothek und prüfe dort „Entfernen abschließen“.';
 if(error?.code==='23514')return 'Die Videodatei oder Kurszuordnung konnte nicht bestätigt werden. Bitte prüfe Format, Größe und Kursstatus.';
 if(error?.name==='NotAllowedError'||error?.name==='SecurityError')return 'Kamera oder Mikrofon wurden nicht freigegeben. Erlaube den Zugriff im Browser oder wähle eine Videodatei.';
 if(error?.name==='NotFoundError'||error?.name==='NotReadableError')return 'Kamera oder Mikrofon sind nicht verfügbar. Schließe andere Kamera-Apps oder wähle eine Videodatei.';
 return 'Der Vorgang konnte nicht bestätigt werden. Dein ausgewähltes Video bleibt für einen erneuten Versuch erhalten.';
}
export function videoCompletionError(error){
 if(error?.code==='23514'&&error?.message?.includes('Video is being deleted'))return 'Dieser Eintrag wird gerade entfernt. Bitte aktualisiere die Videobibliothek.';
 if(error?.code==='23514')return 'Das Original ist noch nicht vollständig vom Server bestätigt. Wähle über „Fortsetzen“ die ursprüngliche Videodatei und prüfe die Übertragung.';
 return videoError(error);
}
export const videoSize=bytes=>`${(bytes/1024/1024).toLocaleString('de-DE',{maximumFractionDigits:1})} MB`;
export const recordingTime=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
export async function videoRpc(client,name,args={},signal){const q=client.rpc(name,args);const r=await(signal?q.abortSignal(signal):q);if(r.error)throw r.error;return r.data;}
export async function uploadCourseVideo(client,file,ticket,{onProgress,signal,UploadClass=Upload}={}){
 validateVideo(file);
 const {data,error}=await client.auth.getSession();if(error)throw error;if(!data?.session)throw {code:'42501'};
 if(signal?.aborted)throw new DOMException('Upload unterbrochen','AbortError');
 return new Promise((resolve,reject)=>{
  let settled=false;const finish=(error)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);error?reject(error):resolve();};
  const upload=new UploadClass(file,{
   endpoint:`${client.supabaseUrl.replace(/\/$/,'')}/storage/v1/upload/resumable`,
   headers:{authorization:`Bearer ${data.session.access_token}`,apikey:client.supabaseKey,'x-upsert':'false'},
   chunkSize:6*1024*1024,uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,
   retryDelays:[0,1000,3000,5000],
   fingerprint:()=>Promise.resolve(`teamhub-course-video:${data.session.user.id}:${ticket.id}:${file.size}:${file.lastModified}`),
   metadata:{bucketName:videoBucket,objectName:ticket.object_path,contentType:ticket.mime_type,cacheControl:'3600'},
   onBeforeRequest:async request=>{const current=await client.auth.getSession();if(current.error||!current.data?.session)throw current.error||{code:'42501'};request.setHeader('authorization',`Bearer ${current.data.session.access_token}`);},
   onProgress:(sent,total)=>{if(!settled&&!signal?.aborted)onProgress?.(Math.min(100,Math.round(sent/total*100)));},
   onError:finish,onSuccess:()=>finish(),
  });
  const abort=()=>{void upload.abort().catch(()=>{});finish(new DOMException('Upload unterbrochen','AbortError'));};
  signal?.addEventListener('abort',abort,{once:true});
  upload.findPreviousUploads().then(previous=>{if(settled)return;if(previous.length)upload.resumeFromPreviousUpload(previous[0]);upload.start();}).catch(finish);
 });
}
export async function removeCourseVideo(client,id){const path=await videoRpc(client,'prepare_delete_learning_video',{p_video:id});const r=await client.storage.from(videoBucket).remove([path]);if(r.error)throw r.error;await videoRpc(client,'finish_delete_learning_video',{p_video:id});}
