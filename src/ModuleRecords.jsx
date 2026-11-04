import React, { useState } from 'react';
import { ArrowRight, Download, FileText, Layers3, Plus, Save, ShieldCheck, X } from 'lucide-react';
import { canReadSchema, canWriteSchema, publishedVersion, targets, validateRecord } from './module-model';
import { localFiles, downloadLocalFile } from './local-files';

export function RecordFields({ fields, values, onChange, people, disabled = false, online = false }) {
  return <>{fields.map(f => <label className={'field module-record-field ' + (f.type === 'checkbox' ? 'record-checkbox' : '')} key={f.id}><span>{f.label || 'Unbenanntes Feld'}{f.required ? ' *' : ''}</span>{f.type === 'checkbox' ? <input type="checkbox" required={!!f.required} disabled={disabled} checked={values[f.id] === true} onChange={e => onChange(f.id, e.target.checked)}/>
    : f.type === 'textarea' ? <textarea rows={3} required={!!f.required} disabled={disabled} maxLength={5000} value={values[f.id] || ''} onChange={e => onChange(f.id, e.target.value)}/>
    : f.type === 'select' || f.type === 'member' ? <select aria-label={f.label || 'Unbenanntes Auswahlfeld'} required={!!f.required} disabled={disabled} value={values[f.id] || ''} onChange={e => onChange(f.id, e.target.value)}><option value="">Bitte auswählen</option>{f.type === 'select' ? (f.options || []).map((o, i) => <option key={i}>{o}</option>) : people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    : f.type === 'file' ? <><input type="file" disabled={disabled || online} required={!!f.required && !values[f.id]} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.webp" onChange={e => onChange(f.id, e.target.files?.[0])}/>{values[f.id]?.name && <small>{values[f.id].name}</small>}{online && <small>Gemeinsamer Dateispeicher ist noch nicht eingerichtet.</small>}</>
    : <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} step={f.type === 'number' ? 'any' : undefined} maxLength={f.type === 'text' ? 5000 : undefined} required={!!f.required} disabled={disabled} value={values[f.id] ?? ''} onChange={e => onChange(f.id, f.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)}/>}</label>)}</>;
}

function RecordForm({ actor, people, studios, module, version, entity, initial, onSave, onCancel, online = false }) {
  const [values, setValues] = useState(initial?.values || {});
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const live = publishedVersion(module);
  const choices = studios.slice(1).filter(s => canWriteSchema(actor, live.schema, s));
  const [site, setSite] = useState((entity?.studio && entity.studio !== 'Alle Studios' ? entity.studio : null) || initial?.studio || (choices.includes(actor.studio) ? actor.studio : choices[0] || ''));
  const eligible = people.filter(p => p.active !== false && (p.studio === site || p.studio === 'Alle Studios'));
  async function submit(e) {
    e.preventDefault(); if (saving) return; setError(''); setSaving(true); const uploaded = [];
    try {
      if (online && Object.values(values).some(v => v instanceof File)) throw new Error('Gemeinsamer Dateispeicher ist noch nicht eingerichtet.');
      if (!canWriteSchema(actor, live.schema, site)) throw new Error('Du hast für diesen Standort kein Schreibrecht.');
      const normalized = {};
      for (const f of version.schema.fields) if (values[f.id] !== undefined) normalized[f.id] = f.type === 'file' && values[f.id] instanceof File ? { id: crypto.randomUUID(), name: values[f.id].name, size: values[f.id].size, type: values[f.id].type } : values[f.id];
      const errors = validateRecord(version.schema, normalized, eligible); if (errors.length) throw new Error(errors.join(' '));
      for (const f of version.schema.fields) if (f.type === 'file' && values[f.id] instanceof File) { await localFiles('readwrite', store => store.put(values[f.id], normalized[f.id].id)); uploaded.push(normalized[f.id].id); }
      await onSave({ id: initial?.id, moduleId: module.id, versionId: version.id, studio: site, values: normalized, entityId: entity?.id || initial?.entityId || null, entityName: entity?.name || initial?.entityName || '' });
      onCancel();
    } catch (e) { for (const id of uploaded) await localFiles('readwrite', store => store.delete(id)).catch(() => {}); setError(e.message); }
    finally { setSaving(false); }
  }
  return <section className="panel module-record-editor"><div className="section-heading"><h2>{initial ? 'Eintrag bearbeiten' : 'Neuer Eintrag'} · Version {version.number}</h2><button className="icon-button" aria-label="Eintragsformular schließen" onClick={onCancel}><X size={18}/></button></div><form onSubmit={submit}>{error && <div className="admin-error" role="alert">{error}</div>}{entity && <p className="admin-help">Zusatzfelder für: {entity.name}</p>}<label className="field"><span>Standort des Eintrags</span><select aria-label="Standort des Eintrags" value={site} disabled={!!entity?.studio && entity.studio !== 'Alle Studios' || !!initial} required onChange={e => setSite(e.target.value)}>{choices.map(s => <option key={s}>{s}</option>)}</select></label><RecordFields fields={version.schema.fields} values={values} onChange={(id, value) => setValues(v => ({ ...v, [id]: value }))} people={eligible} online={online}/><button className="button" type="submit" disabled={saving || !site}><Save size={15}/>{saving ? 'Wird gespeichert …' : 'Eintrag speichern'}</button></form></section>;
}

export default function ModuleRecords({ actor, people, studios, modules, records, selectedId, entity = null, onSelect, onSave, online = false }) {
  const [form, setForm] = useState(null); const [detail, setDetail] = useState(null); const [error, setError] = useState('');
  const visible = modules.filter(m => { const v = publishedVersion(m); return v && canReadSchema(actor, v.schema) && (!entity || v.schema.target === entity.target); });
  const module = visible.find(m => m.id === selectedId);
  const live = module && publishedVersion(module);
  const shownRecords = module ? records.filter(r => r.moduleId === module.id && (actor.studio === 'Alle Studios' || actor.role === 'Geschäftsführung' || r.studio === actor.studio) && (!entity || r.entityId === entity.id)) : [];
  const canWrite = module && (entity && entity.studio && entity.studio !== 'Alle Studios' ? canWriteSchema(actor, live.schema, entity.studio) : (!!entity || live.schema.target === 'standalone') && studios.slice(1).some(s => canWriteSchema(actor, live.schema, s)));
  const selectedRecord = shownRecords.find(r => r.id === detail);
  const recordVersion = selectedRecord && module.versions.find(v => v.id === selectedRecord.versionId);
  const editRecord = shownRecords.find(r => r.id === form);
  const formVersion = editRecord ? module.versions.find(v => v.id === editRecord.versionId) : live;
  return <>
    {!entity && <div className="page-heading"><div><div className="eyebrow">EURE EIGENEN ABLÄUFE</div><h1>Ein Platz für eure Prozesse.</h1><p>Freigegebene Module mit passenden Feldern für euren Arbeitsalltag.</p></div></div>}
    <div className="builder-module-grid">{visible.map(m => { const v = publishedVersion(m); return <button className={'panel module-open-card ' + (selectedId === m.id ? 'selected' : '')} key={m.id} onClick={() => { onSelect(m.id); setForm(null); setDetail(null); }}><span className="stat-icon orange"><Layers3 size={22}/></span><div><h2>{v.schema.title}</h2><p>{targets[v.schema.target]} · Version {v.number}</p></div><ArrowRight size={16}/></button>; })}</div>
    {!visible.length && <section className="panel"><div className="empty"><Layers3 size={30}/><h3>Noch keine passenden Module freigegeben.</h3><p>Die Geschäftsführung kann Module und Zusatzfelder im Baukasten veröffentlichen.</p></div></section>}
    {module && <section className="panel module-records"><div className="section-heading"><h2>{live.schema.title}</h2>{canWrite && <button className="button" onClick={() => { setForm('new'); setDetail(null); }}><Plus size={14}/>Neuer Eintrag</button>}</div><p className="admin-help">{live.schema.description}{!entity && live.schema.target !== 'standalone' ? ' Zusatzfelder werden über den zugehörigen Eintrag im Kernmodul ausgefüllt.' : ''}</p>{shownRecords.length ? <div className="table-wrap"><table><thead><tr><th>Eintrag</th><th>Standort</th><th>Modulversion</th><th>Erfasst von</th><th>Datum</th></tr></thead><tbody>{shownRecords.map((r, i) => <tr key={r.id}><td><button className="text-link" onClick={() => { setDetail(r.id); setForm(null); }}>{r.entityName || `Eintrag ${i + 1}`}<ArrowRight size={12}/></button></td><td>{r.studio}</td><td>{module.versions.find(v => v.id === r.versionId)?.number || 'Unbekannt'}</td><td>{r.createdByName}</td><td>{new Date(r.createdAt).toLocaleDateString('de-DE')}</td></tr>)}</tbody></table></div> : <div className="empty"><FileText size={26}/><h3>Noch keine Einträge.</h3><p>Neue Einträge verwenden die aktuell veröffentlichte Modulversion.</p></div>}</section>}
    {form && module && formVersion && canWrite && <RecordForm key={`${module.id}-${form}`} actor={actor} people={people} studios={studios} module={module} version={formVersion} entity={entity} initial={editRecord} onSave={onSave} onCancel={() => setForm(null)} online={online}/>}
    {selectedRecord && recordVersion && <section className="panel module-record-detail"><div className="section-heading"><h2>Eintrag · Version {recordVersion.number}</h2><div className="button-group">{canWriteSchema(actor, live.schema, selectedRecord.studio) && <button className="button button-secondary" onClick={() => { setForm(selectedRecord.id); setDetail(null); }}>Eintrag bearbeiten</button>}<button className="icon-button" aria-label="Eintragsdetails schließen" onClick={() => setDetail(null)}><X size={18}/></button></div></div>{error && <div className="admin-error" role="alert">{error}</div>}<dl className="detail-list">{recordVersion.schema.fields.map(f => { const value = selectedRecord.values[f.id]; return <div key={f.id}><dt>{f.label}</dt><dd>{f.type === 'file' && value ? <button className="text-link" onClick={async () => { try { await downloadLocalFile(value); } catch (e) { setError(e.message); } }}><Download size={13}/>{value.name}</button> : f.type === 'checkbox' ? value ? 'Ja' : 'Nein' : f.type === 'member' ? people.find(p => p.id === value)?.name || 'Nicht mehr vorhandenes Profil' : value === undefined || value === '' ? '—' : String(value)}</dd></div>; })}</dl><p className="admin-help">Dieser Eintrag bleibt an Version {recordVersion.number} gebunden. Spätere Feldänderungen verändern seine ursprüngliche Struktur nicht.</p></section>}
    {!entity && <div className="info-note"><ShieldCheck size={17}/><span>{online ? 'Einträge werden mit serverseitig geprüften Rechten gespeichert. Versionen und Standortzuordnung bleiben erhalten. Gemeinsame Datei-Uploads sind noch nicht verbunden.' : 'Lokale Demo: Einträge und Dateien bleiben in diesem Browser. Die Modulrechte sind hier keine echte Zugriffskontrolle; für gemeinsame Daten wird das Backend benötigt.'}</span></div>}
  </>;
}
