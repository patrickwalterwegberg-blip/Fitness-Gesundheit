import { studios } from './studios';

export const roleLabels = { admin: 'Geschäftsführung', studio_manager: 'Studioleitung', employee: 'Mitarbeiter' };
export const targets = { standalone: 'Eigenständiges Modul', tasks: 'Aufgaben – Zusatzfelder', equipment: 'Geräte – Zusatzfelder', inventory: 'Lager – Zusatzfelder', team: 'Mitarbeiter – Zusatzfelder', crm: 'Kontakte & CRM – Zusatzfelder', marketing: 'Marketing – Zusatzfelder', knowledge: 'Dateien & Wissen – Zusatzfelder', contacts: 'Notfallkontakte – Zusatzfelder' };
export const fieldTypes = { text: 'Text', textarea: 'Langer Text', number: 'Zahl', date: 'Datum', select: 'Auswahl', checkbox: 'Checkbox', file: 'Datei', member: 'Mitarbeiter' };
export const roleKey = actor => actor?.role === 'admin' || actor?.role === 'Geschäftsführung' ? 'admin' : actor?.role === 'studio_manager' || actor?.role === 'Studioleitung' ? 'studio_manager' : 'employee';
export const isAdmin = actor => actor && actor.active !== false && roleKey(actor) === 'admin';
export function hasDesignRight(actor, grants, right) { return !!actor && actor.active !== false && (isAdmin(actor) || grants[actor.id]?.[right] === true); }
export function blankSchema() { return { title: '', description: '', target: 'standalone', studios: ['Alle Studios'], readerRoles: Object.keys(roleLabels), writerRoles: Object.keys(roleLabels), fields: [] }; }
export function validateSchema(schema, publishing = true) {
  const errors = [];
  if (!schema?.title?.trim() || schema.title.length > 80) errors.push('Gib einen Modulnamen mit höchstens 80 Zeichen ein.');
  if (!Object.hasOwn(targets, schema?.target)) errors.push('Wähle einen unterstützten Modulbereich.');
  if (!schema?.studios?.length || schema.studios.some(s => !studios.includes(s))) errors.push('Wähle mindestens einen gültigen Standort.');
  if (!Array.isArray(schema?.readerRoles) || !Array.isArray(schema?.writerRoles) || !schema.readerRoles.length || schema.readerRoles.some(r => !Object.hasOwn(roleLabels, r)) || schema?.writerRoles?.some(r => !schema.readerRoles.includes(r))) errors.push('Schreibrollen müssen auch Leserechte besitzen.');
  if (!Array.isArray(schema?.fields) || schema.fields.length > 30) errors.push('Ein Modul kann höchstens 30 Felder enthalten.');
  if (publishing && !schema?.fields?.length) errors.push('Füge vor der Veröffentlichung mindestens ein Feld hinzu.');
  const ids = new Set(); const labels = new Set();
  for (const f of schema?.fields || []) {
    if (!f.id || ids.has(f.id)) errors.push('Jedes Feld benötigt eine eindeutige ID.');
    ids.add(f.id);
    if (!Object.hasOwn(fieldTypes, f.type)) errors.push('Ein Feld hat einen unbekannten Typ.');
    if (publishing && (!f.label?.trim() || f.label.length > 80 || labels.has(f.label.trim().toLocaleLowerCase('de')))) errors.push('Feldnamen müssen ausgefüllt, eindeutig und höchstens 80 Zeichen lang sein.');
    if (f.label) labels.add(f.label.trim().toLocaleLowerCase('de'));
    if (publishing && f.type === 'select' && (!f.options?.length || f.options.some(o => !o.trim() || o.length > 100) || new Set(f.options).size !== f.options.length)) errors.push(`Hinterlege eindeutige Auswahloptionen für „${f.label || 'Auswahl'}“.`);
  }
  return [...new Set(errors)];
}
const clone = value => structuredClone(value);
export const publishedVersion = module => module.versions.find(v => v.id === module.publishedVersionId);
function requireRight(actor, grants, right) { if (!hasDesignRight(actor, grants, right)) throw new Error('Diese Baukastenfunktion wurde für dein Profil nicht freigegeben.'); }
function existingModule(modules, id, revision) {
  const m = modules.find(m => m.id === id);
  if (!m || m.revision !== revision) throw new Error('Das Modul wurde zwischenzeitlich geändert. Lade den Entwurf neu, bevor du speicherst.');
  return m;
}
export function saveModuleDraft(modules, actor, grants, id, schema, revision) {
  requireRight(actor, grants, id ? 'edit' : 'create');
  const errors = validateSchema(schema, false); if (errors.length) throw new Error(errors.join(' '));
  const old = id ? existingModule(modules, id, revision) : null;
  if (old?.publishedVersionId && schema.target !== publishedVersion(old).schema.target) throw new Error('Der Bereich eines veröffentlichten Moduls bleibt fest. Erstelle für einen anderen Bereich ein neues Modul.');
  const module = { ...(old || { id: crypto.randomUUID(), versions: [], ownerId: actor.id, publishedVersionId: null }), draft: clone(schema), revision: (old?.revision || 0) + 1, updatedAt: new Date().toISOString() };
  return { module, modules: old ? modules.map(m => m.id === id ? module : m) : [...modules, module] };
}
export function publishModule(modules, actor, grants, id, schema, revision, restoredFrom = null) {
  requireRight(actor, grants, 'publish');
  const errors = validateSchema(schema); if (errors.length) throw new Error(errors.join(' '));
  const saved = saveModuleDraft(modules, actor, grants, id, schema, revision);
  const version = { id: crypto.randomUUID(), number: saved.module.versions.length + 1, schema: clone(schema), at: new Date().toISOString(), by: actor.id, byName: actor.name, restoredFrom };
  const module = { ...saved.module, draft: null, publishedVersionId: version.id, versions: [...saved.module.versions, version] };
  return { module, modules: saved.modules.map(m => m.id === module.id ? module : m) };
}
export function canReadSchema(actor, schema) {
  if (!actor || actor.active === false || !schema) return false;
  return isAdmin(actor) || (schema.readerRoles.includes(roleKey(actor)) && (schema.studios.includes('Alle Studios') || actor.studio === 'Alle Studios' || schema.studios.includes(actor.studio)));
}
export function canWriteSchema(actor, schema, studio) {
  return canReadSchema(actor, schema) && (isAdmin(actor) || schema.writerRoles.includes(roleKey(actor))) && studio !== 'Alle Studios' && studios.includes(studio) && (schema.studios.includes('Alle Studios') || schema.studios.includes(studio)) && (isAdmin(actor) || actor.studio === 'Alle Studios' || actor.studio === studio);
}
export function validateRecord(schema, values, people = []) {
  const errors = [];
  for (const f of schema.fields) {
    const v = values[f.id]; const empty = v === undefined || v === null || v === '' || (f.type === 'checkbox' && v !== true);
    if (f.required && empty) { errors.push(`„${f.label}“ ist ein Pflichtfeld.`); continue; }
    if (empty) continue;
    if (['text', 'textarea'].includes(f.type) && (typeof v !== 'string' || v.length > 5000)) errors.push(`„${f.label}“ darf höchstens 5.000 Zeichen enthalten.`);
    if (f.type === 'number' && (typeof v !== 'number' || !Number.isFinite(v))) errors.push(`„${f.label}“ benötigt eine gültige Zahl.`);
    if (f.type === 'date' && (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v)) errors.push(`„${f.label}“ benötigt ein gültiges Datum.`);
    if (f.type === 'select' && !f.options.includes(v)) errors.push(`Wähle einen gültigen Wert für „${f.label}“.`);
    if (f.type === 'checkbox' && typeof v !== 'boolean') errors.push(`„${f.label}“ benötigt einen Checkbox-Wert.`);
    if (f.type === 'member' && !people.some(p => p.id === v && p.active !== false)) errors.push(`Wähle ein aktives Mitarbeiterprofil für „${f.label}“.`);
    if (f.type === 'file' && (!v.id || typeof v.name !== 'string' || v.size > 20 * 1024 * 1024)) errors.push(`„${f.label}“ benötigt eine Datei mit höchstens 20 MB.`);
  }
  if (Object.keys(values).some(id => !schema.fields.some(f => f.id === id))) errors.push('Der Eintrag enthält ein Feld, das nicht zu dieser Modulversion gehört.');
  return errors;
}

const seedSchema = { ...blankSchema(), title: 'Studio-Check', description: 'Ein eigener, versionierter Kontrollbogen für den Studioalltag.', fields: [
  { id: 'check-area', label: 'Bereich', type: 'select', options: ['Empfang', 'Trainingsfläche', 'Umkleiden'], required: true },
  { id: 'check-done', label: 'Kontrolle abgeschlossen', type: 'checkbox', required: true },
  { id: 'check-note', label: 'Hinweis', type: 'textarea', required: false },
] };
export const initialModules = [{ id: 'demo-studio-check', ownerId: 'p1', revision: 1, draft: null, publishedVersionId: 'demo-check-v1', updatedAt: '2026-11-04T08:00:00Z', versions: [{ id: 'demo-check-v1', number: 1, schema: seedSchema, at: '2026-11-04T08:00:00Z', by: 'p1', byName: 'Patrick Walter' }] }];
