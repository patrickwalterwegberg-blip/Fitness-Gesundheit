import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, LoaderCircle, RefreshCw } from 'lucide-react';
import ModuleBuilder from './ModuleBuilder';
import ModuleRecords from './ModuleRecords';
import ControllingCenter from './ControllingCenter';
import { isAdmin } from './module-model';
import { berlinDay } from './clock';

function message(error) {
  if (error?.code === '40001') return 'Der Stand wurde zwischenzeitlich geändert. Aktualisiere die Ansicht vor dem nächsten Speichern.';
  if (error?.code === '42501') return 'Für diese Aktion fehlen deinem Konto die erforderlichen Rechte.';
  if (['42P01', 'PGRST202', 'PGRST205'].includes(error?.code)) return 'Die Datenbankerweiterung für Module und Controlling ist noch nicht installiert. Bitte die zweite SQL-Migration aus der Einrichtungshilfe anwenden.';
  if (error?.code === '0A000') return 'Der gemeinsame Dateispeicher oder dieses Kernmodul ist noch nicht verbunden.';
  return 'Die Änderung oder Abfrage konnte nicht bestätigt werden. Bitte Eingaben, Berechtigungen und Verbindung prüfen.';
}
const empty = { modules: [], records: [], grants: {} };

export default function TeamAdministration({ client, profile, sites, people, memberships, mode, entity, onTaskOpen }) {
  const context = useRef(''); const live = useRef(true); context.current = `${profile.id}|${profile.role}|${mode}|${entity?.id || ''}`;
  const [data, setData] = useState(empty); const [control, setControl] = useState(null);
  const [selectedId, setSelectedId] = useState(null); const [showRecords, setShowRecords] = useState(false);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const studioNames = ['Alle Studios', ...sites.map(s => s.name)];
  const person = raw => ({ ...raw, name: raw.full_name, studio: raw.role === 'admin' ? 'Alle Studios' : (() => { const ids = memberships.filter(m => m.user_id === raw.id).map(m => m.studio_id); return ids.length === 1 ? sites.find(s => s.id === ids[0])?.name || 'Keinem Studio zugeordnet' : ids.length ? 'Alle Studios' : 'Keinem Studio zugeordnet'; })() });
  const actor = person(profile); const profiles = people.map(person);
  async function rpc(name, args) { const result = await client.rpc(name, args); if (result.error) throw result.error; return result.data; }
  async function readAll(table) {
    const rows = [];
    for (let offset = 0; offset < 5000; offset += 200) {
      const result = await client.from(table).select('*').order(table === 'module_permissions' ? 'user_id' : table === 'module_drafts' ? 'module_id' : 'id').range(offset, offset + 199);
      if (result.error) throw result.error;
      rows.push(...result.data);
      if (result.data.length < 200) return rows;
    }
    throw new Error('Dataset too large for this view');
  }
  async function load() {
    const scope = context.current;
    if (mode === 'controlling') { const result = await rpc('admin_controlling'); if (live.current && context.current === scope) setControl(result); return null; }
    const [roots, drafts, versions, records, permissions] = await Promise.all(['custom_modules', 'module_drafts', 'module_versions', 'module_records', 'module_permissions'].map(readAll));
    const model = {
      modules: roots.map(m => ({ id: m.id, ownerId: m.owner_id, revision: m.revision, updatedAt: m.updated_at, draft: drafts.find(d => d.module_id === m.id)?.schema || null, publishedVersionId: m.published_version_id, versions: versions.filter(v => v.module_id === m.id).sort((a, b) => a.version - b.version).map(v => ({ id: v.id, number: v.version, schema: v.schema, at: v.published_at, by: v.published_by, byName: people.find(p => p.id === v.published_by)?.full_name || 'Nicht sichtbares Profil' })) })),
      records: records.map(r => ({ id: r.id, moduleId: r.module_id, versionId: r.version_id, studio: sites.find(s => s.id === r.studio_id)?.name || '', entityId: r.entity_id, entityName: r.entity_id === entity?.id ? entity.name : r.entity_id || '', values: r.data, revision: r.revision, createdById: r.created_by, createdByName: people.find(p => p.id === r.created_by)?.full_name || 'Nicht sichtbares Profil', createdAt: r.created_at, updatedAt: r.updated_at })),
      grants: Object.fromEntries(permissions.map(g => [g.user_id, { create: g.can_create, edit: g.can_edit, publish: g.can_publish }])),
    };
    if (!live.current || context.current !== scope) return null; setData(model); return model;
  }
  useEffect(() => {
    let active = true; live.current = true; setLoading(true); setError(''); setControl(null); setData(empty);
    load().catch(e => { if (active) setError(message(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; live.current = false; };
  }, [client, profile.id, profile.role, mode, entity?.id]);
  async function update(run) { try { const result = await run(); await load(); setError(''); return result; } catch (e) { const text = message(e); setError(text); throw new Error(text); } }
  async function save(id, schema, revision, publish = false) {
    try {
      const result = await rpc(publish ? 'release_module' : 'save_module_draft', { p_module_id: id, p_schema: schema, p_expected_revision: revision });
      const current = await load(); return current.modules.find(m => m.id === result.id);
    } catch (e) { setError(message(e)); throw new Error(message(e)); }
  }
  async function grant(id, right, checked) {
    if (!isAdmin(actor)) throw new Error('Nur die Geschäftsführung kann Rechte vergeben.');
    const next = { ...data.grants[id], [right]: checked }; if (checked && right !== 'edit') next.edit = true; if (!checked && right === 'edit') { next.create = false; next.publish = false; }
    return update(async () => { const r = await client.from('module_permissions').upsert({ user_id: id, can_create: !!next.create, can_edit: !!next.edit, can_publish: !!next.publish }).select('user_id').single(); if (r.error) throw r.error; });
  }
  async function saveRecord(input) {
    const site = sites.find(s => s.name === input.studio); if (!site) throw new Error('Der Standort ist nicht freigegeben.');
    await update(() => rpc('save_module_record', { p_module_id: input.moduleId, p_version_id: input.versionId, p_studio_id: site.id, p_values: input.values, p_record_id: input.id || null, p_expected_revision: data.records.find(r => r.id === input.id)?.revision || null, p_entity_id: input.entityId || null }));
  }
  const selected = selectedId || (entity ? data.modules.find(m => m.versions.some(v => v.id === m.publishedVersionId && v.schema.target === entity.target))?.id : null);
  let center;
  if (control) {
    const members = control.profiles.map(p => ({ ...p, name: p.full_name, studio: p.role === 'admin' ? 'Alle Studios' : (() => { const assigned = control.assignments.filter(a => a.learner_id === p.id).map(a => a.studio_id); const known = memberships.filter(m => m.user_id === p.id).map(m => m.studio_id); const ids = [...new Set([...known, ...assigned])]; return ids.length === 1 ? control.studios.find(s => s.id === ids[0])?.name || '' : ids.length ? 'Alle Studios' : 'Keinem Studio zugeordnet'; })() }));
    const courses = control.courses.map(c => ({ id: c.id, title: c.title, lessons: Array.from({ length: c.lesson_count }, (_, i) => i), completed: [] }));
    const assignments = control.assignments.map(a => ({ id: a.id, personId: a.learner_id, courseId: a.course_id, studio: control.studios.find(s => s.id === a.studio_id)?.name || '', due: a.due_date, practiceRequired: a.requires_practice }));
    const progress = {}; const attempts = []; const confirmations = [];
    for (const p of control.progress) { const a = assignments.find(a => a.id === p.assignment_id); if (!a) continue; progress[a.personId] ||= {}; progress[a.personId][a.courseId] = Array.from({ length: p.lessons_read }, (_, i) => i); if (p.quiz_passed) attempts.push({ personId: a.personId, courseId: a.courseId, passed: true }); if (p.practice_confirmed) confirmations.push({ assignmentId: a.id, by: p.confirmed_by, byName: members.find(m => m.id === p.confirmed_by)?.name || 'Nicht dokumentiert', at: p.confirmed_at }); }
    const tasks = control.tasks.map(t => ({ id: t.id, title: t.title, personId: t.assignee_id, person: members.find(p => p.id === t.assignee_id)?.name || '', studio: control.studios.find(s => s.id === t.studio_id)?.name || '', done: t.status === 'done', status: t.status === 'in_progress' ? 'In Bearbeitung' : t.status === 'done' ? 'Erledigt' : 'Offen', due: t.due_date, completedAt: t.completed_at, completedById: t.completed_by, completedByName: members.find(p => p.id === t.completed_by)?.name || '', remoteTask: { ...t, studio: { name: control.studios.find(s => s.id === t.studio_id)?.name || '' }, assignee: { full_name: members.find(p => p.id === t.assignee_id)?.name || '' } } }));
    center = <ControllingCenter actor={actor} people={members} studios={['Alle Studios', ...control.studios.map(s => s.name)]} tasks={tasks} courses={courses} progress={progress} attempts={attempts} assignments={assignments} confirmations={confirmations} today={berlinDay()} onTaskOpen={t => onTaskOpen(t.remoteTask)} onAssign={input => update(() => rpc('create_learning_assignment', { p_learner: input.personId, p_course: input.courseId, p_studio: control.studios.find(s => s.name === input.studio)?.id, p_due: input.due || null, p_practice: input.practiceRequired }))} onConfirm={(id, notes) => update(() => rpc('confirm_learning_practice', { p_assignment: id, p_notes: notes }))} online/>;
  }
  return <section className="team-administration">{error && <div className="team-error" role="alert">{error}</div>}<div className="content-toolbar"><span className="badge">Gemeinsame Serverdaten · keine Demoübernahme</span><button className="button button-secondary" disabled={loading} onClick={() => { setLoading(true); load().catch(e => setError(message(e))).finally(() => setLoading(false)); }}><RefreshCw size={14}/>Serverdaten aktualisieren</button></div>{loading ? <div className="team-loading"><LoaderCircle size={22}/>Verwaltung wird geladen …</div> : mode === 'controlling' ? center || <p className="admin-help">Controllingdaten konnten nicht geladen werden.</p> : <>{showRecords && mode === 'builder' && <button className="text-link" onClick={() => setShowRecords(false)}><ArrowLeft size={13}/>Zur Modulverwaltung</button>}{mode === 'builder' && !showRecords ? <ModuleBuilder key={profile.id} actor={actor} people={profiles} studios={studioNames} modules={data.modules} grants={data.grants} onGrant={grant} onSave={(id, schema, revision) => save(id, schema, revision)} onPublish={(id, schema, revision) => save(id, schema, revision, true)} onRestore={(id, version, revision) => update(() => rpc('restore_module_version', { p_module_id: id, p_version_id: version, p_expected_revision: revision }))} onOpen={id => { setSelectedId(id); setShowRecords(true); }} online/> : <ModuleRecords key={profile.id} actor={actor} people={profiles} studios={studioNames} modules={data.modules} records={data.records} selectedId={selected} entity={entity} onSelect={setSelectedId} onSave={saveRecord} online/>}</>}
      <div className="info-note"><span>Lerninhalte und Online-Quiz werden im Lernhub bearbeitet. Dieses Controlling zeigt zugewiesene Kurse mit Lesebestätigungen, Prüfung und gesonderter Praxiseinweisung. Vorhandene externe Kursnachweise bleiben erhalten; Demo-Fortschritte werden nicht übertragen.</span></div>
  </section>;
}
