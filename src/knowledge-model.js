export const knowledgeCategories = ['Studioalltag', 'Empfang & Service', 'Geräte & Sicherheit', 'Marketing', 'Einarbeitung', 'Vorlagen', 'Sonstiges'];
export const knowledgeBucket = 'team-knowledge';
export const maxKnowledgeFile = 50 * 1024 * 1024;
export const knowledgeTypes = {
  pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
export const knowledgeAccept = Object.keys(knowledgeTypes).map(t => '.' + t).join(',');
export function knowledgeMime(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  if (!knowledgeTypes[extension] || file.name.length > 180 || /[/\\]/.test(file.name)) throw new Error('Bitte eine unterstützte Datei mit einem Namen bis 180 Zeichen auswählen.');
  if (!file.size || file.size > maxKnowledgeFile) throw new Error('Dateien müssen zwischen 1 Byte und 50 MB groß sein.');
  return knowledgeTypes[extension];
}
export const fileSize = n => n >= 1024 * 1024 ? (n / 1024 / 1024).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' MB' : Math.ceil(n / 1024).toLocaleString('de-DE') + ' KB';
export const canManageKnowledge = (profile, document, memberships) => profile?.active && (profile.role === 'admin' || profile.role === 'studio_manager' && document.studio_id && memberships.some(m => m.user_id === profile.id && m.studio_id === document.studio_id));
export const canContributeKnowledge = (profile, document, memberships) => !document.archived && (canManageKnowledge(profile, document, memberships) || document.created_by === profile.id);
export function knowledgeError(error) {
  if (['42P01', 'PGRST202', 'PGRST205'].includes(error?.code)) return 'Die Erweiterung für Dateien und Wissen fehlt noch. Bitte Migration 004 in Supabase ausführen.';
  if (error?.code === '42501' || ['403', 403].includes(error?.statusCode)) return 'Dein Zugang hat für diesen Inhalt oder diese Änderung keine Freigabe.';
  if (error?.code === '40001') return 'Der Inhalt wurde inzwischen geändert. Bitte die Ansicht aktualisieren und erneut prüfen.';
  if (error?.code === '23514') return 'Bitte die Angaben und den vollständigen Upload prüfen. Nur fertig hochgeladene Inhalte können freigegeben werden.';
  if (error instanceof Error && !error.code && !error.statusCode) return error.message;
  return 'Die Aktion konnte nicht bestätigt werden. Bitte Verbindung, Berechtigungen und Dateispeicher prüfen.';
}
