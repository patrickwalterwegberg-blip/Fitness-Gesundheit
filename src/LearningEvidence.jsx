import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Activity,Printer,RefreshCw} from 'lucide-react';
import ScheduleDialog from './ScheduleDialog';
import './learning-evidence.css';

const migration='https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/016_learning_evidence.sql';
const editor='https://supabase.com/dashboard/project/ftcurcqduzrxsvkujfql/sql/new';
const validDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const text=value=>typeof value==='string'&&value.trim().length>0;
function validEvidence(value,assignmentId){
 return value?.version===1&&value.assignment_id===assignmentId&&text(value.learner_name)&&text(value.studio_name)&&text(value.course_title)
  &&(value.course_revision===null||Number.isInteger(value.course_revision)&&value.course_revision>0)
  &&Number.isInteger(value.lesson_count)&&value.lesson_count>0&&value.lesson_count<=500&&value.lessons_read===value.lesson_count
  &&value.knowledge_confirmed===true&&typeof value.requires_practice==='boolean'&&typeof value.practice_confirmed==='boolean'
  &&(value.practice_confirmed_at===null||validDate(value.practice_confirmed_at))
  &&(!value.requires_practice||value.practice_confirmed&&validDate(value.practice_confirmed_at))&&validDate(value.checked_at);
}
function evidenceError(error){
 if(['PGRST202','42883'].includes(error?.code))return {missing:true,message:'Die Erweiterung 016 für interne Lernnachweise ist noch nicht eingerichtet.'};
 if(error?.code==='42501')return {message:'Dieser Lernnachweis ist für deinen Zugang nicht freigegeben. Bitte wende dich an deine Leitung.'};
 if(error?.code==='23514')return {message:'Der Kurs ist noch nicht vollständig abgeschlossen. Prüfe Lesebestätigungen, Wissen und erforderliche Praxis.'};
 if(error?.invalid)return {message:'Der Server hat keinen gültigen vollständigen Lernnachweis geliefert. Bitte erneut prüfen.'};
 return {message:'Der Lernnachweis konnte nicht bestätigt werden. Bitte erneut versuchen.'};
}
const stamp=value=>new Date(value).toLocaleString('de-DE',{timeZone:'Europe/Berlin',dateStyle:'medium',timeStyle:'short'});
function EvidencePaper({proof}){
 return <article className="learning-evidence-paper"><header><div className="learning-evidence-brand"><Activity size={22}/><span>FITNESS & GESUNDHEIT · TEAMHUB</span></div><p className="eyebrow">DEIN GESPEICHERTER LERNSTAND</p><h3>Interner Lernnachweis</h3><p className="learning-evidence-course">{proof.course_title}</p></header><dl className="learning-evidence-facts"><div><dt>Mitarbeiter</dt><dd>{proof.learner_name}</dd></div><div><dt>Studio</dt><dd>{proof.studio_name}</dd></div><div><dt>Kursversion</dt><dd>{proof.course_revision===null?'Nicht dokumentiert':proof.course_revision}</dd></div><div><dt>Nachweisstand</dt><dd>{stamp(proof.checked_at)} · Europe/Berlin</dd></div></dl><section className="learning-evidence-results" aria-label="Bestätigter Lernstand"><h4>Alle erforderlichen Lernschritte erfüllt</h4><p><strong>Lesebestätigungen</strong><span>{proof.lessons_read}/{proof.lesson_count} Lektionen bestätigt · Selbstauskunft</span></p><p><strong>Wissen</strong><span>Bestätigt</span></p><p><strong>Praxiseinweisung</strong><span>{proof.requires_practice?`Bestätigt · ${stamp(proof.practice_confirmed_at)}`:'Nicht erforderlich'}</span></p></section><footer><p>Referenz: <span className="learning-evidence-reference">{proof.assignment_id}</span></p><p>Dieses Dokument zeigt den zum Nachweisstand gespeicherten internen Lernstand. Namen und Kurstitel entsprechen den aktuellen Angaben. Lesebestätigungen sind Selbstauskünfte; Wissen und Praxis werden getrennt bestätigt.</p></footer></article>;
}
export default function LearningEvidence({client,profileId,assignmentId,admin=false,onClose}){
 const [proof,setProof]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(null),[printRequest,setPrintRequest]=useState(0);
 const live=useRef(false),request=useRef(null),sequence=useRef(0);
 async function load(print=false){
  if(request.current)return;
  const controller=new AbortController(),token=++sequence.current;request.current=controller;
  setLoading(true);setProof(null);setError(null);setPrintRequest(0);
  try{
   const result=await client.rpc('learning_evidence',{p_assignment:assignmentId}).abortSignal(controller.signal);
   if(controller.signal.aborted||!live.current||token!==sequence.current)return;
   if(result.error)throw result.error;
   if(!validEvidence(result.data,assignmentId))throw {invalid:true};
   setProof(result.data);if(print)setPrintRequest(token);
  }catch(e){if(!controller.signal.aborted&&live.current&&token===sequence.current)setError(evidenceError(e));}
  finally{if(request.current===controller)request.current=null;if(!controller.signal.aborted&&live.current&&token===sequence.current)setLoading(false);}
 }
 useEffect(()=>{
  live.current=true;void load();
  return()=>{live.current=false;sequence.current++;request.current?.abort();request.current=null;};
 },[client,profileId,assignmentId]);
 const printable=!!proof&&!loading&&!!printRequest;
 useEffect(()=>{
  if(!printable)return;
  document.body.classList.add('printing-learning-evidence');
  return()=>document.body.classList.remove('printing-learning-evidence');
 },[printable]);
 useEffect(()=>{
  if(!proof||loading||!printRequest)return;
  const finish=()=>{if(live.current)setPrintRequest(0);};
  window.addEventListener('afterprint',finish);
  const frame=requestAnimationFrame(()=>{
   if(!live.current||sequence.current!==printRequest)return;
   try{window.print();}catch{setError({message:'Der Druckdialog konnte nicht geöffnet werden. Bitte versuche es erneut.'});finish();}
  });
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('afterprint',finish);};
 },[proof,loading,printRequest]);
 return <><ScheduleDialog title="Interner Lernnachweis" className="learning-evidence-dialog" wide onClose={onClose} closeLabel="Lernnachweis schließen" error={error?.message}>
  {loading?<p role="status">Dein Lernnachweis wird auf dem Server geprüft …</p>:proof?<EvidencePaper proof={proof}/>:<p className="small-muted">Ein Lernnachweis ist erst nach allen erforderlichen Lernschritten verfügbar.</p>}
  {error?.missing&&(admin?<p className="small-muted"><a href={migration} target="_blank" rel="noreferrer">016_learning_evidence.sql öffnen</a> und im <a href={editor} target="_blank" rel="noreferrer">Supabase SQL Editor</a> ausführen. Danach erneut prüfen.</p>:<p className="small-muted">Bitte wende dich für die Einrichtung an deine Leitung.</p>)}
  <div className="learning-evidence-actions"><button type="button" className="button button-secondary" disabled={loading||!!printRequest} onClick={()=>void load()}><RefreshCw size={15}/>Nachweis erneut prüfen</button><button type="button" className="button" disabled={loading||!proof||!!printRequest} onClick={()=>void load(true)}><Printer size={15}/>Drucken / als PDF speichern</button></div>
  <p className="small-muted">Vor jedem Druck wird der Lernstand erneut geprüft. Im Druckdialog kannst du je nach Gerät „Als PDF speichern“ wählen.</p>
 </ScheduleDialog>{printable&&createPortal(<div className="learning-evidence-print-root"><EvidencePaper proof={proof}/></div>,document.body)}</>;
}
