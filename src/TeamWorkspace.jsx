import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Activity, ArrowLeft, ArrowRight, Building2, CheckCircle2, ExternalLink, KeyRound, LoaderCircle, LogOut, MessageCircle, Plus, RefreshCw, Save, Send, ShieldCheck, X } from 'lucide-react';
import { backendConfig } from './backend-config';
import { berlinDay } from './clock';
import TeamAdministration from './TeamAdministration';
import TeamAccessManagement from './TeamAccessManagement';
import TeamKnowledge from './TeamKnowledge';
import TeamDashboard, { TeamCalendar } from './TeamPilot';
import TeamAcademy from './TeamAcademy';
import TeamLogin,{TeamNewPassword} from './TeamLogin';
import {appVersionLabel} from './app-version';
import './team-workspace.css';

const roles = { admin: 'Geschäftsführung', studio_manager: 'Studioleitung', employee: 'Mitarbeiter' };
const statuses = { open: 'Offen', in_progress: 'In Bearbeitung', done: 'Erledigt' };
const columns = 'id,title,description,studio_id,assignee_id,due_date,priority,status,created_at,updated_at,completed_at,studio:studios(name),assignee:profiles!tasks_assignee_id_fkey(full_name)';
const dateLabel = value => new Date(value + 'T12:00:00').toLocaleDateString('de-DE');
const pageSize = 50;
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
  const client = useMemo(() => {
    if (!config.url || !config.publishableKey) return null;
    try { return createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }); }
    catch { return null; }
  }, [config.url, config.publishableKey]);
  const [session, setSession] = useState(null);
  const [area, setArea] = useState(initialArea);
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
  const activeUserId = useRef(null);
  activeUserId.current = session?.user.id || null;

  function rememberRecovery(userId){try{sessionStorage.setItem(recoveryStorageKey,JSON.stringify({userId,at:Date.now()}));}catch{/* Storage may be unavailable; the current verified flow still works. */}}
  function forgetRecovery(){try{sessionStorage.removeItem(recoveryStorageKey);}catch{}}
  function clearPrivateViews(){request.current++;setProfile(null);setTasks([]);setTotal(0);setComments([]);setSelected(null);setEditor(null);setPeople([]);setSites([]);setMemberships([]);setArea(initialArea);setExtensionEntity(null);setPage(0);setSite('all');setFilter('open');setPasswordRequest(false);}

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
    setLoading(true); setError('');
    (async () => {
      try {
        const result = await client.from('profiles').select('id,full_name,role,active').eq('id', session.user.id).maybeSingle().abortSignal(controller.signal);
        if (result.error) throw result.error;
        if (version !== request.current || controller.signal.aborted) return;
        if (!result.data?.active) { setProfile(null); setTasks([]); setSites([]); setPeople([]); setMemberships([]); setComments([]); setSelected(null); setEditor(null); return; }
        setProfile(result.data);
        let query = client.from('tasks').select(columns, { count: 'exact' }).order('due_date').order('id').range(page * pageSize, (page + 1) * pageSize - 1);
        if (site !== 'all') query = query.eq('studio_id', site);
        if (filter !== 'all') query = query.eq('status', filter);
        const [taskResult, siteResult, peopleResult, membershipResult] = await Promise.all([
          query.abortSignal(controller.signal),
          client.from('studios').select('id,name').order('name').abortSignal(controller.signal),
          client.from('profiles').select('id,full_name,role,active').eq('active', true).abortSignal(controller.signal),
          client.from('studio_memberships').select('user_id,studio_id').abortSignal(controller.signal),
        ]);
        for (const r of [taskResult, siteResult, peopleResult, membershipResult]) if (r.error) throw r.error;
        if (version !== request.current || controller.signal.aborted) return;
        setTasks(taskResult.data || []); setTotal(taskResult.count || 0); setSites(siteResult.data || []); setPeople(peopleResult.data || []); setMemberships(membershipResult.data || []);
      } catch (e) { if (!controller.signal.aborted && version === request.current) { setError(explain(e)); setTasks([]); } }
      finally { if (version === request.current && !controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [client, session?.user.id, filter, site, page, refresh,passwordState]);

  useEffect(() => {
    if (!client || !selected || !session?.user.id) { setComments([]); return; }
    const controller = new AbortController();
    setComments([]); setCommentsLoading(true);
    client.from('task_comments').select('id,body,created_at,author:profiles!task_comments_author_id_fkey(full_name)').eq('task_id', selected.id).order('created_at').abortSignal(controller.signal).then(({ data, error: e }) => {
      if (controller.signal.aborted) return;
      if (e) setError(explain(e)); else setComments(data || []);
      setCommentsLoading(false);
    });
    return () => controller.abort();
  }, [client, selected?.id, session?.user.id, refresh]);

  const canManage = profile?.role === 'admin' || profile?.role === 'studio_manager';
  async function signOut() {
    const previousUser=activeUserId.current;
    setError(''); const {error:e}=await client.auth.signOut({scope:'local'});
    if(activeUserId.current&&activeUserId.current!==previousUser)return false;
    if(e){const checked=await client.auth.getSession();if(checked.data.session){setError('Die Abmeldung konnte nicht bestätigt werden. Bitte erneut versuchen.');return false;}setError('Du bist auf diesem Gerät abgemeldet. Die serverseitige Abmeldung konnte nicht bestätigt werden.');}
    recoveryUser.current=null;recoveryIntent.current=false;forgetRecovery();clearPrivateViews();setPasswordState('none');setSession(null);setLoginMode('password');setNotice('Du bist auf diesem Gerät abgemeldet.');return true;
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
    if (saving) return false;
    const userId = session?.user.id;
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await operation(); if (result.error) throw result.error;
      if (activeUserId.current !== userId) return false;
      setNotice(success); setRefresh(n => n + 1); return true;
    } catch (e) { if (activeUserId.current === userId) setError(explain(e)); return false; }
    finally { setSaving(false); }
  }
  async function saveTask(values) {
    const fields = { title: values.title.trim(), description: values.description.trim(), studio_id: values.studio_id, assignee_id: values.assignee_id, due_date: values.due_date, priority: values.priority };
    if (!fields.title) { setError('Bitte gib einen Aufgabentitel ein.'); return; }
    const ok = await mutate(() => editor.id ? client.from('tasks').update(fields).eq('id', editor.id).select('id').single() : client.from('tasks').insert(fields).select('id').single(), editor.id ? 'Aufgabe auf dem Server aktualisiert.' : 'Teamaufgabe auf dem Server erstellt.');
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

  return <div className="team-workspace">
    <header className="team-topbar"><div className="team-brand-group"><div className="brand"><span className="brand-mark"><Activity size={25}/></span><div>Fitness <span className="brand-amp">&</span> Gesundheit<small>GEMEINSAMER TEAMZUGANG</small></div></div><span className="app-release">{appVersionLabel}</span></div><button className="button button-secondary" onClick={onDemo}><ArrowLeft size={15}/>Zur Demo</button></header>
    <main className="team-main">
      <div className="page-heading"><div><div className="eyebrow">DEIN TEAM · DEINE STUDIOS</div><h1>{profile ? `Hallo, ${profile.full_name.split(' ')[0]}.` : 'Dein Zugang zum Team.'}</h1><p>{profile ? `${roles[profile.role]} · ${session.user.email}` : 'Melde dich mit deiner persönlichen Firmen-E-Mail-Adresse an.'}</p></div>{session && <div className="team-account-buttons">{profile&&passwordState==='none'&&<button className="button button-secondary" onClick={()=>{setPasswordRequest(v=>!v);setError('');setNotice('');}}><KeyRound size={15}/>Passwort festlegen / ändern</button>}<button className="button button-secondary" onClick={()=>signOut()}><LogOut size={15}/>Abmelden</button></div>}</div>
      {error && <div className="team-error" role="alert">{error}</div>}{notice && <div className="team-notice" role="status"><CheckCircle2 size={16}/>{notice}</div>}
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
        <div className="pill-tabs team-area-tabs">{[['dashboard', 'Meine Übersicht'], ['tasks', 'Aufgaben'], ['calendar', 'Kalender'], ['learning', 'Lernhub'], ['knowledge', 'Wissenshub'], ['files', 'Dateien'], ['modules', 'Eigene Module'], ['builder', 'Modulbaukasten'], ...(profile.role === 'admin' ? [['controlling', 'Controlling'], ['access', 'Mitarbeiterzugänge']] : [])].map(([id, title]) => <button key={id} className={area === id ? 'active' : ''} onClick={() => { setArea(id); setExtensionEntity(null); setEditor(null); setSelected(null); }}>{title}</button>)}</div>
        {area === 'dashboard' ? <TeamDashboard key={`${profile.id}-${profile.role}`} client={client} profile={profile} sites={sites} onArea={id=>{setArea(id);setSelected(null);setEditor(null);}} onTask={t=>{setArea('tasks');setSelected(t);setEditor(null);}}/> : area === 'calendar' ? <TeamCalendar key={`${profile.id}-${profile.role}`} client={client} profile={profile} sites={sites} onTask={t=>{setArea('tasks');setSelected(t);setEditor(null);}}/> : area === 'learning' ? <TeamAcademy key={`${profile.id}-${profile.role}`} client={client} profile={profile} sites={sites} people={people} memberships={memberships}/> :
        ['knowledge','files'].includes(area) ? <TeamKnowledge key={`${profile.id}-${profile.role}-${area}`} client={client} profile={profile} sites={sites} people={people} memberships={memberships} mode={area} onKnowledge={() => setArea('knowledge')}/> : area === 'access' ? <TeamAccessManagement key={profile.id} client={client} profile={profile} onChanged={() => setRefresh(n => n + 1)}/> : area !== 'tasks' ? <TeamAdministration key={area} client={client} profile={profile} sites={sites} people={people} memberships={memberships} mode={area} entity={extensionEntity} onTaskOpen={t => { setArea('tasks'); setSelected(t); }}/>: <>
        <div className="content-toolbar"><div className="button-group"><label className="team-filter"><span>Standort</span><select value={site} onChange={e => { setSite(e.target.value); setPage(0); setSelected(null); }}><option value="all">Alle freigegebenen Studios</option>{sites.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label className="team-filter"><span>Status</span><select value={filter} onChange={e => { setFilter(e.target.value); setPage(0); setSelected(null); }}><option value="all">Alle Status</option>{Object.entries(statuses).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label></div><div className="button-group"><button className="button button-secondary" disabled={loading} onClick={() => setRefresh(n => n + 1)}><RefreshCw size={14}/>Aktualisieren</button>{canManage && <button className="button" onClick={() => { setEditor({}); setSelected(null); }}><Plus size={15}/>Teamaufgabe erstellen</button>}</div></div>
        <div className="team-scope"><ShieldCheck size={14}/>{canManage ? 'Du siehst Aufgaben innerhalb deiner freigegebenen Standorte.' : 'Du siehst ausschließlich deine zugewiesenen Aufgaben.'} Änderungen werden auf dem Server geprüft.</div>
        {loading ? <div className="team-loading"><LoaderCircle size={23}/>Aufgaben werden geladen …</div> : <section className="panel team-task-list">{tasks.length ? tasks.map(t => <button key={t.id} onClick={() => { setSelected(t); setEditor(null); }}><span className={'team-task-state ' + t.status}>{t.status === 'done' ? <CheckCircle2 size={19}/> : <Activity size={19}/>}</span><div><h3>{t.title}</h3><p>{t.studio?.name || 'Freigegebener Standort'} · {t.assignee?.full_name || 'Zugewiesene Person'} · {dateLabel(t.due_date)}</p></div><span className="badge">{statuses[t.status]}</span><ArrowRight size={15}/></button>) : <div className="empty"><CheckCircle2 size={30}/><h3>Keine Aufgaben für diese Auswahl.</h3><p>Ändere den Filter oder lass dir eine Aufgabe zuweisen.</p></div>}</section>}
        <div className="team-pagination"><span>{total} Aufgaben · Seite {page + 1} von {Math.max(1, Math.ceil(total / pageSize))}</span><div className="button-group"><button className="button button-secondary" disabled={page === 0 || loading} onClick={() => setPage(n => n - 1)}>Zurück</button><button className="button button-secondary" disabled={(page + 1) * pageSize >= total || loading} onClick={() => setPage(n => n + 1)}>Weitere Aufgaben</button></div></div>
        <div className="info-note"><Building2 size={17}/><span>Dieser Teamzugang verwendet gemeinsame Serverdaten. Eigene Module, Controlling und Mitarbeiterverwaltung benötigen die jeweiligen Datenbankerweiterungen. Bestehende Demo-Daten werden nicht automatisch hochgeladen. Die Ansicht wird über „Aktualisieren“ neu geladen.</span></div></>}
      </>}
      {profile && passwordState==='none' && area === 'tasks' && editor && <section className="panel team-detail"><div className="section-heading"><h2>{editor.id ? 'Teamaufgabe bearbeiten' : 'Einmalige Teamaufgabe'}</h2><button className="icon-button" aria-label="Teamformular schließen" onClick={() => setEditor(null)}><X size={19}/></button></div><OnlineTaskForm initial={editor} sites={sites} people={people} memberships={memberships} saving={saving} onSave={saveTask}/></section>}
      {profile && passwordState==='none' && area === 'tasks' && selected && <section className="panel team-detail"><div className="section-heading"><h2>{selected.title}</h2><button className="icon-button" aria-label="Teamaufgabe schließen" onClick={() => setSelected(null)}><X size={19}/></button></div><div className="team-detail-body"><p className="team-description">{selected.description || 'Keine zusätzliche Beschreibung.'}</p><label className="field"><span>Bearbeitungsstatus</span><select aria-label="Bearbeitungsstatus" disabled={saving} value={selected.status} onChange={e => changeStatus(selected, e.target.value)}>{Object.entries(statuses).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>{canManage && <button className="button button-secondary" onClick={() => { setEditor(selected); setSelected(null); }}>Aufgabe bearbeiten</button>}<button className="button button-secondary" onClick={() => { setExtensionEntity({ target: 'tasks', id: selected.id, name: selected.title, studio: selected.studio?.name }); setArea('modules'); }}>Zusatzfelder öffnen</button><h3 className="team-comments-heading"><MessageCircle size={16}/>Rückmeldungen</h3>{commentsLoading ? <p>Rückmeldungen werden geladen …</p> : comments.map(c => <article className="team-comment" key={c.id}><strong>{c.author?.full_name || 'Teammitglied'}</strong><small>{new Date(c.created_at).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</small><p>{c.body}</p></article>)}<form onSubmit={comment}><label className="field"><span>Deine Rückmeldung zur Teamaufgabe</span><textarea name="body" rows={3} required maxLength={3000}/></label><button className="button" disabled={saving} type="submit"><Send size={14}/>Auf dem Server speichern</button></form></div></section>}
    </main>
  </div>;
}

function OnlineTaskForm({ initial, sites, people, memberships, saving, onSave }) {
  const [site, setSite] = useState(initial.studio_id || sites[0]?.id || '');
  const eligible = people.filter(p => p.active && (p.role === 'admin' || memberships.some(m => m.user_id === p.id && m.studio_id === site)));
  const [personId, setPersonId] = useState(initial.assignee_id || '');
  const person = eligible.some(p => p.id === personId) ? personId : eligible[0]?.id || '';
  return <form className="team-online-form" onSubmit={e => { e.preventDefault(); onSave({ ...Object.fromEntries(new FormData(e.currentTarget)), studio_id: site, assignee_id: person }); }}><label className="field"><span>Titel der Teamaufgabe</span><input name="title" maxLength={180} required defaultValue={initial.title || ''}/></label><label className="field"><span>Beschreibung</span><textarea name="description" rows={3} maxLength={5000} defaultValue={initial.description || ''}/></label><div className="form-grid"><label className="field"><span>Studio der Teamaufgabe</span><select value={site} required onChange={e => setSite(e.target.value)}>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="field"><span>Verantwortliche Person</span><select value={person} required onChange={e => setPersonId(e.target.value)}>{eligible.map(p => <option value={p.id} key={p.id}>{p.full_name}</option>)}</select></label><label className="field"><span>Fälligkeitsdatum</span><input name="due_date" type="date" required defaultValue={initial.due_date || berlinDay()}/></label><label className="field"><span>Priorität</span><select name="priority" defaultValue={initial.priority || 'normal'}><option value="normal">Normal</option><option value="high">Hoch</option></select></label></div><button className="button" type="submit" disabled={saving || !person || !site}><Save size={15}/>{saving ? 'Wird gespeichert …' : 'Teamaufgabe speichern'}</button></form>;
}
