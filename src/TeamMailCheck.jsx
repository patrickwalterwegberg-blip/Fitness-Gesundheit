import React,{useEffect,useRef,useState} from 'react';
import {CheckCircle2,Clock,Mail,RefreshCw,ShieldCheck} from 'lucide-react';
import ScheduleDialog from './ScheduleDialog';
import {usePermissions} from './team-permissions';
import {explainAccessError,invokeTeamAccess,mailReference} from './team-access-client';
import './team-mail.css';
const when=value=>value?new Date(value).toLocaleString('de-DE',{timeZone:'Europe/Berlin',dateStyle:'short',timeStyle:'short'}):'Nicht vermerkt';
async function checkedMember(client,member,signal){
 const query=Array.from(member.email?.trim()||'').slice(0,200).join('');
 if(!query||!member.id)throw {code:'mail_check_unavailable'};
 for(let page=0;page<=10000;page++){
  signal.throwIfAborted();
  const r=await client.rpc('admin_team_directory',{p_page:page,p_size:100,p_query:query,p_role:'',p_status:'all',p_studio:null}).abortSignal(signal);
  signal.throwIfAborted();
  if(r.error)throw r.error;
  if(!Array.isArray(r.data?.members)||!Number.isSafeInteger(r.data.total)||r.data.total<0)throw {code:'mail_check_unavailable'};
  const found=r.data.members.find(m=>m.id===member.id);
  if(found){
   if(typeof found.active!=='boolean'||!Array.isArray(found.studio_ids)||typeof found.email!=='string'||!found.email.trim())throw {code:'mail_check_unavailable'};
   return found;
  }
  if(!r.data.members.length||(page+1)*100>=r.data.total)break;
 }
 throw {code:'mail_check_unavailable'};
}
export default function TeamMailCheck({client,member,onClose,onSent}){
 const {can}=usePermissions(),[data,setData]=useState(null),[loading,setLoading]=useState(true),[reload,setReload]=useState(0),[error,setError]=useState(''),[sending,setSending]=useState(false),[notice,setNotice]=useState(''),[cooldown,setCooldown]=useState(0);const live=useRef(true),operation=useRef(false);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(n=>Math.max(0,n-1)),1000);return()=>clearTimeout(timer);},[cooldown]);
 useEffect(()=>{const controller=new AbortController();setData(null);setError('');setLoading(true);checkedMember(client,member,controller.signal).then(found=>{if(!controller.signal.aborted)setData({member:found,checkedAt:new Date().toISOString()});}).catch(e=>{if(!controller.signal.aborted)setError(explainAccessError(e));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[client,member.id,member.email,reload]);
 const person=data?.member,hasStudio=person&&(person.role==='admin'||person.studio_ids.length>0),maySend=can('users.login')&&person?.active&&hasStudio&&!loading;
 async function send(){if(operation.current||!maySend||cooldown)return;operation.current=true;setSending(true);setError('');setNotice('');try{const r=await invokeTeamAccess(client,{action:'send_login',userId:person.id});if(live.current){const reference=mailReference(r.requestId);setNotice('Anmeldelink beim E-Mail-Dienst angefordert. Die Zustellung ist damit noch nicht bestätigt.'+(reference?` Vorgangsnummer: ${reference}`:''));setCooldown(60);onSent?.();}}catch(e){if(live.current){setError(explainAccessError(e));if(e.reason==='rate_limited'||e.code==='login_target_unavailable')setCooldown(60);}}finally{operation.current=false;if(live.current)setSending(false);}}
 return <ScheduleDialog title="E-Mail-Zugang prüfen" onClose={onClose} busy={sending} error={error}><section className="team-mail-check"><p>Prüfe Konto, Freischaltung und Studiozuordnung. Einen Anmeldelink kannst du anschließend gezielt anfordern.</p>{loading?<p role="status">Zugang wird geprüft …</p>:person&&<><div className="mail-check-identity"><strong>{person.full_name}</strong><span>{person.email}</span><small>Geprüft am {when(data.checkedAt)}</small></div><ul className="mail-check-results"><li><CheckCircle2 size={18}/><div><strong>Konto im Anmeldedienst vorhanden</strong><p>Die aktuelle Mitarbeiterliste bestätigt den Kontodatensatz.</p></div></li><li><ShieldCheck size={18}/><div><strong>{person.active?'Teamhub-Zugang freigeschaltet':'Teamhub-Zugang gesperrt'}</strong><p>{person.active?'Das Mitarbeiterprofil ist aktiv.':'Die Geschäftsführung muss die Freischaltung prüfen.'}</p></div></li><li><ShieldCheck size={18}/><div><strong>{hasStudio?'Studiofreigabe vorhanden':'Keine Studiozuordnung vorhanden'}</strong><p>{person.role==='admin'?'Admin / Geschäftsleitung hat Zugriff auf alle Studios.':`${person.studio_ids.length} freigegebene Studiozuordnung(en)`}</p></div></li><li><Clock size={18}/><div><strong>Einladung und Anmeldung</strong><p>Einladung im Anmeldedienst: {when(person.invited_at)}<br/>Letzte Anmeldung: {when(person.last_sign_in_at)}</p><small>Eine vermerkte Einladung bestätigt noch keine E-Mail-Zustellung.</small></div></li><li className="mail-check-unknown"><Mail size={18}/><div><strong>Versand und Zustellung noch nicht geprüft</strong><p>Die Kontoprüfung versendet keine Mail. Auch eine angenommene Link-Anfrage belegt keine Zustellung. Bei ausbleibender Mail prüft die Geschäftsführung das Auth-Protokoll und den Mailanbieter.</p></div></li></ul></>}{notice&&<p className="team-notice" role="status">{notice}</p>}<div className="button-group"><button className="button button-secondary" disabled={loading||sending} onClick={()=>setReload(n=>n+1)}><RefreshCw size={15}/>Zugang erneut prüfen</button>{person&&<button className="button" disabled={!maySend||sending||cooldown>0} onClick={send}><Mail size={15}/>{sending?'Wird angefordert …':cooldown?`Erneut anfordern in ${cooldown} s`:'Anmeldelink für geprüften Zugang anfordern'}</button>}</div></section></ScheduleDialog>;
}
