import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ClipboardList, GraduationCap, LoaderCircle, Settings2, ShieldCheck, X } from 'lucide-react';
import { roleLabels } from './module-model';

const time = value => value ? new Date(value).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' }) : 'Noch nicht angemeldet';
export default function TeamUserProfile({ client, member, studios, onClose, onEdit, onChanged }) {
  const dialog = useRef(null), alive = useRef(true);
  const [data, setData] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [rights, setRights] = useState({ create: false, edit: false, publish: false });
  useEffect(() => {
    alive.current = true; const element = dialog.current; element.showModal();
    client.rpc('admin_team_member_detail', { p_user: member.id }).then(({ data: result, error: failure }) => {
      if (!alive.current) return;
      if (failure) setError(['PGRST202', '42P01'].includes(failure.code) ? 'Die Profilerweiterung fehlt noch. Bitte Migration 005 installieren.' : 'Das Nutzerprofil konnte nicht geladen werden.');
      else { setData(result); setRights(result.design_rights); }
    }).catch(() => { if (alive.current) setError('Das Nutzerprofil ist gerade nicht erreichbar.'); }).finally(() => { if (alive.current) setLoading(false); });
    return () => { alive.current = false; element.close(); };
  }, [client, member.id]);
  function choose(right, checked) { setRights(old => { const next = { ...old, [right]: checked }; if (checked && right !== 'edit') next.edit = true; if (!checked && right === 'edit') { next.create = false; next.publish = false; } return next; }); }
  async function save(e) {
    e.preventDefault(); if (busy) return; setBusy(true); setError(''); setNotice('');
    try { const result = await client.from('module_permissions').upsert({ user_id: member.id, can_create: rights.create, can_edit: rights.edit, can_publish: rights.publish }).select('user_id').single(); if (result.error) throw result.error; if (alive.current) { setNotice('Modulrechte auf dem Server gespeichert.'); onChanged(); } }
    catch { if (alive.current) setError('Die Modulrechte konnten nicht bestätigt werden. Bitte die Berechtigung und Verbindung prüfen.'); }
    finally { if (alive.current) setBusy(false); }
  }
  const current = data?.member || member;
  const initials = current.full_name.split(' ').map(s => s[0]).slice(0, 2).join('');
  return <dialog ref={dialog} className="user-profile-dialog" aria-label={`Nutzerprofil ${member.full_name}`} onCancel={e => { if (busy) e.preventDefault(); else onClose(); }}><div className="user-profile-heading"><span className="user-avatar">{initials}</span><div><h2>{current.full_name}</h2><p>{roleLabels[current.role]} · {current.active ? 'Freigeschaltet' : 'Gesperrt'}</p></div><button className="icon-button" aria-label="Nutzerprofil schließen" disabled={busy} onClick={onClose}><X size={21}/></button></div><div className="user-profile-body">
    {error && <div role="alert" className="team-error">{error}</div>}{notice && <div className="team-notice" role="status"><CheckCircle2 size={15}/>{notice}</div>}
    <div className="user-profile-info"><div><small>Firmen-E-Mail</small><strong>{current.email}</strong></div><div><small>Standorte</small><strong>{current.role === 'admin' ? 'Alle Studios' : member.studio_ids.map(id => studios.find(s => s.id === id)?.name || 'Unbekannt').join(', ') || 'Keine Zuordnung'}</strong></div><div><small>Letzte Anmeldung</small><strong>{time(current.last_sign_in_at)}</strong></div></div>
    <button className="button button-secondary" disabled={busy} onClick={() => onEdit({ ...member, ...current })}><Settings2 size={14}/>Zugang bearbeiten</button>
    {loading ? <div className="team-loading"><LoaderCircle size={23}/>Nutzerübersicht wird geladen …</div> : data && <>
      <h3><ClipboardList size={17}/>Zugewiesene Aufgaben · Gesamtstand</h3><div className="user-stat-grid">{[['Zugewiesen', data.tasks.total], ['Erledigt', data.tasks.done], ['Offen', data.tasks.open], ['Überfällig', data.tasks.overdue]].map(([label, value]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}</div>
      <h3><GraduationCap size={17}/>Zugewiesene Lernziele</h3>{data.courses.length ? data.courses.map(course => <div className="user-course" key={course.id}><div><strong>{course.title}</strong><small>{course.lessons_read}/{course.lesson_count} Lektionen gelesen{course.due_date ? ` · Zieltermin ${course.due_date}` : ''}</small></div><div><span className="badge">{course.quiz_passed ? 'Wissen geprüft' : 'Wissen offen'}</span>{course.practice_required && <span className="badge">{course.practice_confirmed ? 'Praxis bestätigt' : 'Praxis offen'}</span>}</div></div>) : <p className="user-empty-note">Noch keine individuellen Lernziele zugewiesen.</p>}
      <h3><ShieldCheck size={17}/>Bearbeiterrechte im Modulbaukasten</h3><form className="user-editor-rights" onSubmit={save}>{[['edit', 'Module bearbeiten'], ['create', 'Neue Module erstellen'], ['publish', 'Modulversionen veröffentlichen']].map(([right, label]) => <label key={right}><input type="checkbox" checked={current.role === 'admin' || rights[right]} disabled={busy || current.role === 'admin'} onChange={e => choose(right, e.target.checked)}/>{label}</label>)}<p>Diese Rechte erlauben die Gestaltung von Modulen. Zugriffe auf deren Einträge folgen weiterhin den Standort- und Leserfreigaben. Admin- und Controllingrechte werden separat über die Rolle vergeben.</p>{current.role !== 'admin' && <button className="button button-secondary" type="submit" disabled={busy}>Modulrechte speichern</button>}</form>
    </>}
  </div></dialog>;
}
