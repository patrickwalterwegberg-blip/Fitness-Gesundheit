import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, LoaderCircle, Mail, Plus, RefreshCw, Save, Search, Settings2, ShieldCheck, UserRound, X } from 'lucide-react';
import { roleLabels } from './module-model';
import './team-access.css';
import TeamUserProfile from './TeamUserProfile';
import TeamUserImport from './TeamUserImport';

const pageSize = 50;
const messages = {
  setup_missing: 'Der Einladungsdienst ist noch nicht vollständig eingerichtet. Bitte die Einrichtungshilfe für Mitarbeiterzugänge verwenden.',
  account_exists: 'Für diese E-Mail-Adresse besteht bereits ein Konto. Aktualisiere die Liste und verwende dort „Anmeldelink anfordern“. Fehlt das Profil, muss die Geschäftsführung es im Backend zuordnen.',
  administrator_required: 'Nur ein aktiver Administrator kann Mitarbeiterzugänge verwalten.',
  not_authenticated: 'Deine Sitzung konnte nicht bestätigt werden. Bitte melde dich erneut an.',
  invalid_input: 'Bitte Namen, E-Mail-Adresse, Rolle und Standortzuordnung prüfen.',
  invitation_not_confirmed: 'Die Einladung konnte beim E-Mail-Dienst nicht bestätigt werden. Aktualisiere die Zugangsliste und prüfe das Konto, bevor du erneut einlädst.',
  provisioning_not_confirmed: 'Die Freigabe des eingeladenen Kontos konnte nicht bestätigt werden. Bitte das Mitarbeiterprofil im Backend prüfen.',
  login_target_unavailable: 'Der Zugang ist nicht aktiv, hat keine Studiozuordnung oder wurde gerade erst angeschrieben. Bitte prüfen und mindestens 60 Sekunden bis zur nächsten Anfrage warten.',
  email_not_confirmed: 'Der Anmeldelink konnte beim E-Mail-Dienst nicht bestätigt werden. Bitte SMTP-Einstellungen und Versandlimits prüfen.',
};
function explain(error) {
  if (messages[error?.code]) return messages[error.code];
  if (error?.code === '40001') return 'Der Zugang wurde inzwischen geändert. Bitte aktualisieren und die Änderungen erneut prüfen.';
  if (error?.code === '42501') return messages.administrator_required;
  if (['42P01', 'PGRST202', 'PGRST205'].includes(error?.code)) return 'Die Datenbankerweiterung für Mitarbeiterzugänge fehlt. Bitte Migration 003 installieren.';
  if (error?.code === '23514') return 'Bitte die Eingaben prüfen. Aktive Mitarbeiter benötigen einen Standort; der eigene Adminzugang muss aktiv bleiben.';
  return 'Die Aktion konnte nicht bestätigt werden. Bitte Verbindung und Einrichtung des Einladungsdienstes prüfen.';
}
const stamp = value => value ? new Date(value).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' }) : 'Noch nicht angemeldet';

export default function TeamAccessManagement({ client, profile, onChanged }) {
  const [directory, setDirectory] = useState({ members: [], studios: [], total: 0 });
  const [page, setPage] = useState(0); const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null);
  const [input, setInput] = useState(''), [query, setQuery] = useState(''), [roleFilter, setRoleFilter] = useState(''), [statusFilter, setStatusFilter] = useState('all'), [studioFilter, setStudioFilter] = useState('');
  const [selectedMember, setSelectedMember] = useState(null), [importing, setImporting] = useState(false), [legacy, setLegacy] = useState(false);
  const generation = useRef(0); const mounted = useRef(true); const operation = useRef(false);
  const allowed = profile?.active && profile.role === 'admin';
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const version = ++generation.current; let live = true;
    setDirectory({ members: [], studios: [], total: 0 });
    if (!allowed) { setLoading(false); return; }
    setLoading(true); setError('');
    (async () => {
      let result = await client.rpc('admin_team_directory', { p_page: page, p_size: pageSize, p_query: query, p_role: roleFilter, p_status: statusFilter, p_studio: studioFilter || null });
      let old = false;
      if (result.error?.code === 'PGRST202' && !query && !roleFilter && statusFilter === 'all' && !studioFilter) { result = await client.rpc('admin_team_directory', { p_page: page, p_size: pageSize }); old = !result.error; }
      return { ...result, legacy: old };
    })().then(({ data, error: failure, legacy: old }) => {
      if (!live || generation.current !== version) return;
      if (failure) setError(explain(failure));
      else if (!data || !Array.isArray(data.members) || !Array.isArray(data.studios)) setError('Die Zugangsliste konnte nicht bestätigt werden.');
      else { setDirectory(data); setLegacy(old); }
    }).catch(() => { if (live) setError(explain(null)); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [client, profile?.id, allowed, page, refresh, query, roleFilter, statusFilter, studioFilter]);

  async function run(action, success) {
    if (operation.current) return false;
    operation.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await action();
      if (!mounted.current) return false;
      setNotice(success); setEditor(null); setRefresh(n => n + 1); onChanged(); return true;
    } catch (e) { if (mounted.current) setError(explain(e)); return false; }
    finally { operation.current = false; if (mounted.current) setBusy(false); }
  }
  async function invoke(body) {
    const { data, error: failure } = await client.functions.invoke('team-access', { body });
    if (failure) { let details; try { details = await failure.context?.json(); } catch {} throw details || failure; }
    if (!['invitation_requested', 'login_link_requested'].includes(data?.code)) throw data || {};
  }
  function save(input) {
    if (editor.id) return run(async () => {
      const { error: failure } = await client.rpc('admin_set_team_access', { p_user: editor.id, p_full_name: input.fullName.trim(), p_role: input.role, p_studio_ids: input.studioIds, p_active: input.active, p_expected_updated_at: editor.access_updated_at });
      if (failure) throw failure;
    }, 'Mitarbeiterzugang auf dem Server aktualisiert.');
    return run(() => invoke({ action: 'invite', fullName: input.fullName.trim(), email: input.email.trim(), role: input.role, studioIds: input.studioIds }), 'Einladung beim E-Mail-Dienst angefordert. Bitte die Zustellung beim Mitarbeiter prüfen.');
  }
  if (!allowed) return <section className="panel access-locked"><ShieldCheck size={32}/><h2>Zugänge verwaltet die Geschäftsführung.</h2></section>;
  return <section className="access-management">
    <div className="page-heading"><div><div className="eyebrow">NUTZERMANAGEMENT</div><h2>Die richtigen Menschen. Der passende Zugang.</h2><p>Profile, Aufgaben, Lernziele und Rechte deiner Mitarbeiter im Überblick.</p></div><div className="button-group"><button className="button button-secondary" disabled={busy || loading || !directory.studios.length} onClick={() => setImporting(v => !v)}><FileSpreadsheet size={15}/>Nutzer importieren</button><button className="button" disabled={busy || loading || !directory.studios.length} onClick={() => { setEditor({}); setError(''); setNotice(''); }}><Plus size={15}/>Mitarbeiter einladen</button></div></div>
    {error && <div className="team-error" role="alert">{error}</div>}{notice && <div className="team-notice" role="status"><CheckCircle2 size={16}/>{notice}</div>}
    <div className="content-toolbar"><span className="badge"><ShieldCheck size={12}/>Nur Geschäftsführung · Serverdaten</span><button className="button button-secondary" disabled={loading || busy} onClick={() => { setEditor(null); setRefresh(n => n + 1); }}><RefreshCw size={14}/>Zugangsliste aktualisieren</button></div>
    {legacy && <div className="info-note"><ShieldCheck size={15}/><span>Die bisherigen Zugänge sind verfügbar. Für Suche, Filter und Nutzerstatistiken bitte zusätzlich Migration 005 installieren.</span></div>}
    <form className="user-directory-search" onSubmit={e => { e.preventDefault(); setQuery(input.trim()); setPage(0); }}><Search size={17}/><input aria-label="Nutzer nach Name oder E-Mail suchen" placeholder="Name oder E-Mail suchen …" value={input} maxLength={200} disabled={busy || legacy} onChange={e => setInput(e.target.value)}/><button className="button button-secondary" disabled={busy || legacy} type="submit">Nutzer suchen</button></form>
    <div className="user-directory-filters"><label className="field"><span>Rolle filtern</span><select aria-label="Rolle filtern" value={roleFilter} disabled={busy || legacy} onChange={e => { setRoleFilter(e.target.value); setPage(0); }}><option value="">Alle Rollen</option>{Object.entries(roleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="field"><span>Zugangsstatus filtern</span><select aria-label="Zugangsstatus filtern" value={statusFilter} disabled={busy || legacy} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}><option value="all">Alle Zugänge</option><option value="active">Freigeschaltet</option><option value="inactive">Gesperrt</option></select></label><label className="field"><span>Studio filtern</span><select aria-label="Studio filtern" value={studioFilter} disabled={busy || legacy} onChange={e => { setStudioFilter(e.target.value); setPage(0); }}><option value="">Alle Studios</option>{directory.studios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>
    {loading ? <div className="team-loading"><LoaderCircle size={23}/>Zugänge werden geladen …</div> : <section className="panel access-directory"><div className="table-wrap"><table><thead><tr><th>Mitarbeiter</th><th>Rolle & Studios</th><th>Zugang</th><th>Letzte Anmeldung</th><th>Verwalten</th></tr></thead><tbody>{directory.members.map(p => <tr key={p.id}><td><button className="user-profile-open" aria-label={`Nutzerprofil ${p.full_name} öffnen`} onClick={() => setSelectedMember(p)}><UserRound size={15}/><strong>{p.full_name}</strong></button><small>{p.email}</small>{p.module_editor && <span className="badge">Modulbearbeiter</span>}</td><td>{roleLabels[p.role]}<small>{p.role === 'admin' ? 'Alle Studios' : p.studio_ids.map(id => directory.studios.find(s => s.id === id)?.name || 'Unbekannter Standort').join(', ') || 'Kein Studio zugeordnet'}</small></td><td><span className="badge">{p.active ? 'Freigeschaltet' : 'Gesperrt'}</span></td><td>{stamp(p.last_sign_in_at)}</td><td><div className="access-row-actions"><button className="button button-secondary" aria-label={`Zugang für ${p.full_name} bearbeiten`} disabled={busy} onClick={() => { setEditor(p); setError(''); setNotice(''); }}><Settings2 size={13}/>Bearbeiten</button><button className="text-link" disabled={busy || !p.active} onClick={() => run(() => invoke({ action: 'send_login', userId: p.id }), 'Anmeldelink beim E-Mail-Dienst angefordert. Die Zustellung ist damit noch nicht bestätigt.')} aria-label={`Anmeldelink für ${p.full_name} anfordern`}><Mail size={13}/>Anmeldelink anfordern</button></div></td></tr>)}</tbody></table></div>{!directory.members.length && <div className="empty"><h3>Keine Mitarbeiterzugänge auf dieser Seite.</h3></div>}</section>}
    <div className="team-pagination"><span>{directory.total} Zugänge · Seite {page + 1} von {Math.max(1, Math.ceil(directory.total / pageSize))}</span><div className="button-group"><button className="button button-secondary" disabled={loading || busy || page === 0} onClick={() => { setEditor(null); setPage(p => p - 1); }}>Zurück</button><button className="button button-secondary" disabled={loading || busy || (page + 1) * pageSize >= directory.total} onClick={() => { setEditor(null); setPage(p => p + 1); }}>Weitere Zugänge</button></div></div>
    {selectedMember && <TeamUserProfile key={selectedMember.id} client={client} member={selectedMember} studios={directory.studios} onClose={() => setSelectedMember(null)} onEdit={member => { setSelectedMember(null); setEditor(member); }} onChanged={() => { setRefresh(n => n + 1); onChanged(); }}/ >}
    {importing && <TeamUserImport studios={directory.studios} knownMembers={directory.members} invoke={invoke} onComplete={() => { setRefresh(n => n + 1); onChanged(); }} onClose={() => setImporting(false)}/ >}
    {editor && <AccessForm key={editor.id || 'new'} initial={editor} studios={directory.studios} own={editor.id === profile.id} busy={busy} onSave={save} onCancel={() => setEditor(null)}/>}
    <div className="info-note"><ShieldCheck size={17}/><span>Eine Einladung erzeugt einen persönlichen Zugang. Studiozuordnung und Rolle werden serverseitig geprüft. „Gesperrt“ beendet den Zugriff auf neue Teamdaten; bereits zuvor heruntergeladene Inhalte bleiben auf dem Gerät. Bereitschaft und Zustellung des E-Mail-Dienstes müssen im echten Projekt geprüft werden.</span></div>
  </section>;
}

function AccessForm({ initial, studios, own, busy, onSave, onCancel }) {
  const [fullName, setFullName] = useState(initial.full_name || ''); const [email, setEmail] = useState(initial.email || '');
  const [role, setRole] = useState(initial.role || 'employee'); const [active, setActive] = useState(initial.active ?? true);
  const [selected, setSelected] = useState(initial.studio_ids || (studios[0] ? [studios[0].id] : []));
  const [error, setError] = useState('');
  return <section className="panel access-editor"><div className="section-heading"><h2>{initial.id ? 'Mitarbeiterzugang bearbeiten' : 'Neuen Mitarbeiter einladen'}</h2><button className="icon-button" aria-label="Zugangsformular schließen" disabled={busy} onClick={onCancel}><X size={18}/></button></div><form onSubmit={e => { e.preventDefault(); setError(''); if (active && role !== 'admin' && !selected.length) { setError('Wähle mindestens ein Studio für einen aktiven Mitarbeiter.'); return; } void onSave({ fullName, email, role, active, studioIds: selected }); }}>
    {error && <div className="team-error" role="alert">{error}</div>}
    <div className="form-grid"><label className="field"><span>Name des Mitarbeiters</span><input value={fullName} maxLength={100} required disabled={busy} onChange={e => setFullName(e.target.value)}/></label><label className="field"><span>Firmen-E-Mail für den Zugang</span><input type="email" value={email} maxLength={254} required disabled={busy || !!initial.id} autoComplete="off" onChange={e => setEmail(e.target.value)}/></label></div>
    <label className="field"><span>Rolle des Zugangs</span><select aria-label="Rolle des Zugangs" value={role} disabled={busy || own} onChange={e => setRole(e.target.value)}>{Object.entries(roleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <fieldset className="access-studios" disabled={busy}><legend>Zugeordnete Studios</legend>{studios.map(s => <label key={s.id}><input type="checkbox" checked={selected.includes(s.id)} onChange={e => setSelected(current => e.target.checked ? [...current, s.id] : current.filter(id => id !== s.id))}/>{s.name}</label>)}</fieldset>
    {role === 'admin' && <p className="admin-help">Die Geschäftsführung erhält administrativen Zugriff auf alle Studios und das Controlling.</p>}
    {initial.id && <label className="check-field"><input type="checkbox" checked={active} disabled={busy || own} onChange={e => setActive(e.target.checked)}/>Zugang freigeschaltet</label>}
    <p className="admin-help">{own ? 'Dein eigener Adminzugang bleibt aktiv. ' : ''}{initial.id ? 'Beim Speichern werden Rolle, Freigabe und Studiozuordnungen gemeinsam geändert. Die E-Mail-Adresse bleibt unverändert.' : `Beim Einladen wird eine E-Mail mit einem persönlichen Anmeldelink an ${email || 'die angegebene Firmenadresse'} angefordert. Ein Postfachpasswort wird nicht benötigt.`}</p>
    <div className="button-group"><button className="button" type="submit" disabled={busy}>{busy ? <LoaderCircle size={15}/> : initial.id ? <Save size={15}/> : <Mail size={15}/>} {busy ? 'Wird verarbeitet …' : initial.id ? 'Zugang speichern' : 'Einladung anfordern'}</button><button className="button button-secondary" type="button" disabled={busy} onClick={onCancel}>Abbrechen</button></div>
  </form></section>;
}
