import React, { useEffect, useRef, useState } from 'react';
import { readSheet } from 'read-excel-file/browser';
import { Download, FileSpreadsheet, LoaderCircle, Mail, Upload, X } from 'lucide-react';
import { roleLabels } from './module-model';
import { csvRows, importCandidates, pastedCandidates, validateCandidate } from './user-import-model';

export default function TeamUserImport({ studios, knownMembers, invoke, onComplete, onClose }) {
  const [site, setSite] = useState(studios[0]?.id || ''); const [text, setText] = useState(''); const [rows, setRows] = useState([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const operation = useRef(false), alive = useRef(true), fileRef = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const knownEmails = knownMembers.map(m => m.email?.toLowerCase()).filter(Boolean);
  const pending = rows.filter(r => r.selected && !r.result);
  const invalid = pending.some(r => validateCandidate(r, rows, knownEmails));
  const patch = (id, values) => setRows(old => old.map(r => r.id === id ? { ...r, ...values } : r));
  async function file(e) {
    const selected = e.target.files?.[0]; if (!selected) return;
    setError(''); setNotice('');
    if (selected.size > 5 * 1024 * 1024) { setError('Importdateien dürfen höchstens 5 MB groß sein.'); return; }
    setBusy(true);
    try {
      const extension = selected.name.split('.').pop().toLowerCase();
      if (!['csv', 'xlsx'].includes(extension)) throw new Error('Bitte eine CSV- oder XLSX-Datei auswählen.');
      const data = extension === 'csv' ? csvRows(await selected.text()) : await readSheet(selected);
      if (alive.current) setRows(importCandidates(data, studios, site));
    } catch (failure) { if (alive.current) setError(failure.message || 'Die Importdatei konnte nicht gelesen werden.'); }
    finally { if (alive.current) setBusy(false); e.target.value = ''; }
  }
  function template() {
    const contents = '\uFEFFName;E-Mail;Studio;Rolle\r\nAnna Beispiel;anna@example.org;' + (studios.find(s => s.id === site)?.name || 'Dörpen') + ';Mitarbeiter\r\n';
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'Mitarbeiter-Import-Vorlage.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function send() {
    if (operation.current || !pending.length || pending.length > 20 || invalid) return;
    operation.current = true; setBusy(true); setError(''); setNotice(''); let requested = 0, failed = 0;
    try {
      for (const row of pending) {
        if (!alive.current) break;
        patch(row.id, { result: 'pending' });
        try {
          await invoke({ action: 'invite', fullName: row.fullName.trim(), email: row.email.trim().toLowerCase(), role: row.role, studioIds: row.studioId ? [row.studioId] : [] });
          requested++; if (alive.current) patch(row.id, { result: 'requested' });
        } catch (failure) {
          failed++; if (alive.current) patch(row.id, { result: failure.code === 'account_exists' ? 'exists' : 'unconfirmed' });
          if (['administrator_required', 'not_authenticated'].includes(failure.code)) { if (alive.current) setError('Die Sitzung oder Adminberechtigung konnte nicht bestätigt werden. Weitere Anfragen wurden gestoppt.'); break; }
        }
      }
      if (alive.current) { setNotice(`${requested} Einladung${requested === 1 ? '' : 'en'} beim E-Mail-Dienst angefordert. ${failed} Anfrage${failed === 1 ? '' : 'n'} mit Hinweisen. Bitte die Zustellung separat prüfen.`); onComplete(); }
    } finally { operation.current = false; if (alive.current) setBusy(false); }
  }
  return <section className="panel user-import"><div className="section-heading"><h2><FileSpreadsheet size={19}/>Mitarbeiter importieren</h2><button className="icon-button" aria-label="Nutzerimport schließen" disabled={busy} onClick={onClose}><X size={18}/></button></div><div className="user-import-body">
    {error && <div className="team-error" role="alert">{error}</div>}{notice && <div className="team-notice" role="status">{notice}</div>}
    <p>CSV- und Excel-Dateien oder eingefügte Kontakte zunächst prüfen. Beim Einlesen werden keine Konten angelegt und keine E-Mails versendet.</p>
    <label className="field"><span>Standardstudio für den Import</span><select value={site} disabled={busy} onChange={e => setSite(e.target.value)}>{studios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <div className="button-group"><button className="button button-secondary" disabled={busy} onClick={template}><Download size={14}/>CSV-Vorlage</button><button className="button button-secondary" disabled={busy} onClick={() => fileRef.current.click()}><Upload size={14}/>CSV oder Excel auswählen</button><input type="file" className="hidden" aria-label="Mitarbeiterdatei auswählen" ref={fileRef} accept=".csv,.xlsx" disabled={busy} onChange={file}/></div>
    <label className="field"><span>Kontakte oder E-Mail-Liste einfügen</span><textarea rows={4} maxLength={50000} value={text} disabled={busy} onChange={e => setText(e.target.value)} placeholder={'Anna Beispiel <anna@example.org>\nMax Beispiel <max@example.org>'}/></label><button className="button button-secondary" disabled={busy || !text.trim()} onClick={() => { try { setRows(pastedCandidates(text, studios, site)); setError(''); setNotice(''); } catch (failure) { setError(failure.message); } }}>Vorschau erstellen</button>
    {rows.length > 0 && <><h3>Importvorschau · {rows.length} Zeilen</h3><div className="table-wrap"><table className="user-import-table"><thead><tr><th>Auswahl</th><th>Name</th><th>E-Mail</th><th>Studio</th><th>Rolle</th><th>Prüfung / Ergebnis</th></tr></thead><tbody>{rows.map((row, i) => <tr key={row.id}><td><input type="checkbox" aria-label={`Importzeile ${i + 1} auswählen`} checked={row.selected} disabled={busy || !!row.result} onChange={e => patch(row.id, { selected: e.target.checked })}/></td><td><input aria-label={`Name Importzeile ${i + 1}`} value={row.fullName} maxLength={100} disabled={busy || !!row.result} onChange={e => patch(row.id, { fullName: e.target.value })}/></td><td><input aria-label={`E-Mail Importzeile ${i + 1}`} value={row.email} maxLength={254} disabled={busy || !!row.result} onChange={e => patch(row.id, { email: e.target.value })}/></td><td><select aria-label={`Studio Importzeile ${i + 1}`} value={row.studioId} disabled={busy || !!row.result} onChange={e => patch(row.id, { studioId: e.target.value })}><option value="">Bitte auswählen</option>{studios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></td><td><select aria-label={`Rolle Importzeile ${i + 1}`} value={row.role} disabled={busy || !!row.result} onChange={e => patch(row.id, { role: e.target.value })}><option value="">Bitte auswählen</option>{Object.entries(roleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></td><td>{row.result === 'pending' ? 'Wird angefordert …' : row.result === 'requested' ? 'Einladung angefordert' : row.result === 'exists' ? 'Konto besteht bereits – Liste prüfen' : row.result === 'unconfirmed' ? 'Nicht bestätigt – Konto und Mailversand prüfen' : validateCandidate(row, rows, knownEmails) || 'Bereit'}</td></tr>)}</tbody></table></div><p>Höchstens 20 Einladungen pro Durchlauf auswählen. Bestehende Konten werden serverseitig zusätzlich geprüft und bleiben unverändert. Administratoren erhalten Zugriff auf alle Studios und das Controlling.</p><button className="button" disabled={busy || invalid || pending.length === 0 || pending.length > 20} onClick={send}>{busy ? <LoaderCircle size={15}/> : <Mail size={15}/>} {busy ? 'Einladungen werden angefordert …' : `${pending.length} Einladung${pending.length === 1 ? '' : 'en'} anfordern`}</button></>}
  </div></section>;
}
