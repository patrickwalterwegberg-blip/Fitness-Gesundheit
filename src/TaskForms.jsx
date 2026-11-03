import React, { useState } from 'react';
import { Check, Edit3, Save, Send, Clock3, MessageCircle } from 'lucide-react';
import { taskStatus, taskStatuses } from './task-model';
import './task-forms.css';

const repeats = ['Einmalig', 'Täglich', 'Wöchentlich', 'Monatlich', 'Jährlich'];
const timestamp = value => new Date(value).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function TaskEditor({ initial = {}, people, studios, studio, person, today, onSave, onCancel }) {
  const [site, setSite] = useState(initial.studio || (studio === 'Alle Studios' ? 'Dörpen' : studio));
  const [personId, setPersonId] = useState(initial.personId || people.find(p => p.name === initial.person)?.id || person.id);
  const eligible = people.filter(p => p.active !== false && (p.studio === site || p.studio === 'Alle Studios'));
  const assignee = eligible.some(p => p.id === personId) ? personId : eligible[0]?.id || '';
  return <form className="task-editor" onSubmit={e => {
    e.preventDefault(); const form = Object.fromEntries(new FormData(e.currentTarget)); const chosen = eligible.find(p => p.id === assignee);
    if (!chosen) return;
    onSave({ ...form, title: form.title.trim(), studio: site, personId: chosen.id, person: chosen.name });
  }}>
    <label className="field"><span>Was steht an?</span><input name="title" required maxLength={180} defaultValue={initial.title || ''} placeholder="Aufgabe beschreiben"/></label>
    <label className="field"><span>Beschreibung & Hinweise</span><textarea name="description" maxLength={5000} rows={3} defaultValue={initial.description || ''} placeholder="Was ist zu tun? Welche Unterlagen werden benötigt?"/></label>
    <div className="form-grid">
      <label className="field"><span>Studio</span><select name="studio" value={site} onChange={e => setSite(e.target.value)}>{studios.slice(1).map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="field"><span>Verantwortlich</span><select name="personId" value={assignee} required onChange={e => setPersonId(e.target.value)}>{!eligible.length && <option value="">Kein passendes Profil vorhanden</option>}{eligible.map(p => <option key={p.id} value={p.id}>{p.name} · {p.studio}</option>)}</select></label>
      <label className="field"><span>Fällig am</span><input name="due" type="date" required defaultValue={initial.due || today}/></label>
      <label className="field"><span>Priorität</span><select name="priority" defaultValue={initial.priority || 'Normal'}><option>Normal</option><option>Hoch</option></select></label>
      <label className="field"><span>Bereich</span><select name="category" defaultValue={initial.category || 'Team'}>{['Team', 'Technik', 'Marketing', 'Lager', 'Sicherheit', 'Allgemein'].map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="field"><span>Wiederholung</span><select name="repeat" defaultValue={initial.repeat || 'Einmalig'}>{repeats.map(s => <option key={s}>{s}</option>)}</select></label>
    </div>
    {!eligible.length && <p className="form-error">Lege zunächst ein Mitarbeiterprofil für diesen Standort an.</p>}
    <div className="form-actions"><button type="button" className="button button-secondary" onClick={onCancel}>Abbrechen</button><button type="submit" className="button" disabled={!assignee}><Save size={15}/>{initial.id ? 'Änderungen speichern' : 'Aufgabe erstellen'}</button></div>
  </form>;
}

export function TaskDetails({ task, onStatus, onEdit, onComment }) {
  return <div className="task-detail-view">
    <div className="task-detail-top"><span className="badge">{task.category}</span><button className="button button-secondary" onClick={onEdit}><Edit3 size={14}/>Bearbeiten</button></div>
    {task.description && <p className="task-description">{task.description}</p>}
    <dl className="detail-list"><div><dt>Standort</dt><dd>{task.studio}</dd></div><div><dt>Verantwortlich</dt><dd>{task.person}</dd></div><div><dt>Fälligkeit</dt><dd>{new Date(task.due + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</dd></div><div><dt>Wiederholung</dt><dd>{task.repeat}</dd></div><div><dt>Priorität</dt><dd>{task.priority}</dd></div></dl>
    <label className="field"><span>Bearbeitungsstatus</span><select aria-label="Bearbeitungsstatus" value={taskStatus(task)} onChange={e => onStatus(e.target.value)}>{taskStatuses.map(s => <option key={s}>{s}</option>)}</select></label>
    {taskStatus(task) !== 'Erledigt' && <button className="button" onClick={() => onStatus('Erledigt')}><Check size={15}/>Als erledigt markieren</button>}
    <section className="task-comments"><h3><MessageCircle size={16}/>Rückmeldungen <span>{task.comments?.length || 0}</span></h3>{task.comments?.length ? task.comments.map(c => <article key={c.id}><div><strong>{c.author}</strong><time dateTime={c.at}>{timestamp(c.at)}</time></div><p>{c.text}</p></article>) : <p className="small-muted">Noch keine Rückmeldung. Halte hier Fragen oder den nächsten Schritt fest.</p>}<form onSubmit={e => { e.preventDefault(); const text = new FormData(e.currentTarget).get('comment').trim(); if (!text) return; onComment(text); e.currentTarget.reset(); }}><label className="field"><span>Deine Rückmeldung</span><textarea name="comment" rows={3} required maxLength={3000} placeholder="Was gibt es Neues zu dieser Aufgabe?"/></label><button type="submit" className="button button-secondary"><Send size={14}/>Rückmeldung speichern</button></form></section>
    {!!task.history?.length && <section className="task-history"><h3><Clock3 size={16}/>Verlauf · lokale Demo</h3>{task.history.slice().reverse().map(event => <div key={event.id}><span/><div><strong>{event.message}</strong><p>{event.actor} · {timestamp(event.at)}</p></div></div>)}</section>}
  </div>;
}
