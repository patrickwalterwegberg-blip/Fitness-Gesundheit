import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Activity, ArrowLeft, ArrowRight, Bell, Building2, CheckCircle2, ExternalLink, KeyRound, LoaderCircle, MessageCircle, Plus, RefreshCw, Save, Send, ShieldCheck, X } from 'lucide-react';
import { backendConfig } from './backend-config';
import { berlinDay } from './clock';
import TeamAdministration from './TeamAdministration';
import TeamAccessManagement from './TeamAccessManagement';
import TeamKnowledge from './TeamKnowledge';
import TeamDashboard, { TeamCalendar } from './TeamPilot';
import TeamSchedule,{ScheduleSetup} from './TeamSchedule';
import ScheduleDialog from './ScheduleDialog';
import {repeatLabel,repeats,scheduleError} from './schedule-model';
import TeamAssistant from './TeamAssistant';
import TeamAcademy from './TeamAcademy';
import TeamChat,{CommunicationSetup} from './TeamChat';
import TeamFeedback from './TeamFeedback';
import {useTeamScope,useTeamChatInbox,teamPages} from './team-communication';
import TeamLogin,{TeamNewPassword} from './TeamLogin';
import './team-workspace.css';
import TeamShell from './TeamShell';
import {PermissionContext,functionCatalog,permissionDefaults,usePermissions} from './team-permissions';

const roles = { admin: 'Admin / Geschäftsleitung', studio_manager: 'Studioleitung', employee: 'Mitarbeiter' };
const statuses = { open: 'Offen', in_progress: 'In Bearbeitung', done: 'Erledigt' };
const columns = '*,studio:studios(name),assignee:profiles!tasks_assignee_id_fkey(full_name)';
const dateLabel = value => new Date(value + 'T12:00:00').toLocaleDateString('de-DE');
const pageSize = 50;
const taskPresets = {open:'Offene Aufgaben',overdue:'Überfällig',today:'Heute fällig',done:'Erledigte Aufgaben'};
function validTaskDay(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const parsed=new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}
function taskReadError(error){
  if(error?.code==='42501')return 'Du darfst diese Aufgaben nicht mehr ansehen. Bitte wende dich an die Studioleitung.';
  return 'Deine Aufgaben konnten nicht geladen werden. Prüfe deine Verbindung und versuche es erneut.';
}
function explain(error) {
  if (error?.code === '42501') return 'Deine Berechtigung reicht für diese Änderung nicht aus. Bitte wende dich an die Studioleitung.';
  if (error?.code === '23514') return 'Bitte prüfe die Angaben und ob die verantwortliche Person dem Standort zugeordnet ist.';
  if (error?.message?.includes('Failed to fetch')) return 'Der Datenbankdienst ist gerade nicht erreichbar. Deine Änderung wurde nicht bestätigt.';
  return 'Die Aktion konnte nicht bestätigt werden. Bitte prüfe die Verbindung und versuche es erneut.';
}

export default function TeamWorkspace({ onDemo, config = backendConfig(), initialArea = 'dashboard' }) {
  // Capture intent before the SDK consumes and removes the callback fragment.
  const recoveryIntent=useRef(new URLSearchParams(location.hash.slice(1)).get('type')==='recovery'&&new URLSearchParams(location.hash.slice(1)).has('access_token'));
  const recoveryUser=useRef(null);
  const recoveryStorageKey=`fg-team-password-recovery:${config.url||'unconfigured'}`;
  const [passwordState,setPasswordState]=useState(()=>{let marker;try{marker=JSON.parse(sessionStorage.getItem(recoveryStorageKey)||'null');}catch{}return recoveryIntent.current||(marker?.userId&&Date.now()-marker.at>=0&&Date.now()-marker.at<15*60*1000)?'checking':'none';});
  const [passwordRequest,setPasswordRequest]=useState(false);
  const [loginMode,setLoginMode]=useState('password');
  const passwordOperation=useRef(false);
  const logoutOperation=useRef(false);
  const [loggingOut,setLoggingOut]=useState(false);
  const client = useMemo(() => {
    if (!config.url || !config.publishableKey) return null;
    try { return createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }); }
    catch { return null; }
  }, [config.url, config.publishableKey]);
  const [session, setSession] = useState(null);
  const [area, setArea] = useState(initialArea);
  const [knowledgeTarget,setKnowledgeTarget]=useState(null);
  const [learningView,setLearningView]=useState('courses');
  const [notificationTarget,setNotificationTarget]=useState(null);
  const [extensionEntity, setExtensionEntity] = useState(null);
  const [authLoading, setAuthLoading] = useState(!!client);
  const [profile, setProfile] = useState(null);
  const [sites, setSites] = useState([]);
  const [people, setPeople] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('open');
  const [site, setSite] = useState('all');
  const [taskSelection,setTaskSelection]=useState(null);
  const [taskReferenceDay,setTaskReferenceDay]=useState(null);
  const [taskLoadError,setTaskLoadError]=useState(false);
  const [taskReturn,setTaskReturn]=useState(null);
  const taskOrigin=useRef(null),taskDaySnapshot=useRef(null),taskHeading=useRef(null),focusTaskHeading=useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const request = useRef(0);
  const detailRequest=useRef(null),taskContextRef=useRef(null),taskViewRef=useRef(null);
  const taskOperation=useRef(false);
  const activeUserId = useRef(null);
  activeUserId.current = session?.user.id || null;
  const scope=useTeamScope(client,passwordState==='none'?profile:null);
  const functionsReady=scope.version>=9;
  const functionCan=(key,legacy=permissionDefaults(profile?.role).includes(key))=>functionsReady?scope.capabilities.includes(key)&&scope.pages.includes(functionCatalog.find(c=>c.key===key)?.page):legacy;
  const permissionStamp=functionsReady?scope.capabilities.join('|'):'';
  const taskScopeStamp=JSON.stringify([profile?.id,profile?.role,scope.loading,scope.pages,permissionStamp,scope.error]);
  const previousTaskScope=useRef(null);
  const allowedAreas=Object.keys(teamPages).filter(id=>scope.pages.includes(id)&&(id!=='access'||functionCan('users.view',profile?.role==='admin'))&&(id!=='controlling'||functionCan('controlling.view',profile?.role==='admin'))&&(id!=='builder'||scope.canDesign||profile?.role==='admin'));
  if(allowedAreas.includes('knowledge')&&functionCan('knowledge.read',true))allowedAreas.push('assistant');
  const taskContextKey=JSON.stringify([session?.user.id,taskScopeStamp,passwordState,area]);
  if(taskContextRef.current?.key!==taskContextKey){
    taskContextRef.current={key:taskContextKey,generation:(taskContextRef.current?.generation||0)+1,userId:session?.user.id,allowed:!!profile&&!scope.loading&&!scope.error&&passwordState==='none'&&allowedAreas.includes('tasks')};
  }
  const taskContext=taskContextRef.current;
  taskViewRef.current={area,selectedId:selected?.id,editorId:editor?.id};
  const chatEnabled=!!profile&&passwordState==='none'&&!scope.loading&&allowedAreas.includes('chat');
  const inbox=useTeamChatInbox(client,profile,chatEnabled);
  useEffect(()=>{if(profile&&!scope.loading&&!allowedAreas.includes(area)){setArea(allowedAreas[0]||'blocked');setEditor(null);setSelected(null);}},[profile?.id,scope.loading,allowedAreas.join('|'),area]);
  useEffect(()=>{
    if(previousTaskScope.current&&previousTaskScope.current!==taskScopeStamp){
      request.current++;setTasks([]);setTotal(0);setComments([]);setSelected(null);setEditor(null);
      setTaskSelection(null);setTaskReferenceDay(null);setTaskReturn(null);setTaskLoadError(false);
      setFilter('open');setSite('all');setPage(0);taskOrigin.current=null;taskDaySnapshot.current=null;focusTaskHeading.current=false;setCommentsLoading(false);
    }
    previousTaskScope.current=taskScopeStamp;
  },[taskScopeStamp]);
  useEffect(()=>{
    if(area==='tasks'&&focusTaskHeading.current&&taskHeading.current){
      focusTaskHeading.current=false;taskHeading.current.focus({preventScroll:true});
      const headerHeight=document.querySelector('.team-shell-topbar')?.getBoundingClientRect().height||0;
      taskHeading.current.style.scrollMarginTop=`${Math.ceil(headerHeight)+16}px`;
      taskHeading.current.scrollIntoView({block:'start',behavior:'instant'});
    }
  });
  useEffect(()=>()=>{detailRequest.current?.abort();detailRequest.current=null;},[taskContextKey]);
  useEffect(()=>{
    if(area!=='tasks'||!session?.user.id||passwordState!=='none')return;
    const revalidate=()=>{if(document.visibilityState==='visible')setRefresh(n=>n+1);};
    window.addEventListener('focus',revalidate);document.addEventListener('visibilitychange',revalidate);
    return()=>{window.removeEventListener('focus',revalidate);document.removeEventListener('visibilitychange',revalidate);};
  },[area,session?.user.id,passwordState]);

  function rememberRecovery(userId){try{sessionStorage.setItem(recoveryStorageKey,JSON.stringify({userId,at:Date.now()}));}catch{/* Storage may be unavailable; the current verified flow still works. */}}
  function forgetRecovery(){try{sessionStorage.removeItem(recoveryStorageKey);}catch{}}
  function clearTaskSelection(){setTaskSelection(null);setTaskReferenceDay(null);setTaskReturn(null);taskOrigin.current=null;taskDaySnapshot.current=null;focusTaskHeading.current=false;}
  function currentTaskContext(context){return context.allowed&&taskContextRef.current===context&&activeUserId.current===context.userId;}
  function openTaskDetail(task){
    if(!currentTaskContext(taskContext))return;
    detailRequest.current?.abort();detailRequest.current=null;
    if(taskSelection){setFilter('open');setSite('all');setPage(0);}
    clearTaskSelection();setArea('tasks');setSelected(task);setEditor(null);
  }
  async function prepareTaskDetail(id,externalSignal){
    if(!currentTaskContext(taskContext)||externalSignal?.aborted)throw {code:'42501'};
    detailRequest.current?.abort();
    const controller=new AbortController();detailRequest.current=controller;
    const abort=()=>controller.abort();externalSignal?.addEventListener('abort',abort,{once:true});
    const current=()=>!controller.signal.aborted&&!externalSignal?.aborted&&detailRequest.current===controller&&currentTaskContext(taskContext);
    try{
      const result=await client.from('tasks').select(columns).eq('id',id).single().abortSignal(controller.signal);
      if(!current())return null;
      if(result.error)throw result.error;
      if(!result.data?.id)throw {code:'42501'};
      // Notifications may commit only after another awaited request marks them read.
      return()=>{if(current())openTaskDetail(result.data);};
    }finally{externalSignal?.removeEventListener('abort',abort);}
  }
  async function loadTaskDetail(id){const commit=await prepareTaskDetail(id);commit?.();}
  function clearPrivateViews(){request.current++;detailRequest.current?.abort();detailRequest.current=null;setProfile(null);setTasks([]);setTotal(0);setComments([]);setSelected(null);setEditor(null);setPeople([]);setSites([]);setMemberships([]);setArea(initialArea);setExtensionEntity(null);setNotificationTarget(null);setKnowledgeTarget(null);setLearningView('courses');setPage(0);setSite('all');setFilter('open');clearTaskSelection();setTaskLoadError(false);setPasswordRequest(false);}
  function openDashboardArea(id,options){
    if(!allowedAreas.includes(id))return;
    setNotificationTarget(null);
    if(id==='tasks'){
      if(options&&Object.hasOwn(taskPresets,options.taskPreset)&&validTaskDay(options.taskDay)){
        request.current++;setTasks([]);setTotal(0);setTaskLoadError(false);setError('');setNotice('');
        setTaskSelection({preset:options.taskPreset,day:options.taskDay});setTaskReferenceDay(options.taskDay);
        taskDaySnapshot.current={refresh,day:options.taskDay};
        taskOrigin.current={preset:options.taskPreset,scrollY:Number.isFinite(options.returnScrollY)?Math.max(0,options.returnScrollY):0};
        setTaskReturn(null);setFilter(options.taskPreset==='done'?'done':'not_done');setSite('all');setPage(0);focusTaskHeading.current=true;
      }else{clearTaskSelection();setFilter('open');setPage(0);}
    }
    if(id==='learning'){setLearningView(options?.view||'courses');setNotificationTarget(options?.assignmentId?{kind:'learning',assignment_id:options.assignmentId}:null);}
    if(id==='knowledge')setKnowledgeTarget(options?.documentId||null);
    if(id==='feedback'&&options?.action==='create')setNotificationTarget({kind:'feedback',action:'create'});
    setArea(id);setSelected(null);setEditor(null);
  }

  useEffect(() => {
    if (!client) return;
    let live = true;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, current) => {
      if (!live) return;
      const currentId = current?.user.id || null;
      const changedUser = activeUserId.current !== currentId;
      activeUserId.current = currentId;
      setSession(current); setAuthLoading(false);
      if (!current || changedUser || _event==='PASSWORD_RECOVERY') clearPrivateViews();
      if(_event==='PASSWORD_RECOVERY'&&currentId){recoveryUser.current=currentId;recoveryIntent.current=true;rememberRecovery(currentId);setPasswordState('ready');setError('');setNotice('');}
      else if(!current){recoveryUser.current=null;forgetRecovery();setPasswordState('none');}
      else if(recoveryUser.current&&recoveryUser.current!==currentId){recoveryUser.current=null;forgetRecovery();setPasswordState('invalid');}
    });
    const callbackError = new URLSearchParams(location.hash.slice(1)).has('error');
    (async()=>{
      const {error:initError}=await client.auth.initialize();
      const {data,error:authError}=await client.auth.getSession();
      // The SDK queues PASSWORD_RECOVERY after initialization. Let that trusted
      // event arrive before deciding whether this callback was verified.
      await new Promise(resolve=>setTimeout(resolve,0));
      if(!live)return;
      setSession(data.session);setAuthLoading(false);
      if(data.session||callbackError||recoveryIntent.current){const url=new URL(location.href);if(data.session)url.searchParams.delete('team');url.hash='workspace';history.replaceState(null,'',url.href);}
      if(recoveryIntent.current&&(initError||authError||!recoveryUser.current)){recoveryUser.current=null;forgetRecovery();setPasswordState('invalid');}
      else if(!recoveryIntent.current&&data.session){
        let marker;try{marker=JSON.parse(sessionStorage.getItem(recoveryStorageKey)||'null');}catch{}
        if(marker?.userId===data.session.user.id&&Date.now()-marker.at>=0&&Date.now()-marker.at<15*60*1000){
          // Only restore the UI for the same, server-verified account. This
          // marker contains no credentials and is never an authorization grant.
          setPasswordState('checking');clearPrivateViews();
          const checked=await client.auth.getUser();
          if(!live)return;
          if(!checked.error&&checked.data.user?.id===marker.userId&&activeUserId.current===marker.userId){recoveryUser.current=marker.userId;setPasswordState('ready');}
          else{forgetRecovery();setPasswordState('invalid');}
        }else{forgetRecovery();setPasswordState('none');}
      }
      else if(!data.session&&!recoveryIntent.current)setPasswordState('none');
      if(initError||authError||callbackError)setError('Der Anmeldelink ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.');
    })().catch(()=>{if(live){setAuthLoading(false);if(recoveryIntent.current)setPasswordState('invalid');setError('Die Anmeldung konnte nicht geprüft werden. Bitte lade die Seite erneut.');}});
    return () => { live = false; subscription.unsubscribe(); void client.auth.stopAutoRefresh(); };
  }, [client]);

  useEffect(() => {
    if (!client || !session?.user.id || passwordState!=='none') return;
    const version = ++request.current;
    const controller = new AbortController();
    setLoading(true); setError('');setTaskLoadError(false);setTasks([]);setTotal(0);
    (async () => {
      try {
        const result = await client.from('profiles').select('id,full_name,role,active').eq('id', session.user.id).maybeSingle().abortSignal(controller.signal);
        if (result.error) throw result.error;
        if (version !== request.current || controller.signal.aborted) return;
        if (!result.data?.active) { setProfile(null); setTasks([]);setTotal(0);setCommentsLoading(false);clearTaskSelection();setSites([]); setPeople([]); setMemberships([]); setComments([]); setSelected(null); setEditor(null); return; }
        setProfile(result.data);
        if(scope.loading)return;
        let referenceDay=taskSelection?.day;
        if(taskSelection&&['today','overdue'].includes(taskSelection.preset)){
          // Refreshes, focus revalidation and task mutations ask the server for
          // a new Berlin day. Device time is never the source.
          if(taskDaySnapshot.current?.refresh===refresh)referenceDay=taskDaySnapshot.current.day;
          else{
            const dashboard=await client.rpc('my_team_dashboard').abortSignal(controller.signal);
            if(dashboard.error)throw dashboard.error;
            if(!validTaskDay(dashboard.data?.today))throw new Error('Invalid dashboard date');
            if(version!==request.current||controller.signal.aborted)return;
            referenceDay=dashboard.data.today;taskDaySnapshot.current={refresh,day:referenceDay};
          }
        }
        let query = client.from('tasks').select(columns, { count: 'exact' });
        if(taskSelection)query=query.eq('assignee_id',session.user.id);
        if (site !== 'all') query = query.eq('studio_id', site);
        if(filter==='not_done')query=query.neq('status','done');
        else if (filter !== 'all') query = query.eq('status', filter);
        if(taskSelection?.preset==='today')query=query.eq('due_date',referenceDay);
        if(taskSelection?.preset==='overdue')query=query.lt('due_date',referenceDay);
        query=query.order('due_date').order('id').range(page * pageSize, (page + 1) * pageSize - 1);
        const detailView=taskViewRef.current;
        const detailId=detailView?.area==='tasks'?(detailView.editorId||detailView.selectedId):null;
        const [taskResult, siteResult, peopleResult, membershipResult, detailResult] = await Promise.all([
          allowedAreas.includes('tasks')?query.abortSignal(controller.signal):Promise.resolve({data:[],count:0}),
          client.from('studios').select('id,name').order('name').abortSignal(controller.signal),
          client.from('profiles').select('id,full_name,role,active').eq('active', true).abortSignal(controller.signal),
          client.from('studio_memberships').select('user_id,studio_id').abortSignal(controller.signal),
          detailId?client.from('tasks').select(columns).eq('id',detailId).maybeSingle().abortSignal(controller.signal):Promise.resolve(null),
        ]);
        if (version !== request.current || controller.signal.aborted) return;
        if(detailResult){
          const denied=detailResult.error&&(detailResult.error.code==='42501'||[401,403].includes(detailResult.status)||[401,403].includes(detailResult.error.status));
          if(denied||!detailResult.error&&!detailResult.data){
            if(taskViewRef.current?.selectedId===detailId){setSelected(null);setComments([]);setCommentsLoading(false);}
            if(taskViewRef.current?.editorId===detailId)setEditor(null);
          }else if(!detailResult.error&&taskViewRef.current?.selectedId===detailId)setSelected(current=>current?.id===detailId?detailResult.data:current);
          if(detailResult.error)throw detailResult.error;
        }
        for (const r of [taskResult, siteResult, peopleResult, membershipResult]) if (r.error) throw r.error;
        setTasks(taskResult.data || []); setTotal(taskResult.count || 0);setTaskReferenceDay(referenceDay||null); setSites(siteResult.data || []); setPeople(peopleResult.data || []); setMemberships(membershipResult.data || []);
      } catch (e) { if (!controller.signal.aborted && version === request.current) { setError(taskReadError(e));setTaskLoadError(true); setTasks([]);setTotal(0); } }
      finally { if (version === request.current && !controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [client, session?.user.id, filter, site, page, refresh,passwordState,taskSelection,taskScopeStamp]);

  useEffect(() => {
    if (!client || !selected || !currentTaskContext(taskContext)||area!=='tasks'||editor) { setComments([]);setCommentsLoading(false); return; }
    const controller = new AbortController();
    const selectedId=selected.id;
    setComments([]); setCommentsLoading(true);
    client.from('task_comments').select('id,body,created_at,author:profiles!task_comments_author_id_fkey(full_name)').eq('task_id', selected.id).order('created_at').abortSignal(controller.signal).then(({ data, error: e }) => {
      if (controller.signal.aborted||!currentTaskContext(taskContext)||taskViewRef.current?.area!=='tasks'||taskViewRef.current?.selectedId!==selectedId||taskViewRef.current?.editorId) return;
      if (e) setError(explain(e)); else setComments(data || []);
      setCommentsLoading(false);
    });
    return () => controller.abort();
  }, [client, selected?.id, session?.user.id, refresh,taskContextKey,!!editor]);

  const canManage = functionCan('tasks.team',profile?.role==='admin'||profile?.role==='studio_manager');
  const scheduleReady=scope.version>=10;
  const canPrivateTask=scheduleReady&&functionCan('tasks.private'),canCreateTask=functionCan('tasks.create',canManage),canEditTask=functionCan('tasks.edit',canManage)||functionCan('tasks.assign',canManage);
  async function signOut() {
    if(logoutOperation.current)return false;
    logoutOperation.current=true;setLoggingOut(true);
    try{
    const previousUser=activeUserId.current;
    setError(''); const {error:e}=await client.auth.signOut({scope:'local'});
    if(activeUserId.current&&activeUserId.current!==previousUser)return false;
    if(e){const checked=await client.auth.getSession();if(checked.data.session){setError('Die Abmeldung konnte nicht bestätigt werden. Bitte erneut versuchen.');return false;}setError('Du bist auf diesem Gerät abgemeldet. Die serverseitige Abmeldung konnte nicht bestätigt werden.');}
    recoveryUser.current=null;recoveryIntent.current=false;forgetRecovery();clearPrivateViews();setPasswordState('none');setSession(null);setLoginMode('password');setNotice('Du bist auf diesem Gerät abgemeldet.');window.scrollTo({top:0,behavior:'instant'});return true;
    }catch{setError('Die Abmeldung konnte nicht bestätigt werden. Bitte erneut versuchen.');return false;}
    finally{logoutOperation.current=false;setLoggingOut(false);}
  }
  async function savePassword(password){
    const userId=recoveryUser.current;
    if(passwordOperation.current||passwordState!=='ready'||!userId||activeUserId.current!==userId)throw {code:'session_expired'};
    passwordOperation.current=true;
    try{
      const result=await client.auth.updateUser({password});
      if(result.error)throw result.error;
      if(result.data.user?.id!==userId||activeUserId.current!==userId)throw {code:'session_expired'};
      setPasswordState('saved');forgetRecovery();setNotice('Dein Teamhub-Passwort wurde gespeichert.');
      const logout=await client.auth.signOut({scope:'global'});
      if(activeUserId.current&&activeUserId.current!==userId)return;
      if(logout.error){
        const checked=await client.auth.getSession();
        if(checked.data.session){setError('Dein Passwort wurde gespeichert. Die Abmeldung konnte nicht bestätigt werden. Bitte klicke erneut auf Abmelden.');return;}
        setError('Dein Passwort wurde gespeichert. Auf diesem Gerät bist du abgemeldet; die Abmeldung weiterer Sitzungen konnte nicht bestätigt werden.');
      }
      recoveryUser.current=null;recoveryIntent.current=false;clearPrivateViews();setPasswordState('none');setSession(null);setLoginMode('password');setNotice('Dein Teamhub-Passwort wurde gespeichert. Melde dich jetzt mit E-Mail und Passwort an.');
    }finally{passwordOperation.current=false;}
  }
  async function mutate(operation, success) {
    if (taskOperation.current) return false;
    taskOperation.current=true;
    const userId = session?.user.id;
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await operation(); if (result.error) throw result.error;
      if (activeUserId.current !== userId) return false;
      setNotice(success); setRefresh(n => n + 1);window.dispatchEvent(new Event('team-notifications-changed')); return true;
    } catch (e) { if (activeUserId.current === userId) setError(scheduleReady?scheduleError(e):explain(e)); return false; }
    finally { taskOperation.current=false;setSaving(false); }
  }
  async function saveTask(values) {
    const fields = { title: values.title.trim(), description: values.description.trim(), studio_id: values.studio_id, assignee_id: values.assignee_id, due_date: values.due_date, priority: values.priority };
    if(scheduleReady){if(!editor.id)fields.private=values.private;fields.repeat_unit=values.repeat_unit||'none';fields.repeat_every=Number(values.repeat_every||1);}
    if (!fields.title) { setError('Bitte gib einen Aufgabentitel ein.'); return; }
    const ok = await mutate(() => editor.id ? client.from('tasks').update(fields).eq('id', editor.id).select('id').single() : client.from('tasks').insert(fields).select('id').single(), editor.id ? 'Aufgabe auf dem Server aktualisiert.' : values.private?'Private Aufgabe gespeichert.':'Teamaufgabe auf dem Server erstellt.');
    if (ok) { setEditor(null); setSelected(null); }
  }
  async function changeStatus(task, status) {
    const ok = await mutate(() => client.from('tasks').update({ status }).eq('id', task.id).select('id,status,completed_at,updated_at').single(), 'Bearbeitungsstatus auf dem Server gespeichert.');
    if (ok) setSelected(current => current?.id === task.id ? { ...current, status } : current);
  }
  async function comment(e) {
    e.preventDefault(); const form = e.currentTarget; const body = new FormData(form).get('body').trim(); if (!body) return;
    const ok = await mutate(() => client.from('task_comments').insert({ task_id: selected.id, author_id: session.user.id, body }).select('id').single(), 'Rückmeldung auf dem Server gespeichert.');
    if (ok) form.reset();
  }

  return <PermissionContext.Provider value={{ready:functionsReady,version:scope.version||0,can:functionCan}}><TeamShell client={client} profile={session&&!authLoading&&passwordState==='none'?profile:null} session={session} area={area} allowedAreas={allowedAreas} onArea={id=>{if(id==='tasks'){clearTaskSelection();setFilter('open');setPage(0);setSite('all');setSelected(null);setEditor(null);}setArea(id);setNotificationTarget(null);if(id==='knowledge')setKnowledgeTarget(null);if(id==='learning')setLearningView('courses');setExtensionEntity(null);setEditor(null);setSelected(null);}} onDemo={onDemo} onPassword={()=>{setPasswordRequest(v=>!v);setError('');setNotice('');}} onLogout={()=>signOut()} loggingOut={loggingOut} chatEnabled={chatEnabled} unread={inbox.unread} sites={sites} onNotificationTarget={async (n,signal)=>{
      const targetArea=({task:'tasks',event:'calendar',onboarding:'learning',learning:'learning',chat:'chat',feedback:'feedback'})[n.kind];
      if(!targetArea||!allowedAreas.includes(targetArea))throw {code:'42501'};
      if(n.kind==='task')return prepareTaskDetail(n.target_id,signal);
      if(n.kind==='learning'){const r=await client.from('learning_assignments').select('id,course_id').eq('id',n.target_id).eq('learner_id',profile.id).maybeSingle().abortSignal(signal);if(r.error)throw r.error;if(!r.data?.course_id)throw {localMessage:'Dieser Lernauftrag ist nicht mehr verfügbar. Aktualisiere deine Benachrichtigungen.'};return()=>{setLearningView('courses');setNotificationTarget({...n,course_id:r.data.course_id});setArea('learning');};}
      return()=>{setNotificationTarget({...n});if(n.kind==='onboarding')setLearningView('onboarding');setArea(targetArea);};
    }}>
    <main className="team-main">
      <div className="page-heading"><div><div className="eyebrow">DEIN TEAM · DEINE STUDIOS</div><h1>{profile ? `Hallo, ${profile.full_name.split(' ')[0]}.` : 'Dein Zugang zum Team.'}</h1><p>{profile ? `${roles[profile.role]} · ${session.user.email}` : 'Melde dich mit deiner persönlichen Firmen-E-Mail-Adresse an.'}</p></div>{session && <div className="team-account-buttons">{profile&&passwordState==='none'&&<button className="button button-secondary" onClick={()=>{setPasswordRequest(v=>!v);setError('');setNotice('');}}><KeyRound size={15}/>Passwort festlegen / ändern</button>}{profile?.role==='admin'&&<button className="button button-secondary" onClick={onDemo}><ArrowLeft size={15}/>Zur Demo</button>}</div>}</div>
      {error && !editor && !(area==='tasks'&&selected) && <div className="team-error" role="alert">{error}</div>}{notice && !(area==='tasks'&&(selected||editor)) && <div className="team-notice" role="status"><CheckCircle2 size={16}/>{notice}</div>}
      {!client ? <section className="panel team-setup"><span className="assistant-big"><ShieldCheck size={32}/></span><span className="badge">Backend noch nicht eingerichtet</span><h2>Die Grundlage ist vorbereitet.</h2><p>Für echte Mitarbeiterzugänge und gemeinsame Aufgaben wird einmalig ein Supabase-Projekt benötigt. Diese Ansicht simuliert keine Anmeldung und verwendet keine lokalen Demodaten.</p><ol><li>Supabase-Projekt in einer EU-Region anlegen.</li><li>Das vorbereitete Datenbankschema installieren und den ersten Administrator einrichten.</li><li>Projektadresse und öffentlichen Publishable Key als GitHub-Repository-Variablen hinterlegen und neu veröffentlichen.</li></ol><a className="button button-secondary" href="https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/docs/MITARBEITERZUGAENGE.md" target="_blank" rel="noreferrer">Einrichtung Schritt für Schritt<ExternalLink size={14}/></a><small>Keine Passwörter, Secret Keys oder service_role-Schlüssel im Frontend hinterlegen.</small></section>
      : authLoading ? <div className="team-loading"><LoaderCircle size={25}/>Anmeldung wird geprüft …</div>
      : passwordState==='checking' ? <div className="team-loading"><LoaderCircle size={25}/>Passwort-Link wird geprüft …</div>
      : passwordState==='invalid' ? <section className="panel team-password-saved"><h2>Passwort-Link nicht bestätigt.</h2><p>Der Link ist ungültig, abgelaufen oder gehört zu einem anderen Konto. Fordere einen neuen Link an und öffne die neueste E-Mail.</p><button className="button" onClick={async()=>{if(await signOut()){setLoginMode('reset');setNotice('');}}}>Neuen Passwort-Link anfordern</button></section>
      : passwordState==='ready'&&session ? <TeamNewPassword key={session.user.id} email={session.user.email} onSave={savePassword}/>
      : passwordState==='saved' ? <section className="panel team-password-saved"><h2>Dein Passwort wurde gespeichert.</h2><p>Bitte melde dich ab und anschließend mit deinem neuen Passwort an.</p><button className="button" onClick={()=>signOut()}>Jetzt abmelden</button></section>
      : !session ? <TeamLogin key={loginMode} client={client} initialMode={loginMode} onStart={()=>{setError('');setNotice('');}}/>
      : loading && !profile ? <div className="team-loading"><LoaderCircle size={25}/>Mitarbeiterprofil wird geladen …</div>
      : !profile ? <section className="panel team-setup"><ShieldCheck size={36}/><h2>Dein Zugang ist noch nicht freigeschaltet.</h2><p>Die Anmeldung ist erfolgt, aber es fehlt ein aktives Mitarbeiterprofil oder die Standortzuordnung. Bitte wende dich an die Geschäftsführung. Es werden keine Teamdaten angezeigt.</p></section>
      : <>
        {passwordRequest&&<TeamLogin key={profile.id} client={client} accountEmail={session.user.email} onClose={()=>setPasswordRequest(false)} onStart={()=>{setError('');setNotice('');}}/>}

        {scope.missing&&profile.role==='admin'&&<CommunicationSetup admin/>}
        {chatEnabled&&inbox.unread>0&&area!=='chat'&&<div className="team-chat-notice" role="status"><span><Bell size={19}/>{inbox.unread} ungelesene Chatnachrichten</span><button className="button button-secondary" onClick={()=>setArea('chat')}>Zum Chat</button></div>}
        {scope.loading ? <div className="team-loading"><LoaderCircle size={23}/>Bereichsfreigaben werden geprüft …</div> : scope.error ? <section className="panel team-permission-empty"><p role="alert">{scope.error}</p><button className="button" onClick={scope.refresh}>Freigaben erneut prüfen</button></section> : !allowedAreas.includes(area) ? <section className="panel team-permission-empty">Für dein Konto sind derzeit keine Bereiche freigegeben. Bitte wende dich an Patrick Walter.</section> : area==='chat' ? <TeamChat key={profile.id} client={client} profile={profile} sites={sites} inbox={inbox} initialChannel={notificationTarget?.kind==='chat'?notificationTarget.channel_id:null}/> : area==='assistant' ? <TeamAssistant key={`${profile.id}-${permissionStamp}-${allowedAreas.join('|')}`} client={client} profile={profile} canTasks={allowedAreas.includes('tasks')} onKnowledge={()=>{setKnowledgeTarget(null);setArea('knowledge');}} onSource={id=>{setKnowledgeTarget(id);setArea('knowledge');}} onTask={loadTaskDetail}/> : area==='feedback' ? <TeamFeedback initialCreate={notificationTarget?.kind==='feedback'&&notificationTarget.action==='create'} key={profile.id} client={client} profile={profile} sites={sites} people={people} memberships={memberships}/> : area === 'dashboard' ? <TeamDashboard key={`${profile.id}-${profile.role}-${permissionStamp}`} client={client} profile={profile} sites={sites} allowedPages={allowedAreas} taskReturn={taskReturn} onArea={openDashboardArea} onTask={openTaskDetail}/> : area === 'calendar' ? (scheduleReady?<TeamSchedule key={`${profile.id}-${permissionStamp}`} client={client} profile={profile} sites={sites} people={people} memberships={memberships} targetEvent={notificationTarget?.kind==='event'?notificationTarget:null} onChanged={()=>{setRefresh(n=>n+1);window.dispatchEvent(new Event('team-notifications-changed'));}} onCreateTask={due=>{clearTaskSelection();setFilter('open');setSite('all');setPage(0);setArea('tasks');setEditor({private:true,due_date:due});setSelected(null);setError('');}} onTask={openTaskDetail}/>:<><ScheduleSetup admin={profile.role==='admin'}/><TeamCalendar client={client} profile={profile} sites={sites} onTask={openTaskDetail}/></>) : area === 'learning' ? <TeamAcademy key={`${profile.id}-${profile.role}-${permissionStamp}`} client={client} profile={profile} sites={sites} people={people} memberships={memberships} initialView={learningView} focusEnrollment={notificationTarget?.kind==='onboarding'?notificationTarget.target_id:null} focusCourse={notificationTarget?.kind==='learning'?notificationTarget:null} onTask={loadTaskDetail}/> :
        ['knowledge','files'].includes(area) ? <TeamKnowledge key={`${profile.id}-${profile.role}-${area}-${allowedAreas.includes('files')}-${permissionStamp}`} client={client} profile={profile} sites={sites} people={people} memberships={memberships} mode={area} initialDocument={area==='knowledge'?knowledgeTarget:null} canUpload={allowedAreas.includes('files')} onKnowledge={allowedAreas.includes('knowledge')?id => {setKnowledgeTarget(id);setArea('knowledge');}:undefined}/> : area === 'access' ? <TeamAccessManagement key={`${profile.id}-${permissionStamp}`} client={client} profile={profile} onChanged={() => {setRefresh(n => n + 1);scope.refresh();}}/> : area !== 'tasks' ? <TeamAdministration key={`${area}-${permissionStamp}`} client={client} profile={profile} sites={sites} people={people} memberships={memberships} mode={area} entity={extensionEntity} onTaskOpen={openTaskDetail}/>: <>
        {taskSelection&&<section className="panel team-personal-tasks" aria-labelledby="personal-task-heading">
          <h2 id="personal-task-heading" ref={taskHeading} tabIndex={-1}>Meine Aufgaben · {taskPresets[taskSelection.preset]||({not_done:'Nicht erledigt',all:'Alle Status',...statuses})[filter]}{['today','overdue'].includes(taskSelection.preset)&&taskReferenceDay?` · ${dateLabel(taskReferenceDay)}`:''}</h2>
          <p>{taskSelection.preset==='today'?'Du siehst deine heute fälligen, noch nicht erledigten Aufgaben.':taskSelection.preset==='overdue'?'Du siehst deine überfälligen, noch nicht erledigten Aufgaben.':'Du siehst ausschließlich deine zugewiesenen Aufgaben.'}</p>
          <div className="button-group"><button className="button button-secondary" onClick={()=>{setTaskSelection({preset:null,day:null});setTaskReferenceDay(null);setFilter('all');setSite('all');setPage(0);setSelected(null);setEditor(null);}}>Alle meine Aufgaben anzeigen</button>{allowedAreas.includes('dashboard')&&<button className="button button-secondary" onClick={()=>{setTaskReturn(taskOrigin.current?{...taskOrigin.current}:null);setSelected(null);setEditor(null);setArea('dashboard');}}>Zurück zur Übersicht</button>}</div>
        </section>}
        <div className="content-toolbar team-task-toolbar"><div className="button-group"><label className="team-filter"><span>Standort</span><select value={site} onChange={e => { setSite(e.target.value); setPage(0); setSelected(null); }}><option value="all">Alle freigegebenen Studios</option>{sites.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label className="team-filter"><span>Status</span><select value={filter} onChange={e => { setFilter(e.target.value);if(taskSelection){setTaskSelection({preset:null,day:null});setTaskReferenceDay(null);} setPage(0); setSelected(null); }}><option value="all">Alle Status</option>{taskSelection&&<option value="not_done">Nicht erledigt</option>}{Object.entries(statuses).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label></div><div className="button-group"><button className="button button-secondary" disabled={loading} onClick={() => setRefresh(n => n + 1)}><RefreshCw size={14}/>Aktualisieren</button>{canPrivateTask&&<button className="button button-secondary" onClick={()=>{setEditor({private:true});setSelected(null);setError('');}}><Plus size={15}/>Private Aufgabe erstellen</button>}{canCreateTask && <button className="button" onClick={() => { setEditor({private:false}); setSelected(null);setError(''); }}><Plus size={15}/>Teamaufgabe erstellen</button>}</div></div>
        {!scheduleReady&&<ScheduleSetup admin={profile.role==='admin'}/>}<div className="team-scope"><ShieldCheck size={14}/>{!taskSelection&&canManage ? 'Du siehst Aufgaben innerhalb deiner freigegebenen Standorte.' : 'Du siehst ausschließlich deine zugewiesenen Aufgaben.'} Änderungen werden auf dem Server geprüft.</div>
        {loading ? <div className="team-loading" role="status"><LoaderCircle size={23}/>Aufgaben werden geladen …</div> : taskLoadError ? <div className="panel team-task-load-error"><p>Deine Aufgaben konnten nicht geladen werden.</p><button className="button button-secondary" onClick={()=>setRefresh(n=>n+1)}>Erneut versuchen</button></div> : <section className="panel team-task-list">{tasks.length ? tasks.map(t => <button key={t.id} onClick={() => { setSelected(t); setEditor(null); }}><span className={'team-task-state ' + t.status}>{t.status === 'done' ? <CheckCircle2 size={19}/> : <Activity size={19}/>}</span><div><h3>{t.title}</h3><p>{t.private?'Privat · nur für dich':t.studio?.name || 'Freigegebener Standort'} · {t.assignee?.full_name || 'Zugewiesene Person'} · {dateLabel(t.due_date)}</p></div><span className="badge">{statuses[t.status]}</span><ArrowRight size={15}/></button>) : <div className="empty"><CheckCircle2 size={30}/><h3>{taskSelection?.preset==='today'?(site==='all'?'Du hast heute keine noch offenen Aufgaben.':'Für dieses Studio hast du heute keine noch offenen Aufgaben.'):'Keine Aufgaben für diese Auswahl.'}</h3><p>Ändere den Filter oder lass dir eine Aufgabe zuweisen.</p></div>}</section>}
        {!taskLoadError&&<div className="team-pagination team-task-pagination"><span>{loading?'Aufgaben werden geladen …':`${total} Aufgaben · Seite ${page + 1} von ${Math.max(1, Math.ceil(total / pageSize))}`}</span><div className="button-group"><button className="button button-secondary" disabled={page === 0 || loading} onClick={() => setPage(n => n - 1)}>Zurück</button><button className="button button-secondary" disabled={(page + 1) * pageSize >= total || loading} onClick={() => setPage(n => n + 1)}>Weitere Aufgaben</button></div></div>}
        <div className="info-note"><Building2 size={17}/><span>Dieser Teamzugang verwendet gemeinsame Serverdaten. Eigene Module, Controlling und Mitarbeiterverwaltung benötigen die jeweiligen Datenbankerweiterungen. Bestehende Demo-Daten werden nicht automatisch hochgeladen. Die Ansicht wird über „Aktualisieren“ neu geladen.</span></div></>}
      </>}
      {profile && passwordState==='none' && area === 'tasks' && editor && <ScheduleDialog title={editor.id?'Aufgabe bearbeiten':editor.private?'Private Aufgabe erstellen':'Teamaufgabe erstellen'} busy={saving} error={error} onClose={()=>{setEditor(null);setError('');}}><OnlineTaskForm key={editor.id||String(editor.private)} profile={profile} initial={editor} sites={sites} people={people} memberships={memberships} saving={saving} scheduleReady={scheduleReady} onSave={saveTask}/></ScheduleDialog>}
      {profile && passwordState==='none' && area === 'tasks' && selected && !editor && <ScheduleDialog className="team-detail" title={selected.title} busy={saving} error={error} onClose={() => {setSelected(null);setError('');}} closeLabel="Teamaufgabe schließen">{notice && <div className="team-notice" role="status">{notice}</div>}<div className="team-detail-body"><div className="schedule-task-meta"><span className="badge">{selected.private?'Privat · nur für dich':'Teamaufgabe'}</span><span className="badge">{repeatLabel(selected)}</span>{selected.maintenance_plan_id&&<span className="badge">Gerätewartung · Änderungen im Kalender unter Gerätewartung</span>}</div><p className="team-description">{selected.description || 'Keine zusätzliche Beschreibung.'}</p><label className="field"><span>Bearbeitungsstatus</span><select aria-label="Bearbeitungsstatus" disabled={saving||!functionCan(selected.assignee_id===profile.id?'tasks.status':'tasks.team_status',true)} value={selected.status} onChange={e => changeStatus(selected, e.target.value)}>{Object.entries(statuses).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>{(canEditTask||canPrivateTask&&selected.private&&selected.created_by===profile.id)&&!selected.maintenance_plan_id && <button className="button button-secondary" onClick={() => { setEditor(selected); setSelected(null); }}>Aufgabe bearbeiten</button>}{allowedAreas.includes('modules')&&<button className="button button-secondary" onClick={() => { setExtensionEntity({ target: 'tasks', id: selected.id, name: selected.title, studio: selected.studio?.name }); setArea('modules');setSelected(null); }}>Zusatzfelder öffnen</button>}<h3 className="team-comments-heading"><MessageCircle size={16}/>Rückmeldungen</h3>{commentsLoading ? <p>Rückmeldungen werden geladen …</p> : comments.map(c => <article className="team-comment" key={c.id}><strong>{c.author?.full_name || 'Teammitglied'}</strong><small>{new Date(c.created_at).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</small><p>{c.body}</p></article>)}{functionCan('tasks.comment',true)&&<form onSubmit={comment}><label className="field"><span>Deine Rückmeldung zur Teamaufgabe</span><textarea name="body" rows={3} required maxLength={3000}/></label><button className="button" disabled={saving} type="submit"><Send size={14}/>Auf dem Server speichern</button></form>}</div></ScheduleDialog>}
    </main>
  </TeamShell></PermissionContext.Provider>;
}

function OnlineTaskForm({ profile, initial, sites, people, memberships, saving, scheduleReady, onSave }) {
  const {can}=usePermissions();
  const privateTask=!!initial.private;
  const mayAssign=!privateTask&&can('tasks.assign',true),mayEdit=privateTask?can('tasks.private'):can('tasks.edit',true)||!initial.id;
  const [repeat,setRepeat]=useState(initial.repeat_unit||'none');
  const [site, setSite] = useState(initial.studio_id || sites[0]?.id || '');
  const eligible = people.filter(p => (privateTask||!initial.id&&!mayAssign?p.id===profile.id:true) && p.active && (p.role === 'admin' || memberships.some(m => m.user_id === p.id && m.studio_id === site)));
  const [personId, setPersonId] = useState(initial.assignee_id || '');
  const person = eligible.some(p => p.id === personId) ? personId : eligible[0]?.id || '';
  return <form className="team-online-form" onSubmit={e => { e.preventDefault(); onSave({ ...initial,...Object.fromEntries(new FormData(e.currentTarget)), studio_id: site, assignee_id: privateTask?profile.id:person,private:privateTask,repeat_unit:repeat }); }}><label className="field"><span>{privateTask?'Titel der privaten Aufgabe':'Titel der Teamaufgabe'}</span><input name="title" readOnly={!mayEdit} maxLength={180} required defaultValue={initial.title || ''}/></label><label className="field"><span>Beschreibung</span><textarea name="description" readOnly={!mayEdit} rows={3} maxLength={5000} defaultValue={initial.description || ''}/></label>{privateTask&&<p className="small-muted">Diese Aufgabe ist nur für dich sichtbar, auch nicht für die Leitung.</p>}<div className="form-grid"><label className="field"><span>Studio der Teamaufgabe</span><select value={site} required disabled={!!initial.id&&!mayAssign} onChange={e => setSite(e.target.value)}>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="field"><span>Verantwortliche Person</span><select value={person} required disabled={!mayAssign} onChange={e => setPersonId(e.target.value)}>{eligible.map(p => <option value={p.id} key={p.id}>{p.full_name}</option>)}</select></label><label className="field"><span>Fälligkeitsdatum</span><input name="due_date" type="date" readOnly={!mayEdit} required defaultValue={initial.due_date || berlinDay()}/></label><label className="field"><span>Priorität</span><select name="priority" disabled={!mayEdit} defaultValue={initial.priority || 'normal'}><option value="normal">Normal</option><option value="high">Hoch</option></select></label>{scheduleReady&&<><label className="field"><span>Wiederholung</span><select value={repeat} disabled={!mayEdit||!can('tasks.repeat')} onChange={e=>setRepeat(e.target.value)}>{repeats.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label className="field"><span>Abstand der Wiederholung</span><input name="repeat_every" type="number" min="1" max="120" required readOnly={!mayEdit||!can('tasks.repeat')} defaultValue={initial.repeat_every||1}/></label></>}</div>{scheduleReady&&repeat!=='none'&&<p className="small-muted">Nach dem Abschluss wird die nächste Aufgabe ab der bisherigen Fälligkeit angelegt. Für halbjährliche Wartungen: Monatlich, Abstand 6.</p>}<button className="button" type="submit" disabled={saving || !person || !site}><Save size={15}/>{saving ? 'Wird gespeichert …' : privateTask?'Private Aufgabe speichern':'Teamaufgabe speichern'}</button></form>;
}
