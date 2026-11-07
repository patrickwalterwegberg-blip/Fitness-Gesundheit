import React, { useEffect, useRef, useState } from 'react';
import { Archive, ArrowRight, CheckCircle2, Download, Eye, FilePlus2, FileText, FolderOpen, History, Image, Layers3, LoaderCircle, Plus, RefreshCw, Search, Settings2, ShieldCheck, Upload, Video, X } from 'lucide-react';
import { roleLabels } from './module-model';
import { canContributeKnowledge, canManageKnowledge, fileSize, knowledgeAccept, knowledgeBucket, knowledgeCategories, knowledgeError, knowledgeMime } from './knowledge-model';
import './team-knowledge.css';
import ScheduleDialog from './ScheduleDialog';
import {usePermissions} from './team-permissions';

const date = s => new Date(s).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' });
const docColumns = 'id,title,summary,category,tags,studio_id,reader_roles,created_by,published_version_id,archived,revision,updated_at';
const pageSize = 20;
export default function TeamKnowledge({ client, profile, sites, memberships, people, mode, onKnowledge, canUpload = true, initialDocument = null }) {
  const {can}=usePermissions();
  const [query, setQuery] = useState(''); const [input, setInput] = useState(''); const [site, setSite] = useState(''); const [category, setCategory] = useState('');
  const [state, setState] = useState(mode === 'knowledge' ? 'published' : 'all'); const [page, setPage] = useState(0); const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState({ items: [], total: 0 }); const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(initialDocument); const [document, setDocument] = useState(null); const [versions, setVersions] = useState([]); const [published, setPublished] = useState(null);
  const [versionPage, setVersionPage] = useState(0); const [selectedVersion, setSelectedVersion] = useState(null); const [detailLoading, setDetailLoading] = useState(false);
  const [editor, setEditor] = useState(null); const [access, setAccess] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const mounted = useRef(true); const operation = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    let live = true; setLoading(true); setResult({ items: [], total: 0 }); setError('');
    client.rpc('search_knowledge', { p_query: query, p_studio: site || null, p_category: category, p_state: state, p_page: page, p_size: pageSize }).then(({ data, error: failure }) => {
      if (!live) return; if (failure) setError(knowledgeError(failure)); else if (data?.items && Number.isInteger(data.total)) setResult(data); else setError('Die Inhaltsliste konnte nicht bestätigt werden.');
    }).catch(() => { if (live) setError('Der Wissenshub ist gerade nicht erreichbar.'); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [client, profile.id, profile.role, query, site, category, state, page, refresh]);
  useEffect(() => {
    let live = true; setDocument(null); setVersions([]); setPublished(null); setAccess(false);
    if (!selectedId) return;
    setDetailLoading(true);
    (async () => {
      const { data: doc, error: failure } = await client.from('knowledge_documents').select(docColumns).eq('id', selectedId).maybeSingle();
      if (failure) throw failure; if (!doc) throw new Error('Der Inhalt ist nicht mehr für deinen Zugang verfügbar.');
      const { data: entries, error: entriesError } = await client.from('knowledge_versions').select('*').eq('document_id', doc.id).order('version', { ascending: false }).range(versionPage * pageSize, (versionPage + 1) * pageSize - 1);
      if (entriesError) throw entriesError;
      let liveVersion = entries.find(v => v.id === doc.published_version_id);
      if (!liveVersion && doc.published_version_id) { const r = await client.from('knowledge_versions').select('*').eq('id', doc.published_version_id).maybeSingle(); if (r.error) throw r.error; liveVersion = r.data; }
      if (!live) return; setDocument(doc); setVersions(entries); setPublished(liveVersion || null);
    })().catch(e => { if (live) setError(knowledgeError(e)); }).finally(() => { if (live) setDetailLoading(false); });
    return () => { live = false; };
  }, [client, profile.id, profile.role, selectedId, versionPage, refresh]);
  const nameOfSite = id => id ? sites.find(s => s.id === id)?.name || 'Freigegebener Standort' : 'Alle Studios';
  const current = versions.find(v => v.id === selectedVersion) || published || versions.find(v => v.state === 'ready') || versions[0];
  const oldManager=document&&canManageKnowledge(profile,document,memberships);
  const inScope=document&&(profile.role==='admin'||sites.some(s=>s.id===document.studio_id));
  const manager=canUpload&&document&&inScope&&['knowledge.team','knowledge.publish','knowledge.access','knowledge.archive'].some(key=>can(key,oldManager));
  const contributor=canUpload&&document&&can('knowledge.edit',true)&&(canContributeKnowledge(profile,document,memberships)||inScope&&can('knowledge.team',oldManager));
  const canRelease = manager && can('knowledge.publish',oldManager) && current?.state === 'ready' && current.id !== document.published_version_id && !document.archived;
  function clearFilters() { setInput(''); setQuery(''); setSite(''); setCategory(''); setState(mode === 'knowledge' ? 'published' : 'all'); setPage(0); }
  function resetFilters() { clearFilters(); setRefresh(n => n + 1); }
  async function rpc(name, args) { const result = await client.rpc(name, args); if (result.error) throw result.error; return result.data; }
  async function run(action, success) {
    if (operation.current) return false; operation.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); if (!mounted.current) return false; setNotice(success); setRefresh(n => n + 1); return true; }
    catch (e) { if (mounted.current) setError(knowledgeError(e)); return false; }
    finally { operation.current = false; if (mounted.current) setBusy(false); }
  }
  async function releaseVersion() {
    const ok = await run(() => rpc('publish_knowledge_version', { p_document: document.id, p_version: current.id, p_expected_revision: document.revision }), 'Version freigegeben. Berechtigte Mitarbeiter können sie jetzt im Wissenshub öffnen.');
    if (ok) clearFilters();
  }
  function open(id) { setSelectedId(id); setSelectedVersion(null); setVersionPage(0); setEditor(null); setError(''); setNotice(''); }
  async function cleanup(v) {
    const r = await client.storage.from(knowledgeBucket).remove([v.object_path]);
    if (r.error) throw r.error;
    await rpc('cancel_knowledge_upload', { p_version: v.version_id });
  }
  return <section className="team-knowledge">
    <div className="page-heading"><div><div className="eyebrow">WISSEN TEILEN. GEMEINSAM HANDELN.</div><h2>{mode === 'knowledge' ? 'Gutes Wissen. Für dein Team.' : 'Eure Dateien. An einem Ort.'}</h2><p>{mode === 'knowledge' ? 'Freigegebene Anleitungen und Inhalte für deinen Studioalltag.' : 'Gemeinsam speichern, strukturiert prüfen und gezielt freigeben.'}</p></div>{canUpload&&<div className="button-group">{can('knowledge.article',true)&&<button className="button button-secondary" disabled={busy} onClick={() => { setEditor({ kind: 'article' }); setSelectedId(null); setNotice(''); }}><FilePlus2 size={15}/>Artikel schreiben</button>}{can('knowledge.upload',true)&&<button className="button" disabled={busy} onClick={() => { setEditor({ kind: 'file' }); setSelectedId(null); setNotice(''); }}><Upload size={15}/>Datei hochladen</button>}</div>}</div>
    {!document && !editor && error && <div role="alert" className="team-error">{error}{/Migration 004/.test(error) && <p><a href="https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/004_knowledge_files.sql" target="_blank" rel="noreferrer">Datenbankerweiterung öffnen</a></p>}</div>}{!document && !editor && notice && <div role="status" className="team-notice"><CheckCircle2 size={16}/>{notice}</div>}
    <form className="knowledge-search-form" onSubmit={e => { e.preventDefault(); setQuery(input.trim()); setPage(0); }}><Search size={19}/><input aria-label="Wissen durchsuchen" placeholder="Titel, Beschreibung oder freigegebene Texte durchsuchen …" value={input} maxLength={300} onChange={e => setInput(e.target.value)}/><button className="button button-secondary" type="submit">Suchen</button></form>
    <div className="knowledge-filters panel"><label className="field"><span>Standort der Inhalte</span><select aria-label="Standort der Inhalte" value={site} onChange={e => { setSite(e.target.value); setPage(0); }}><option value="">Alle freigegebenen Standorte</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="field"><span>Thema</span><select aria-label="Thema" value={category} onChange={e => { setCategory(e.target.value); setPage(0); }}><option value="">Alle Themen</option>{knowledgeCategories.map(c => <option key={c}>{c}</option>)}</select></label><label className="field"><span>Freigabestatus</span><select aria-label="Freigabestatus" value={state} onChange={e => { setState(e.target.value); setPage(0); }}><option value="published">Freigegeben</option><option value="all">Alle sichtbaren Inhalte</option><option value="draft">Entwürfe</option><option value="review">Zur Prüfung</option>{can('knowledge.archive',['admin','studio_manager'].includes(profile.role)) && <option value="archived">Archiv</option>}</select></label><button className="icon-button" aria-label="Dateien und Wissen aktualisieren" disabled={busy || loading} onClick={() => setRefresh(n => n + 1)}><RefreshCw size={18}/></button></div>
    <button className="text-link knowledge-reset" onClick={resetFilters} disabled={busy || loading}>Filter zurücksetzen</button>
    {loading ? <div className="team-loading"><LoaderCircle size={23}/>Inhalte werden geladen …</div> : result.items.length ? <div className="shared-document-grid">{result.items.map(d => <button className={'panel shared-document-card ' + (d.id === selectedId ? 'selected' : '')} key={d.id} onClick={() => open(d.id)}><div><span className="stat-icon orange"><FolderOpen size={24}/></span><span className="badge">{d.archived ? 'Archiviert' : d.published_version_id ? 'Freigegeben' : 'Entwurf'}</span></div><small>{d.category}</small><h3>{d.title}</h3><p>{d.summary || d.excerpt || 'Inhalt öffnen und Details ansehen.'}</p><div className="shared-document-footer"><span>{nameOfSite(d.studio_id)}</span><ArrowRight size={16}/></div>{d.review_count > 0 && <span className="knowledge-review">{d.review_count} Version{d.review_count > 1 ? 'en' : ''} zur Prüfung</span>}</button>)}</div> : <section className="panel knowledge-empty"><FolderOpen size={32}/><h3>Noch keine passenden Inhalte.</h3><p>{mode === 'knowledge' && state === 'published' ? 'Hier erscheinen freigegebene Inhalte. Neue Uploads bleiben bis zur Freigabe als Entwurf unter „Dateien“.' : 'Ändere die Filter oder füge den ersten Inhalt hinzu.'}</p>{canUpload && mode === 'knowledge' && state === 'published' && <button className="button button-secondary" onClick={() => { setInput(''); setQuery(''); setSite(''); setCategory(''); setState('draft'); setPage(0); }}>Sichtbare Entwürfe anzeigen</button>}</section>}
    <div className="team-pagination"><span>{result.total} Inhalte · Seite {page + 1} von {Math.max(1, Math.ceil(result.total / pageSize))}</span><div className="button-group"><button className="button button-secondary" disabled={loading || page === 0} onClick={() => setPage(p => p - 1)}>Zurück</button><button className="button button-secondary" disabled={loading || (page + 1) * pageSize >= result.total} onClick={() => setPage(p => p + 1)}>Weitere Inhalte</button></div></div>
    {detailLoading && <div className="team-loading"><LoaderCircle size={20}/>Inhalt wird geöffnet …</div>}
    {document && !detailLoading && !editor && <ScheduleDialog className="knowledge-detail" wide title={document.title} busy={busy} error={error} onClose={() => setSelectedId(null)} closeLabel="Wissensdetails schließen">{notice && <div role="status" className="team-notice"><CheckCircle2 size={16}/>{notice}</div>}<p className="eyebrow">{nameOfSite(document.studio_id)} · {document.category}</p><div className="knowledge-detail-body"><div className="button-group">{canRelease && <button className="button" disabled={busy} onClick={releaseVersion}><CheckCircle2 size={15}/>{current.published_at ? 'Diese Version wieder freigeben' : 'Version freigeben'}</button>}{document.published_version_id && mode !== 'knowledge' && onKnowledge && <button className="button button-secondary" disabled={busy} onClick={()=>onKnowledge(document.id)}><ArrowRight size={14}/>Wissenshub öffnen</button>}{contributor && <button className="button button-secondary" disabled={busy} onClick={() => setEditor({ document, version: current, kind: current?.kind || 'file' })}><Plus size={14}/>Neue Version</button>}{manager && (can('knowledge.access',oldManager)||can('knowledge.archive',oldManager)) && <button className="button button-secondary" disabled={busy} onClick={() => setAccess(v => !v)}><Settings2 size={14}/>Freigabe & Zugriff</button>}</div>
      {!document.archived && !document.published_version_id && <p className="knowledge-hint">Dieser Inhalt ist ein Entwurf. Er erscheint im Wissenshub nach der Freigabe durch die zuständige Leitung.</p>}
      {document.archived && <p className="knowledge-hint"><Archive size={15}/>Archiviert · für normale Leser ausgeblendet.</p>}
      {access && manager && <KnowledgeAccess key={document.revision} document={document} profile={profile} sites={sites} memberships={memberships} busy={busy} onSave={input => run(() => rpc('set_knowledge_access', { p_document: document.id, p_expected_revision: document.revision, p_studio: input.site || null, p_roles: input.roles, p_archived: input.archived }), 'Freigaben auf dem Server gespeichert.')}/>}
      <div className="knowledge-version-heading"><h3><History size={16}/>Datei- und Inhaltsversionen</h3><span className="small-muted">Versionen bleiben erhalten</span></div>
      <div className="knowledge-versions">{versions.map(v => <button key={v.id} className={current?.id === v.id ? 'active' : ''} onClick={() => setSelectedVersion(v.id)}><strong>Version {v.version}</strong><small>{v.state === 'uploading' ? 'Upload unvollständig' : v.id === document.published_version_id ? 'Aktuell freigegeben' : v.published_at ? 'Früher freigegeben' : 'Zur Prüfung'}</small><small>{date(v.created_at)}</small></button>)}</div>
      <div className="knowledge-version-pagination"><button className="text-link" disabled={versionPage === 0} onClick={() => { setVersionPage(p => p - 1); setSelectedVersion(null); }}>Neuere Versionen</button><button className="text-link" disabled={versions.length < pageSize} onClick={() => { setVersionPage(p => p + 1); setSelectedVersion(null); }}>Ältere Versionen</button></div>
      {!current ? <p className="knowledge-hint">Noch keine vollständige Version vorhanden. Du kannst einen neuen Upload beginnen.</p> : <><div className="knowledge-current"><span className="badge">Version {current.version}</span><h3>{current.title}</h3><p>{current.summary}</p><div className="knowledge-meta"><span>{current.kind === 'article' ? 'Artikel' : `${current.file_name} · ${fileSize(current.file_size)}`}</span><span>Erstellt von {people.find(p => p.id === current.created_by)?.full_name || 'Teammitglied'}</span></div>{current.tags.length > 0 && <div className="knowledge-tags">{current.tags.map((tag, i) => <span className="badge" key={i}>{tag}</span>)}</div>}</div>
        {current.state === 'ready' ? <KnowledgePreview key={current.id} client={client} version={current}/> : <div className="knowledge-hint">Dieser Upload ist noch nicht abgeschlossen.{(canUpload && (can('knowledge.cleanup',manager) || current.created_by === profile.id&&contributor)) && <button className="text-link" disabled={busy} onClick={() => run(() => cleanup({ object_path: current.object_path, version_id: current.id }), 'Unvollständiger Upload entfernt. Du kannst eine neue Version hochladen.')}>Unvollständigen Upload entfernen</button>}</div>}
      </>}
    </div></ScheduleDialog>}
    {canUpload && editor && <KnowledgeEditor key={editor.document ? `${editor.document.id}-${editor.version?.id || 'new'}` : `new-${editor.kind}`} client={client} profile={profile} sites={sites} initial={editor} onCancel={() => setEditor(null)} onSaved={v => { setEditor(null); setSelectedId(v.document_id); setSelectedVersion(v.version_id); setVersionPage(0); setRefresh(n => n + 1); setNotice('Entwurf gemeinsam gespeichert. Die zuständige Leitung kann die Version jetzt prüfen und freigeben.'); }}/ >}
    <div className="info-note"><ShieldCheck size={17}/><span>Gemeinsame Inhalte mit Standort- und Rollenfreigaben. Neue Uploads bleiben bis zur Prüfung Entwürfe. Textsuche berücksichtigt freigegebene Artikel und Textauszüge aus TXT, Markdown und CSV. PDF, Office und Videos werden noch nicht automatisch ausgelesen.</span></div>
  </section>;
}

function KnowledgeEditor({ client, profile, sites, initial, onCancel, onSaved }) {
  const document = initial.document;
  const [kind, setKind] = useState(initial.kind); const [title, setTitle] = useState(initial.version?.title || document?.title || ''); const [summary, setSummary] = useState(initial.version?.summary || document?.summary || ''); const [category, setCategory] = useState(initial.version?.category || document?.category || knowledgeCategories[0]);
  const {can}=usePermissions();
  const [site, setSite] = useState(document ? document.studio_id || '' : profile.role === 'admin' ? '' : sites[0]?.id || ''); const [roles, setRoles] = useState(document?.reader_roles || Object.keys(roleLabels)); const [tags, setTags] = useState((initial.version?.tags || document?.tags || []).join(', ')); const [text, setText] = useState(initial.version?.kind === 'article' ? initial.version.text_content : ''); const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false); const [stage, setStage] = useState(''); const [error, setError] = useState(''); const operation = useRef(false); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function submit(e) {
    e.preventDefault(); if (operation.current) return; operation.current = true; setBusy(true); setError(''); let prepared, finished = false;
    const rpc = async (name, args) => { const r = await client.rpc(name, args); if (r.error) throw r.error; return r.data; };
    try {
      if (!roles.length || !site && profile.role !== 'admin') throw new Error('Wähle einen freigegebenen Standort und mindestens eine Leserrolle.');
      let mime = null, extracted = '';
      if (kind === 'file') { if (!file) throw new Error('Wähle eine Datei aus.'); mime = knowledgeMime(file); if (['text/plain', 'text/markdown', 'text/csv'].includes(mime)) extracted = (await file.slice(0, 200000).text()).replaceAll('\0', '').slice(0, 100000); }
      else { if (!text.trim()) throw new Error('Schreibe den Inhalt des Artikels.'); extracted = text; }
      const keywords = tags.split(',').map(s => s.trim()).filter(Boolean);
      if (keywords.length > 12 || keywords.some(t => t.length > 40)) throw new Error('Nutze höchstens zwölf Schlagworte mit je maximal 40 Zeichen.');
      setStage('Entwurf wird angelegt …');
      prepared = await rpc('prepare_knowledge_version', { p_document: document?.id || null, p_expected_revision: document?.revision || 0, p_title: title.trim(), p_summary: summary, p_category: category, p_tags: keywords, p_studio: site || null, p_roles: roles, p_kind: kind, p_file_name: kind === 'file' ? file.name : null, p_mime_type: mime, p_file_size: kind === 'file' ? file.size : null, p_text: extracted });
      if (kind === 'file') {
        setStage('Datei wird hochgeladen …');
        const upload = await client.storage.from(knowledgeBucket).upload(prepared.object_path, new File([file], file.name, { type: mime }), { contentType: mime, upsert: false });
        if (upload.error) throw upload.error;
        setStage('Upload wird bestätigt …'); await rpc('finish_knowledge_upload', { p_version: prepared.version_id });
      }
      finished = true; if (mounted.current) onSaved(prepared);
    } catch (failure) {
      let cleanupFailed = false;
      if (prepared?.object_path && !finished) {
        try { const removed = await client.storage.from(knowledgeBucket).remove([prepared.object_path]); if (removed.error) throw removed.error; await rpc('cancel_knowledge_upload', { p_version: prepared.version_id }); }
        catch { cleanupFailed = true; }
      }
      if (mounted.current) setError(knowledgeError(failure) + (cleanupFailed ? ' Ein unvollständiger Upload kann zurückgeblieben sein. Lade die Ansicht neu und prüfe den Entwurf vor einem weiteren Versuch.' : ''));
    } finally { operation.current = false; if (mounted.current) { setBusy(false); setStage(''); } }
  }
  return <ScheduleDialog className="knowledge-editor" wide title={document ? 'Neue Inhaltsversion' : kind === 'article' ? 'Artikel schreiben' : 'Datei hochladen'} busy={busy} error={error} onClose={onCancel} closeLabel="Inhaltsformular schließen"><form onSubmit={submit}>
    <div className="pill-tabs"><button type="button" disabled={busy||!document&&!can('knowledge.upload',true)} className={kind === 'file' ? 'active' : ''} onClick={() => setKind('file')}>Datei</button><button type="button" disabled={busy||!document&&!can('knowledge.article',true)} className={kind === 'article' ? 'active' : ''} onClick={() => setKind('article')}>Artikel</button></div>
    <label className="field"><span>Titel des Inhalts</span><input value={title} disabled={busy} maxLength={180} required onChange={e => setTitle(e.target.value)}/></label>
    <div className="form-grid"><label className="field"><span>Standort des Inhalts</span><select aria-label="Standort des Inhalts" disabled={busy || !!document} value={site} onChange={e => setSite(e.target.value)}>{profile.role === 'admin' && <option value="">Alle Studios</option>}{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="field"><span>Kategorie des Inhalts</span><select aria-label="Kategorie des Inhalts" value={category} disabled={busy} onChange={e => setCategory(e.target.value)}>{knowledgeCategories.map(c => <option key={c}>{c}</option>)}</select></label></div>
    <label className="field"><span>Kurzbeschreibung</span><textarea aria-label="Kurzbeschreibung" rows={2} value={summary} maxLength={2000} disabled={busy} onChange={e => setSummary(e.target.value)}/></label><label className="field"><span>Schlagworte · mit Komma trennen</span><input value={tags} disabled={busy} onChange={e => setTags(e.target.value)}/></label>
    <fieldset className="knowledge-roles" disabled={busy || !!document}><legend>Nach Freigabe lesbar für</legend>{Object.entries(roleLabels).map(([key, label]) => <label key={key}><input type="checkbox" checked={roles.includes(key)} onChange={e => setRoles(old => e.target.checked ? [...old, key] : old.filter(r => r !== key))}/>{label}</label>)}</fieldset>
    {kind === 'article' ? <label className="field"><span>Artikeltext</span><textarea aria-label="Artikeltext" rows={10} value={text} maxLength={100000} required disabled={busy} onChange={e => setText(e.target.value)}/></label> : <label className="field knowledge-file-picker"><span>Originaldatei auswählen</span><input type="file" aria-label="Originaldatei auswählen" accept={knowledgeAccept} required disabled={busy} onChange={e => { const next = e.target.files?.[0] || null; setFile(next); setError(''); if (next) { try { knowledgeMime(next); if (!title) setTitle(next.name.slice(0, 180)); } catch (failure) { setError(failure.message); } } }}/><small>PDF, Word, Excel, PowerPoint, Bilder, TXT, Markdown, CSV, MP4 und WebM · maximal 50 MB. Artikel und Textauszüge sind bis 100.000 Zeichen durchsuchbar.</small></label>}
    <p className="knowledge-hint">Der Inhalt wird zunächst als Entwurf gespeichert. Freigaben und Änderungen der Leserrollen übernimmt die zuständige Leitung.</p><div className="button-group"><button className="button" type="submit" disabled={busy}>{busy ? <LoaderCircle size={15}/> : <Upload size={15}/>} {busy ? stage : 'Entwurf speichern'}</button><button className="button button-secondary" type="button" disabled={busy} onClick={onCancel}>Abbrechen</button></div>
  </form></ScheduleDialog>;
}

function KnowledgeAccess({ document, profile, sites, memberships, busy, onSave }) {
  const {can}=usePermissions();
  const [site, setSite] = useState(document.studio_id || ''); const [roles, setRoles] = useState(document.reader_roles); const [archived, setArchived] = useState(document.archived); const [error, setError] = useState('');
  const granted = sites.filter(s => canManageKnowledge(profile, { studio_id: s.id }, memberships)||can('knowledge.access',false)||can('knowledge.archive',false));
  return <form className="knowledge-access" onSubmit={e => { e.preventDefault(); if (!roles.length) { setError('Wähle mindestens eine Leserrolle.'); return; } setError(''); void onSave({ site, roles, archived }); }}>{error && <div className="team-error" role="alert">{error}</div>}<h3>Freigabe & Zugriff</h3><label className="field"><span>Freigegebener Standort</span><select aria-label="Freigegebener Standort" value={site} disabled={busy||!can('knowledge.access',true)} onChange={e => setSite(e.target.value)}>{profile.role === 'admin' && <option value="">Alle Studios</option>}{granted.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><fieldset className="knowledge-roles" disabled={busy||!can('knowledge.access',true)}><legend>Leserrollen</legend>{Object.entries(roleLabels).map(([key, label]) => <label key={key}><input type="checkbox" checked={roles.includes(key)} onChange={e => setRoles(old => e.target.checked ? [...old, key] : old.filter(r => r !== key))}/>{label}</label>)}</fieldset><label className="check-field"><input type="checkbox" checked={archived} disabled={busy||!can('knowledge.archive',true)} onChange={e => setArchived(e.target.checked)}/>Inhalt archivieren</label><p className="knowledge-hint">Änderungen gelten für künftige Zugriffe auf alle Versionen. Bereits heruntergeladene Inhalte bleiben auf dem jeweiligen Gerät. Die Geschäftsführung und zuständige Studioleitung behalten Einsicht.</p><button className="button button-secondary" type="submit" disabled={busy}>Zugriff speichern</button></form>;
}

function KnowledgePreview({ client, version }) {
  const [url, setUrl] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const alive = useRef(true); const objectUrl = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }; }, []);
  async function load(download) {
    if (busy) return; setBusy(true); setError('');
    try {
      let href = objectUrl.current;
      if (!href) { const result = await client.storage.from(knowledgeBucket).download(version.object_path); if (result.error) throw result.error; if (!alive.current) return; href = URL.createObjectURL(new Blob([result.data], { type: version.mime_type })); objectUrl.current = href; setUrl(href); }
      if (download && alive.current) { const link = window.document.createElement('a'); link.href = href; link.download = version.file_name; link.click(); }
    } catch (failure) { if (alive.current) setError(knowledgeError(failure)); } finally { if (alive.current) setBusy(false); }
  }
  const preview = version.mime_type === 'application/pdf' ? 'pdf' : version.mime_type?.startsWith('image/') ? 'image' : version.mime_type?.startsWith('video/') ? 'video' : null;
  return <div className="knowledge-preview">{version.text_content && <><span className="badge">{version.kind === 'article' ? 'Artikelinhalt' : 'Durchsuchbarer Textauszug'}</span><div className="knowledge-article">{version.text_content}</div></>}{version.kind === 'file' && <>{error && <div className="team-error" role="alert">{error}</div>}<div className="button-group">{preview && <button className="button button-secondary" disabled={busy || !!url} onClick={() => load(false)}>{busy ? <LoaderCircle size={15}/> : preview === 'video' ? <Video size={15}/> : preview === 'image' ? <Image size={15}/> : <Eye size={15}/>} {busy ? 'Original wird geladen …' : url ? 'Vorschau geladen' : `Vorschau laden · ${fileSize(version.file_size)}`}</button>}<button className="button button-secondary" disabled={busy} onClick={() => load(true)}><Download size={15}/>Original herunterladen</button></div>{url && preview === 'image' && <img src={url} alt={version.title}/ >}{url && preview === 'video' && <><video controls preload="metadata" src={url}>Dein Browser unterstützt dieses Videoformat nicht.</video><small>Die Wiedergabe hängt vom Videoformat und deinem Browser ab. Das Original bleibt herunterladbar.</small></>}{url && preview === 'pdf' && <object data={url} type="application/pdf" aria-label="PDF-Vorschau"><p>Die PDF-Vorschau ist in diesem Browser nicht verfügbar. Du kannst das Original herunterladen.</p></object>}{!preview && !version.text_content && <p className="knowledge-hint">Für dieses Format ist das Original zum Herunterladen verfügbar.</p>}</>}</div>;
}
