import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, LoaderCircle, Mail, Plus, RefreshCw, Save, Search, Settings2, ShieldCheck, UserRound, X } from 'lucide-react';
import { roleLabels } from './module-model';
import './team-access.css';
import TeamUserProfile from './TeamUserProfile';
import TeamUserImport from './TeamUserImport';
import TeamMailCheck from './TeamMailCheck';
import {OperationsButton} from './TeamOperationsCheck';
import {explainAccessError as explain,invokeTeamAccess} from './team-access-client';
import {RoleCards,RolePicker} from './TeamRoles';
import {usePermissions} from './team-permissions';
import InvitationOnboarding from './InvitationOnboarding';
import {berlinDay} from './clock';
import {onboardingError,onboardingMigrationUrl} from './onboarding-model';
import {checkInvitationOnboarding,invitationOnboardingPlan,invitedEnrollmentArgs,isInvitationUserId} from './invitation-onboarding';

const pageSize = 50;
const stamp = value => value ? new Date(value).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' }) : 'Noch nicht angemeldet';

export default function TeamAccessManagement({ client, profile, onChanged }) {
  const {can,version:permissionVersion}=usePermissions();
  const [pendingInvitation,setPendingInvitation]=useState(null);const invitationRequest=useRef(null);
  const [directory, setDirectory] = useState({ members: [], studios: [], total: 0 });
  const [page, setPage] = useState(0); const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(null),[mailCheck,setMailCheck]=useState(null);
  const feedbackRef=useRef(null);
  useEffect(()=>{if(!editor&&(error||notice))feedbackRef.current?.scrollIntoView({block:'center',behavior:'instant'});},[error,notice,editor]);
  const [input, setInput] = useState(''), [query, setQuery] = useState(''), [roleFilter, setRoleFilter] = useState(''), [statusFilter, setStatusFilter] = useState('all'), [studioFilter, setStudioFilter] = useState('');
  const [view,setView]=useState('directory');
  const [selectedMember, setSelectedMember] = useState(null), [importing, setImporting] = useState(false), [legacy, setLegacy] = useState(false);
  const generation = useRef(0); const mounted = useRef(true); const operation = useRef(false);
  const allowed = profile?.active && can('users.view',profile.role==='admin');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; invitationRequest.current?.abort(); }; }, []);
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
  const invoke=body=>invokeTeamAccess(client,body);

  async function saveInvitation(input) {
    if(operation.current)return false;operation.current=true;setBusy(true);setError('');setNotice('');let next=pendingInvitation,stage=next?'onboarding':'preflight';
    const controller=invitationRequest.current=new AbortController();
    try{
      if(!next){
        const plan=invitationOnboardingPlan(input.onboarding,input.studioIds);
        if(plan){if(permissionVersion<12||!can('onboarding.assign'))throw {code:'42501'};await checkInvitationOnboarding(client,plan,controller.signal);}
        if(!mounted.current||controller.signal.aborted)return false;
        stage='invite';const receipt=await invoke({action:'invite',fullName:input.fullName.trim(),email:input.email.trim(),role:input.role,studioIds:input.studioIds});
        if(!mounted.current)return false;
        if(!plan){setNotice('Einladung beim E-Mail-Dienst angefordert. Bitte die Zustellung beim Mitarbeiter prüfen.');setEditor(null);setRefresh(n=>n+1);onChanged();return true;}
        next={userId:receipt.userId,fullName:input.fullName.trim(),email:input.email.trim(),plan};setPendingInvitation(next);
      }
      stage='onboarding';if(permissionVersion<12||!can('onboarding.assign'))throw {code:'42501'};
      const args=invitedEnrollmentArgs(next.plan,next.userId);const result=await client.rpc('enroll_onboarding',args).abortSignal(controller.signal);if(result.error)throw result.error;
      if(result.data!==next.plan.nonce)throw {invitationMessage:'Die Onboarding-Zuweisung konnte nicht bestätigt werden. Bitte mit derselben Zuweisung erneut versuchen.'};
      if(!mounted.current||controller.signal.aborted)return false;
      setPendingInvitation(null);setEditor(null);setNotice('Einladung beim E-Mail-Dienst angefordert und Onboarding auf dem Server zugewiesen. Bitte die E-Mail-Zustellung beim Mitarbeiter prüfen.');setRefresh(n=>n+1);onChanged();return true;
    }catch(e){if(mounted.current&&!controller.signal.aborted){const detail=e.invitationMessage||onboardingError(e);setError(stage==='invite'?explain(e):next?`Die Einladung wurde bereits angefordert. Onboarding noch nicht bestätigt: ${detail}`:`Vorprüfung fehlgeschlagen. Es wurde noch keine Einladung angefordert. ${detail}`);}return false;}
    finally{operation.current=false;if(mounted.current)setBusy(false);}
  }
  function finishLater(){setPendingInvitation(null);setEditor(null);setError('');setNotice('Die Einladung wurde angefordert. Die Onboarding-Zuweisung ist noch nicht bestätigt. Prüfe den Plan im Lernhub, bevor du ihn dort erneut zuweist.');setRefresh(n=>n+1);onChanged();}
  function save(input) {
    if (editor.id) return run(async () => {
      const { error: failure } = await client.rpc('admin_set_team_access', { p_user: editor.id, p_full_name: input.fullName.trim(), p_role: input.role, p_studio_ids: input.studioIds, p_active: input.active, p_expected_updated_at: editor.access_updated_at });
      if (failure) throw failure;
    }, 'Mitarbeiterzugang auf dem Server aktualisiert.');
    return saveInvitation(input);
  }
  if (!allowed) return <section className="panel access-locked"><ShieldCheck size={32}/><h2>Zugänge verwaltet die Geschäftsführung.</h2></section>;
  return <section className="access-management">
    <div className="page-heading"><div><div className="eyebrow">NUTZERMANAGEMENT</div><h2>Dein Team. Alle Profile im Überblick.</h2><p>Mitarbeiter und Verwaltungsrollen übersichtlich organisieren. Ein Profil für Informationen, Lernfortschritt und Rechte.</p></div><div className="button-group">{can('users.import',true)&&<button className="button button-secondary" disabled={busy || loading || !directory.studios.length} onClick={() => setImporting(v => !v)}><FileSpreadsheet size={15}/>Nutzer importieren</button>}{can('users.invite',true)&&<button className="button" disabled={busy || loading || !directory.studios.length || !!pendingInvitation} onClick={() => { setEditor({}); setError(''); setNotice(''); }}><Plus size={15}/>Mitarbeiter einladen</button>}</div></div>
    <div ref={feedbackRef} className="access-feedback">{error && !editor && <div className="team-error" role="alert">{error}</div>}{notice && <div className="team-notice" role="status"><CheckCircle2 size={16}/>{notice}</div>}</div>
    {pendingInvitation&&!editor&&<section className="panel invitation-pending"><h3>Einladung angefordert · Onboarding noch offen</h3><p>{pendingInvitation.fullName} · {pendingInvitation.email}</p><p>{pendingInvitation.plan.title} · {pendingInvitation.plan.studioName} · Start: {pendingInvitation.plan.start} · Mentor: {pendingInvitation.plan.mentorName}</p><p>Die Zuweisung ist noch nicht bestätigt. Erneut versuchen prüft dieselbe Zuweisung, ohne eine weitere Einladung anzufordern.</p><div className="button-group"><button className="button" disabled={busy||!isInvitationUserId(pendingInvitation.userId)||!can('onboarding.assign')} onClick={()=>saveInvitation(null)}>Onboarding-Zuweisung erneut versuchen</button><button className="button button-secondary" disabled={busy} onClick={finishLater}>Später im Lernhub prüfen</button></div></section>}
    <div className="content-toolbar"><span className="badge"><ShieldCheck size={12}/>Nur Geschäftsführung · Serverdaten</span>{profile.role==='admin'&&<OperationsButton client={client}/>}<button className="button button-secondary" disabled={loading || busy} onClick={() => { setEditor(null); setRefresh(n => n + 1); }}><RefreshCw size={14}/>Zugangsliste aktualisieren</button></div>
    {legacy && <div className="info-note"><ShieldCheck size={15}/><span>Die bisherigen Zugänge sind verfügbar. Für Suche, Filter und Nutzerstatistiken bitte zusätzlich Migration 005 installieren.</span></div>}
    <div className="management-tabs" role="tablist" aria-label="Nutzerverwaltung">{[['','Alle Nutzer'],['employee','Mitarbeiter'],['studio_manager','Studioleitungen'],['admin','Admins']].map(([key,label])=><button role="tab" key={key} aria-selected={view==='directory'&&roleFilter===key} onClick={()=>{setView('directory');setRoleFilter(key);setPage(0);}}><UserRound size={15}/>{label}</button>)}<button role="tab" aria-selected={view==='roles'} onClick={()=>setView('roles')}><ShieldCheck size={15}/>Rollen & Rechte</button></div>
    {view==='roles'?<><RoleCards selected={roleFilter} onSelect={key=>{setView('directory');setRoleFilter(key);setPage(0);}}/><section className="panel role-guide"><h3><ShieldCheck size={18}/>Grundrolle + Bereiche + Bearbeiterrechte</h3><p>Die Grundrolle legt den Verantwortungsbereich fest. Im Mitarbeiterprofil bestimmst du zusätzliche Bereichsfreigaben sowie Rechte zum Erstellen, Bearbeiten und Veröffentlichen von Modulen. Die Startseite hat eine eigene Bearbeiterfreigabe. Zusätzliche Rechte erweitern keine Studiozuordnung.</p></section></>:<>
    <form className="user-directory-search" onSubmit={e => { e.preventDefault(); setQuery(input.trim()); setPage(0); }}><Search size={17}/><input aria-label="Nutzer nach Name oder E-Mail suchen" placeholder="Name oder E-Mail suchen …" value={input} maxLength={200} disabled={busy || legacy} onChange={e => setInput(e.target.value)}/><button className="button button-secondary" disabled={busy || legacy} type="submit">Nutzer suchen</button></form>
    <div className="user-directory-filters"><label className="field"><span>Rolle filtern</span><select aria-label="Rolle filtern" value={roleFilter} disabled={busy || legacy} onChange={e => { setRoleFilter(e.target.value); setPage(0); }}><option value="">Alle Rollen</option>{Object.entries(roleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="field"><span>Zugangsstatus filtern</span><select aria-label="Zugangsstatus filtern" value={statusFilter} disabled={busy || legacy} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}><option value="all">Alle Zugänge</option><option value="active">Freigeschaltet</option><option value="inactive">Gesperrt</option></select></label><label className="field"><span>Studio filtern</span><select aria-label="Studio filtern" value={studioFilter} disabled={busy || legacy} onChange={e => { setStudioFilter(e.target.value); setPage(0); }}><option value="">Alle Studios</option>{directory.studios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>
    {loading ? <div className="team-loading"><LoaderCircle size={23}/>Zugänge werden geladen …</div> : <section className="panel access-directory"><div className="table-wrap"><table><thead><tr><th>Mitarbeiter</th><th>Rolle & Studios</th><th>Zugang</th><th>Letzte Anmeldung</th><th>Verwalten</th></tr></thead><tbody>{directory.members.map(p => <tr key={p.id}><td><button className="user-profile-open" aria-label={`Nutzerprofil ${p.full_name} öffnen`} onClick={() => setSelectedMember(p)}><span className="directory-avatar" aria-hidden="true">{p.full_name.split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('')}</span><strong>{p.full_name}</strong></button><small>{p.email}</small>{p.module_editor && <span className="badge">Modulbearbeiter</span>}</td><td>{roleLabels[p.role]}<small>{p.role === 'admin' ? 'Alle Studios' : p.studio_ids.map(id => directory.studios.find(s => s.id === id)?.name || 'Unbekannter Standort').join(', ') || 'Kein Studio zugeordnet'}</small></td><td><span className="badge">{p.active ? 'Freigeschaltet' : 'Gesperrt'}</span></td><td>{stamp(p.last_sign_in_at)}</td><td><div className="access-row-actions">{can('users.access',true)&&<button className="button button-secondary" aria-label={`Zugang für ${p.full_name} bearbeiten`} disabled={busy} onClick={() => { setEditor(p); setError(''); setNotice(''); }}><Settings2 size={13}/>Bearbeiten</button>}{can('users.login',true)&&<button className="text-link" disabled={busy||legacy} onClick={e=>{e.currentTarget.focus();setMailCheck(p);}} aria-label={`E-Mail-Zugang für ${p.full_name} prüfen`}>E-Mail-Zugang prüfen</button>}{can('users.login',true)&&<button className="text-link" disabled={busy || !p.active} onClick={() => run(() => invoke({ action: 'send_login', userId: p.id }), 'Anmeldelink beim E-Mail-Dienst angefordert. Die Zustellung ist damit noch nicht bestätigt.')} aria-label={`Anmeldelink für ${p.full_name} anfordern`}><Mail size={13}/>Anmeldelink anfordern</button>}</div></td></tr>)}</tbody></table></div>{!directory.members.length && <div className="empty"><h3>Keine Mitarbeiterzugänge auf dieser Seite.</h3></div>}</section>}
    <div className="team-pagination"><span>{directory.total} Zugänge · Seite {page + 1} von {Math.max(1, Math.ceil(directory.total / pageSize))}</span><div className="button-group"><button className="button button-secondary" disabled={loading || busy || page === 0} onClick={() => { setEditor(null); setPage(p => p - 1); }}>Zurück</button><button className="button button-secondary" disabled={loading || busy || (page + 1) * pageSize >= directory.total} onClick={() => { setEditor(null); setPage(p => p + 1); }}>Weitere Zugänge</button></div></div>
    </>}
    {mailCheck&&<TeamMailCheck key={mailCheck.id} client={client} member={mailCheck} onClose={()=>setMailCheck(null)} onSent={()=>setRefresh(n=>n+1)}/>}
    {selectedMember && <TeamUserProfile key={selectedMember.id} client={client} member={selectedMember} administrator={profile.role==='admin'} studios={directory.studios} onClose={() => setSelectedMember(null)} onEdit={member => { setSelectedMember(null); setEditor(member); }} onChanged={() => { setRefresh(n => n + 1); onChanged(); }}/ >}
    {importing && <TeamUserImport studios={directory.studios} knownMembers={directory.members} invoke={invoke} onComplete={() => { setRefresh(n => n + 1); onChanged(); }} onClose={() => setImporting(false)}/ >}
    {editor && <AccessForm key={editor.id || 'new'} initial={editor} studios={directory.studios} own={editor.id === profile.id} administrator={profile.role==='admin'} client={client} canOnboard={permissionVersion>=12&&can('onboarding.assign')} onboardingAvailable={permissionVersion>=12} pending={!editor.id?pendingInvitation:null} busy={busy} serverError={error} onSave={save} onCancel={() => {setEditor(null);if(pendingInvitation)setRefresh(n=>n+1);}}/>}
    <div className="info-note"><ShieldCheck size={17}/><span>Eine Einladung erzeugt einen persönlichen Zugang. Studiozuordnung und Rolle werden serverseitig geprüft. „Gesperrt“ beendet den Zugriff auf neue Teamdaten; bereits zuvor heruntergeladene Inhalte bleiben auf dem Gerät. Bereitschaft und Zustellung des E-Mail-Dienstes müssen im echten Projekt geprüft werden.</span></div>
  </section>;
}

function AccessForm({ initial, studios, own, administrator=true, client, canOnboard=false, onboardingAvailable=false, pending=null, busy, serverError='', onSave, onCancel }) {
  const dialogRef=useRef(null),nameRef=useRef(null),alertRef=useRef(null);
  useEffect(()=>{const dialog=dialogRef.current,previous=document.activeElement;dialog.showModal();nameRef.current?.focus({preventScroll:true});return()=>{dialog.close();if(previous?.isConnected)previous.focus({preventScroll:true});};},[]);
  const [fullName, setFullName] = useState(initial.full_name || ''); const [email, setEmail] = useState(initial.email || '');
  const [role, setRole] = useState(initial.role || 'employee'); const [active, setActive] = useState(initial.active ?? true);
  const [selected, setSelected] = useState(initial.studio_ids || (studios[0] ? [studios[0].id] : []));
  const [error, setError] = useState('');
  const [onboarding,setOnboarding]=useState(()=>({enabled:false,studio:studios[0]?.id||'',template:'',start:berlinDay(),mentor:'',nonce:crypto.randomUUID(),ready:false})),[reviewed,setReviewed]=useState(false);
  useEffect(()=>{setReviewed(false);},[fullName,email,role,selected.join('|'),onboarding.template,onboarding.studio,onboarding.start,onboarding.mentor,onboarding.revision,onboarding.ready]);
  useEffect(()=>{if(!canOnboard&&!pending){setOnboarding(old=>old.enabled?{enabled:false,studio:selected[0]||'',template:'',start:old.start,mentor:'',nonce:old.nonce,ready:false}:old);setReviewed(false);}},[canOnboard,pending]);
  useEffect(()=>{if(serverError||error){dialogRef.current?.scrollTo({top:0});alertRef.current?.focus({preventScroll:true});}},[serverError,error]);
  return <dialog ref={dialogRef} className="panel access-editor access-editor-dialog" aria-labelledby="access-editor-title" onCancel={e=>{e.preventDefault();if(!busy)onCancel();}}><div className="section-heading"><h2 id="access-editor-title">{initial.id ? 'Mitarbeiterzugang bearbeiten' : 'Neuen Mitarbeiter einladen'}</h2><button className="icon-button" aria-label="Zugangsformular schließen" disabled={busy} onClick={onCancel}><X size={18}/></button></div><form onSubmit={e => { e.preventDefault(); setError(''); if (active && role !== 'admin' && !selected.length) { setError('Wähle mindestens ein Studio für einen aktiven Mitarbeiter.'); return; } if(onboarding.enabled&&!pending){try{invitationOnboardingPlan(onboarding,selected);}catch(e){setError(e.message);return;}if(!reviewed){setError('Bitte prüfe die Vorschau und bestätige die geplante Zuordnung.');return;}}void onSave({ fullName, email, role, active, studioIds: selected, onboarding }); }}>
    {(serverError||error) && <div ref={alertRef} tabIndex={-1} className="team-error" role="alert">{error||serverError}</div>}
    <fieldset className="invitation-access-locked" disabled={busy||!!pending}><div className="form-grid"><label className="field"><span>Name des Mitarbeiters</span><input ref={nameRef} value={fullName} maxLength={100} required disabled={busy} onChange={e => setFullName(e.target.value)}/></label><label className="field"><span>Firmen-E-Mail für den Zugang</span><input type="email" value={email} maxLength={254} required disabled={busy || !!initial.id} autoComplete="off" onChange={e => setEmail(e.target.value)}/></label></div>
    <RolePicker role={role} onChange={setRole} disabled={busy||own||!administrator}/>
    <label className="field"><span>Rolle des Zugangs</span><select aria-label="Rolle des Zugangs" value={role} disabled={busy || own || !administrator} onChange={e => setRole(e.target.value)}>{Object.entries(roleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <fieldset className="access-studios" disabled={busy}><legend>Zugeordnete Studios</legend>{studios.map(s => <label key={s.id}><input type="checkbox" checked={selected.includes(s.id)} onChange={e => setSelected(current => e.target.checked ? [...current, s.id] : current.filter(id => id !== s.id))}/>{s.name}</label>)}</fieldset>
    {role === 'admin' && <p className="admin-help">Die Geschäftsführung erhält administrativen Zugriff auf alle Studios und das Controlling.</p>}
    {initial.id && <label className="check-field"><input type="checkbox" checked={active} disabled={busy || own} onChange={e => setActive(e.target.checked)}/>Zugang freigeschaltet</label>}
    </fieldset>
    {!initial.id&&!pending&&<>{canOnboard?<label className="invitation-onboarding-toggle"><input type="checkbox" checked={onboarding.enabled} disabled={busy} onChange={e=>{setOnboarding(old=>({...old,enabled:e.target.checked,ready:false}));setReviewed(false);}}/>Onboarding direkt mit dieser Einladung zuweisen</label>:<p className="admin-help">{onboardingAvailable?'Für die direkte Onboarding-Zuweisung benötigst du zusätzlich die Freigabe „Einarbeitungspläne Mitarbeitern zuweisen“.':<>Die direkte Onboarding-Zuweisung benötigt die vorhandene <a href={onboardingMigrationUrl} target="_blank" rel="noreferrer">Erweiterung 012</a>.</>}</p>}{canOnboard&&onboarding.enabled&&<><InvitationOnboarding client={client} value={onboarding} onChange={setOnboarding} studios={studios} selectedStudios={selected} disabled={busy}/><label className="invitation-review"><input type="checkbox" required checked={reviewed} disabled={busy||!onboarding.ready} onChange={e=>setReviewed(e.target.checked)}/>Ich habe Mitarbeiter, Studio, Vorlage, Mentor und die Fälligkeiten geprüft.</label></>}</>}
    {pending&&<div className="invitation-progress" role="status"><strong>Einladung bereits angefordert</strong><p>{pending.fullName} · {pending.email}</p><p>{pending.plan.title} · {pending.plan.studioName} · Start: {pending.plan.start} · Mentor: {pending.plan.mentorName}</p><p>{busy?'Die Onboarding-Zuweisung wird geprüft …':'Nur die Onboarding-Zuweisung erneut versuchen. Es wird keine weitere Einladungsmail angefordert. Du kannst das Formular auch schließen und die Zuweisung anschließend fortsetzen.'}</p></div>}
    <p className="admin-help">{own ? 'Dein eigener Adminzugang bleibt aktiv. ' : ''}{initial.id ? 'Beim Speichern werden Rolle, Freigabe und Studiozuordnungen gemeinsam geändert. Die E-Mail-Adresse bleibt unverändert.' : `Beim Einladen wird eine E-Mail mit einem persönlichen Anmeldelink an ${email || 'die angegebene Firmenadresse'} angefordert. Ein Postfachpasswort wird nicht benötigt.`}</p>
    <div className="button-group"><button className="button" type="submit" disabled={busy||!!pending&&(!canOnboard||!isInvitationUserId(pending.userId))}>{busy ? <LoaderCircle size={15}/> : initial.id ? <Save size={15}/> : <Mail size={15}/>} {busy ? 'Wird verarbeitet …' : initial.id ? 'Zugang speichern' : pending ? 'Onboarding erneut zuweisen' : onboarding.enabled ? 'Einladung und Onboarding starten' : 'Einladung anfordern'}</button><button className="button button-secondary" type="button" disabled={busy} onClick={onCancel}>Abbrechen</button></div>
  </form></dialog>;
}
