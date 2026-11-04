const normalize = value => String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function csvRows(text) {
  const source = text.replace(/^\uFEFF/, '');
  const line = source.split(/\r?\n/, 1)[0];
  const delimiter = [';', ',', '\t'].sort((a, b) => line.split(b).length - line.split(a).length)[0];
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') { if (quoted && source[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (c === delimiter && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && source[i + 1] === '\n') i++; row.push(field); if (row.some(v => v.trim())) rows.push(row); row = []; field = ''; }
    else field += c;
    if (rows.length > 200) throw new Error('Bitte höchstens 200 Mitarbeiter pro Importdatei vorbereiten.');
  }
  if (quoted) throw new Error('Die CSV-Datei enthält ein nicht geschlossenes Anführungszeichen.');
  row.push(field); if (row.some(v => v.trim())) rows.push(row);
  return rows;
}
export function importCandidates(matrix, studios, defaultStudio) {
  if (!matrix.length) throw new Error('Die Datei enthält keine Mitarbeiterzeilen.');
  const headers = matrix[0].map(normalize);
  const index = aliases => headers.findIndex(h => aliases.includes(h));
  const emailCol = index(['email', 'e-mail', 'e-mail-adresse', 'mail', 'emailadresse']);
  if (emailCol < 0) throw new Error('Die erste Zeile benötigt die Spalte „E-Mail“. Optional: Name, Vorname, Nachname, Studio und Rolle.');
  const nameCol = index(['name', 'full_name', 'mitarbeiter', 'vollstandiger name']);
  const firstCol = index(['vorname', 'firstname', 'first name']), lastCol = index(['nachname', 'lastname', 'last name']);
  const siteCol = index(['studio', 'standort']), roleCol = index(['rolle', 'role']);
  const data = matrix.slice(1).filter(row => row.some(v => String(v ?? '').trim()));
  if (!data.length || data.length > 200) throw new Error('Bitte zwischen 1 und 200 Mitarbeiterzeilen importieren.');
  return data.map((row, i) => {
    const siteName = normalize(row[siteCol]);
    const knownSite = studios.find(s => normalize(s.name) === siteName);
    const role = normalize(row[roleCol]);
    const mapped = { mitarbeiter: 'employee', employee: 'employee', studioleitung: 'studio_manager', studio_manager: 'studio_manager', geschaftsfuhrung: 'admin', admin: 'admin' }[role];
    return { id: `row-${i + 1}`, fullName: String(row[nameCol] ?? '').trim() || [row[firstCol], row[lastCol]].filter(Boolean).join(' ').trim(), email: String(row[emailCol] ?? '').trim().toLowerCase(), role: role ? mapped || '' : 'employee', studioId: siteName ? knownSite?.id || '' : defaultStudio, selected: true, result: null };
  });
}
export function pastedCandidates(text, studios, defaultStudio) {
  const first = text.trim().split(/\r?\n/, 1)[0];
  if (/^(?:[^;\t,]+[;\t,])*\s*(?:e-?mail|mail|emailadresse)\s*(?:[;\t,]|$)/i.test(first)) return importCandidates(csvRows(text), studios, defaultStudio);
  const values = text.split(/[;\n]+/).map(s => s.trim()).filter(Boolean);
  if (!values.length || values.length > 200) throw new Error('Bitte zwischen 1 und 200 Kontakte einfügen.');
  return values.map((value, i) => { const named = value.match(/^([^<>]+)<([^<>]+)>$/); return { id: `row-${i + 1}`, fullName: named?.[1].trim() || '', email: (named?.[2] || value).trim().toLowerCase(), role: 'employee', studioId: defaultStudio, selected: true, result: null }; });
}
export function validateCandidate(row, rows, knownEmails) {
  if (!row.fullName.trim() || row.fullName.length > 100) return 'Name fehlt oder ist zu lang.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || row.email.length > 254) return 'E-Mail-Adresse prüfen.';
  if (!['admin', 'studio_manager', 'employee'].includes(row.role)) return 'Rolle auswählen.';
  if (row.role !== 'admin' && !row.studioId) return 'Studio auswählen.';
  if (rows.some(other => other.id !== row.id && other.selected && row.selected && other.email.trim().toLowerCase() === row.email.trim().toLowerCase())) return 'Adresse kommt mehrfach im Import vor.';
  if (knownEmails.includes(row.email.trim().toLowerCase())) return 'Konto besteht bereits in der geladenen Liste.';
  return '';
}
