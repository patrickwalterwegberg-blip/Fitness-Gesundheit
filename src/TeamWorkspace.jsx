import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Activity, ArrowLeft, ArrowRight, Building2, CheckCircle2, ExternalLink, LoaderCircle, LogOut, Mail, MessageCircle, Plus, RefreshCw, Save, Send, ShieldCheck, X } from 'lucide-react';
import { backendConfig } from './backend-config';
import { berlinDay } from './clock';
import TeamAdministration from './TeamAdministration';
import TeamAccessManagement from './TeamAccessManagement';
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

export default function TeamWorkspace({ onDemo, config = backendConfig() }) {
  const client = useMemo(() => {
    if (!config.url || !config.publishableKey) return null;
    try { return createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }); }
    catch { return null; }
  }, [config.url, config.publishableKey]);
  const [session, setSession] = useState(null);
  const [area, setArea] = useState('tasks');
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
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginCooldown, setLoginCooldown] = useState(0);
  const loginOperation = useRef(false);
  const request = useRef(0);
  const activeUserId = useRef(null);
  activeUserId.current = session?.user.id || null;

  useEffect(() => {
    if (!client) return;
    let live = true;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, current) => {
      if (!live) return;
      setSession(current); setAuthLoading(false);
      if (!current) { setProfile(null); setTasks([]); setComments([]); setSelected(null); setPeople([]); setSites([]); setMemberships([]); }
    });
    const callbackError = new URLSearchParams(location.hash.slice(1)).has('error');
    client.auth.getSession().then(({ data, error: authError }) => { if (!live) return; setSession(data.session); setAuthLoading(false); if (data.session || callbackError) { const url = new URL(location.href); if (data.session) url.searchParams.delete('team'); url.hash = 'workspace'; history.replaceState(null, '', url.href); } if (authError || callbackError) setError('Der Anmeldelink ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.'); }).catch(() => { if (live) { setAuthLoading(false); setError('Die Anmeldung konnte nicht geprüft werden. Bitte lade die Seite erneut.'); } });
    return () => { live = false; subscription.unsubscribe(); void client.auth.stopAutoRefresh(); };
  }, [client]);

  useEffect(() => { if (!loginCooldown) return; const timer = setTimeout(() => setLoginCooldown(n => Math.max(0, n - 1)), 1000); return () => clearTimeout(timer); }, [loginCooldown]);

  useEffect(() => {
    if (!client || !session?.user.id) return;
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
  }, [client, session?.user.id, filter, site, page, refresh]);

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
  async function sendLogin(e) {
    e.preventDefault(); if (loginOperation.current || loginCooldown) return; loginOperation.current = true; setLoginBusy(true); setError(''); setNotice('');
    const email = new FormData(e.currentTarget).get('email').trim();
    const redirect = new URL(location.pathname, location.origin); redirect.searchParams.set('team', '1');
    try {
      const { error: authError } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirect.href } });
      if (authError && !/signups? not allowed|user not found/i.test(authError.message)) throw authError;
      setNotice('Falls für diese Adresse ein Zugang eingerichtet ist, erhältst du einen Anmeldelink. Prüfe auch den Spamordner.');
      setLoginCooldown(60);
    } catch { setError('Der Anmeldelink konnte nicht angefordert werden. Bitte versuche es später oder frage deine Studioleitung.'); }
    finally { loginOperation.current = false; setLoginBusy(false); }
  }
  async function signOut() {
    setError(''); const { error: e } = await client.auth.signOut({ scope: 'local' });
    if (e) setError('Die Abmeldung konnte nicht bestätigt werden. Bitte erneut versuchen.');
    else { setNotice('Du bist auf diesem Gerät abgemeldet.'); setEditor(null); setSelected(null); }
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
    <header className="team-topbar"><div className="brand"><span className="brand-mark"><Activity size={25}/></span><div>Fitness <span className="brand-amp">&</span> Gesundheit<small>GEMEINSAMER TEAMZUGANG</small></div></div><button className="button button-secondary" onClick={onDemo}><ArrowLeft size={15}/>Zur Demo</button></header>
    <main className="team-main">
      <div className="page-heading"><div><div className="eyebrow">ECHTE ANMELDUNG · GETRENNTE TEAMDATEN</div><h1>{profile ? `Hallo, ${profile.full_name.split(' ')[0]}.` : 'Dein Zugang zum Team.'}</h1><p>{profile ? `${roles[profile.role]} · ${session.user.email}` : 'Melde dich mit deiner persönlichen Firmen-E-Mail-Adresse an.'}</p></div>{session && <button className="button button-secondary" onClick={signOut}><LogOut size={15}/>Abmelden</button>}</div>
      {error && <div className="team-error" role="alert">{error}</div>}{notice && <div className="team-notice" role="status"><CheckCircle2 size={16}/>{notice}</div>}
      {!client ? <section className="panel team-setup"><span className="assistant-big"><ShieldCheck size={32}/></span><span className="badge">Backend noch nicht eingerichtet</span><h2>Die Grundlage ist vorbereitet.</h2><p>Für echte Mitarbeiterzugänge und gemeinsame Aufgaben wird einmalig ein Supabase-Projekt benötigt. Diese Ansicht simuliert keine Anmeldung und verwendet keine lokalen Demodaten.</p><ol><li>Supabase-Projekt in einer EU-Region anlegen.</li><li>Das vorbereitete Datenbankschema installieren und den ersten Administrator einrichten.</li><li>Projektadresse und öffentlichen Publishable Key als GitHub-Repository-Variablen hinterlegen und neu veröffentlichen.</li></ol><a className="button button-secondary" href="https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/docs/MITARBEITERZUGAENGE.md" target="_blank" rel="noreferrer">Einrichtung Schritt für Schritt<ExternalLink size={14}/></a><small>Keine Passwörter, Secret Keys oder service_role-Schlüssel im Frontend hinterlegen.</small></section>
      : authLoading ? <div className="team-loading"><LoaderCircle size={25}/>Anmeldung wird geprüft …</div>
      : !session ? <section className="panel team-login"><span className="stat-icon orange"><Mail size={25}/></span><h2>Willkommen zurück.</h2><p>Du erhältst einen zeitlich begrenzten Anmeldelink. Ein 1&1-Postfachpasswort wird nicht benötigt. Nur bereits eingerichtete Mitarbeiter können sich anmelden.</p><ol className="login-steps"><li>Deine persönliche Firmen-E-Mail eingeben.</li><li>Postfach öffnen und den neuesten Anmeldelink wählen.</li><li>Mit deinen freigegebenen Studios und Aufgaben starten.</li></ol><form onSubmit={sendLogin}><label className="field"><span>Deine Firmen-E-Mail-Adresse</span><input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="name@euer-studio.de"/></label><button className="button" type="submit" disabled={loginBusy || loginCooldown > 0}>{loginBusy ? <LoaderCircle size={15}/> : <Mail size={15}/>} {loginCooldown ? `Erneut anfordern in ${loginCooldown} s` : 'Anmeldelink anfordern'}</button></form><p className="login-help">Noch keine Einladung erhalten oder kein Link angekommen? Frage die Geschäftsführung und prüfe den Spamordner. An einem gemeinsam genutzten Rechner nach der Arbeit abmelden.</p></section>
      : loading && !profile ? <div className="team-loading"><LoaderCircle size={25}/>Mitarbeiterprofil wird geladen …</div>
      : !profile ? <section className="panel team-setup"><ShieldCheck size={36}/><h2>Dein Zugang ist noch nicht freigeschaltet.</h2><p>Die Anmeldung ist erfolgt, aber es fehlt ein aktives Mitarbeiterprofil oder die Standortzuordnung. Bitte wende dich an die Geschäftsführung. Es werden keine Teamdaten angezeigt.</p></section>
      : <>
        <div className="pill-tabs team-area-tabs">{[['tasks', 'Aufgaben'], ['modules', 'Eigene Module'], ['builder', 'Modulbaukasten'], ...(profile.role === 'admin' ? [['controlling', 'Controlling'], ['access', 'Mitarbeiterzugänge']] : [])].map(([id, title]) => <button key={id} className={area === id ? 'active' : ''} onClick={() => { setArea(id); setExtensionEntity(null); setEditor(null); setSelected(null); }}>{title}</button>)}</div>
        {area === 'access' ? <TeamAccessManagement key={profile.id} client={client} profile={profile} onChanged={() => setRefresh(n => n + 1)}/> : area !== 'tasks' ? <TeamAdministration key={area} client={client} profile={profile} sites={sites} people={people} memberships={memberships} mode={area} entity={extensionEntity} onTaskOpen={t => { setArea('tasks'); setSelected(t); }}/>: <>
        <div className="content-toolbar"><div className="button-group"><label className="team-filter"><span>Standort</span><select value={site} onChange={e => { setSite(e.target.value); setPage(0); setSelected(null); }}><option value="all">Alle freigegebenen Studios</option>{sites.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label className="team-filter"><span>Status</span><select value={filter} onChange={e => { setFilter(e.target.value); setPage(0); setSelected(null); }}><option value="all">Alle Status</option>{Object.entries(statuses).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label></div><div className="button-group"><button className="button button-secondary" disabled={loading} onClick={() => setRefresh(n => n + 1)}><RefreshCw size={14}/>Aktualisieren</button>{canManage && <button className="button" onClick={() => { setEditor({}); setSelected(null); }}><Plus size={15}/>Teamaufgabe erstellen</button>}</div></div>
        <div className="team-scope"><ShieldCheck size={14}/>{canManage ? 'Du siehst Aufgaben innerhalb deiner freigegebenen Standorte.' : 'Du siehst ausschließlich deine zugewiesenen Aufgaben.'} Änderungen werden auf dem Server geprüft.</div>
        {loading ? <div className="team-loading"><LoaderCircle size={23}/>Aufgaben werden geladen …</div> : <section className="panel team-task-list">{tasks.length ? tasks.map(t => <button key={t.id} onClick={() => { setSelected(t); setEditor(null); }}><span className={'team-task-state ' + t.status}>{t.status === 'done' ? <CheckCircle2 size={19}/> : <Activity size={19}/>}</span><div><h3>{t.title}</h3><p>{t.studio?.name || 'Freigegebener Standort'} · {t.assignee?.full_name || 'Zugewiesene Person'} · {dateLabel(t.due_date)}</p></div><span className="badge">{statuses[t.status]}</span><ArrowRight size={15}/></button>) : <div className="empty"><CheckCircle2 size={30}/><h3>Keine Aufgaben für diese Auswahl.</h3><p>Ändere den Filter oder lass dir eine Aufgabe zuweisen.</p></div>}</section>}
        <div className="team-pagination"><span>{total} Aufgaben · Seite {page + 1} von {Math.max(1, Math.ceil(total / pageSize))}</span><div className="button-group"><button className="button button-secondary" disabled={page === 0 || loading} onClick={() => setPage(n => n - 1)}>Zurück</button><button className="button button-secondary" disabled={(page + 1) * pageSize >= total || loading} onClick={() => setPage(n => n + 1)}>Weitere Aufgaben</button></div></div>
        <div className="info-note"><Building2 size={17}/><span>Dieser Teamzugang verwendet gemeinsame Serverdaten. Eigene Module, Controlling und Mitarbeiterverwaltung benötigen die jeweiligen Datenbankerweiterungen. Bestehende Demo-Daten werden nicht automatisch hochgeladen. Die Ansicht wird über „Aktualisieren“ neu geladen.</span></div></>}
      </>}
      {profile && area === 'tasks' && editor && <section className="panel team-detail"><div className="section-heading"><h2>{editor.id ? 'Teamaufgabe bearbeiten' : 'Einmalige Teamaufgabe'}</h2><button className="icon-button" aria-label="Teamformular schließen" onClick={() => setEditor(null)}><X size={19}/></button></div><OnlineTaskForm initial={editor} sites={sites} people={people} memberships={memberships} saving={saving} onSave={saveTask}/></section>}
      {profile && area === 'tasks' && selected && <section className="panel team-detail"><div className="section-heading"><h2>{selected.title}</h2><button className="icon-button" aria-label="Teamaufgabe schließen" onClick={() => setSelected(null)}><X size={19}/></button></div><div className="team-detail-body"><p className="team-description">{selected.description || 'Keine zusätzliche Beschreibung.'}</p><label className="field"><span>Bearbeitungsstatus</span><select aria-label="Bearbeitungsstatus" disabled={saving} value={selected.status} onChange={e => changeStatus(selected, e.target.value)}>{Object.entries(statuses).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>{canManage && <button className="button button-secondary" onClick={() => { setEditor(selected); setSelected(null); }}>Aufgabe bearbeiten</button>}<button className="button button-secondary" onClick={() => { setExtensionEntity({ target: 'tasks', id: selected.id, name: selected.title, studio: selected.studio?.name }); setArea('modules'); }}>Zusatzfelder öffnen</button><h3 className="team-comments-heading"><MessageCircle size={16}/>Rückmeldungen</h3>{commentsLoading ? <p>Rückmeldungen werden geladen …</p> : comments.map(c => <article className="team-comment" key={c.id}><strong>{c.author?.full_name || 'Teammitglied'}</strong><small>{new Date(c.created_at).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</small><p>{c.body}</p></article>)}<form onSubmit={comment}><label className="field"><span>Deine Rückmeldung zur Teamaufgabe</span><textarea name="body" rows={3} required maxLength={3000}/></label><button className="button" disabled={saving} type="submit"><Send size={14}/>Auf dem Server speichern</button></form></div></section>}
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
