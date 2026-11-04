import {useEffect,useState} from 'react';
export const teamPages={dashboard:'Eigene Übersicht',tasks:'Aufgaben',calendar:'Kalender',learning:'Lernhub',knowledge:'Wissenshub',chat:'Chat',feedback:'Feedback',files:'Dateien',modules:'Eigene Module',builder:'Modulbaukasten',controlling:'Controlling',access:'Mitarbeiterzugänge'};
export const standardPages=['dashboard','tasks','calendar','learning','knowledge','chat','feedback'];
export const defaultPages=role=>role==='admin'?Object.keys(teamPages):role==='studio_manager'?[...standardPages,'files','modules','builder']:[...standardPages];
export const feedbackCategories={organisation:'Organisation & Abläufe',geraete:'Geräte & Sicherheit',technik:'Technik & IT',marketing:'Marketing',idee:'Idee & Verbesserung',sonstiges:'Sonstiges'};
export const feedbackStatuses={open:'Offen',in_progress:'In Bearbeitung',done:'Erledigt'};
export const communicationMigration='https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/007_chat_feedback_access.sql';
export function communicationError(error){
 if(['PGRST202','PGRST205','42P01'].includes(error?.code)||error?.status===404)return 'Die Erweiterung 007 für Chat, Feedback und Bereichsrechte ist noch nicht eingerichtet.';
 if(error?.code==='42501')return 'Dieser Bereich oder Vorgang ist für dein Konto nicht freigegeben. Bitte wende dich an Patrick Walter.';
 if(error?.code==='40001')return 'Der Stand wurde inzwischen geändert. Bitte aktualisieren und die Änderung erneut prüfen.';
 if(error?.message?.includes('Wait one second'))return 'Bitte warte eine Sekunde vor der nächsten Nachricht.';
 if(error?.code==='23514')return 'Bitte prüfe deine Eingaben und die gewählten Studios oder Zuständigkeiten.';
 return 'Die Serverabfrage oder Speicherung konnte nicht bestätigt werden. Bitte erneut versuchen.';
}
export async function communicationRpc(client,name,args,signal){const query=client.rpc(name,args);const result=await(signal?query.abortSignal(signal):query);if(result.error)throw {...result.error,status:result.status};return result.data;}
export function useTeamScope(client,profile){
 const key=profile?`${profile.id}|${profile.role}`:'';const[state,setState]=useState(null),[reload,setReload]=useState(0);
 useEffect(()=>{
  if(!client||!profile){setState(null);return;}let controller,live=true;
  async function load(){controller?.abort();const current=controller=new AbortController();try{const data=await communicationRpc(client,'team_access_context',{},current.signal);if(!Array.isArray(data?.pages))throw new Error('Invalid access context');if(!current.signal.aborted&&live)setState({key,pages:data.pages,canDesign:data.can_design===true,missing:false,error:''});}catch(e){if(current.signal.aborted||!live)return;if(e.status===404||['PGRST202','PGRST205'].includes(e.code))setState({key,pages:defaultPages(profile.role),canDesign:profile.role==='admin',missing:true,error:''});else setState({key,pages:[],canDesign:false,missing:false,error:communicationError(e)});}}
  const focus=()=>{if(document.visibilityState==='visible')void load();};void load();const timer=setInterval(focus,30000);window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{live=false;controller?.abort();clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[client,key,reload]);
 return {...(state?.key===key?state:{pages:[],canDesign:false,missing:false,error:''}),loading:!!profile&&state?.key!==key,refresh:()=>setReload(n=>n+1)};
}
export function useTeamChatInbox(client,profile,enabled){
 const key=profile?.id||'';const[state,setState]=useState(null),[reload,setReload]=useState(0);
 useEffect(()=>{
  if(!client||!key||!enabled){setState(null);return;}let controller,live=true;
  async function load(){controller?.abort();const current=controller=new AbortController();try{const data=await communicationRpc(client,'team_chat_inbox',{},current.signal);if(!Array.isArray(data?.channels)||!Number.isSafeInteger(data.unread)||data.unread<0)throw new Error('Invalid inbox');if(live&&!current.signal.aborted)setState({key,...data,error:''});}catch(e){if(live&&!current.signal.aborted)setState(previous=>({key,channels:e.code==='42501'?[]:previous?.key===key?previous.channels:[],unread:e.code==='42501'?0:previous?.key===key?previous.unread:0,error:communicationError(e)}));}}
  const focus=()=>{if(document.visibilityState==='visible')void load();};void load();const timer=setInterval(focus,15000);window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{live=false;controller?.abort();clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[client,key,enabled,reload]);
 return {...(state?.key===key&&enabled?state:{channels:[],unread:0,error:''}),loading:enabled&&state?.key!==key,refresh:()=>setReload(n=>n+1)};
}
