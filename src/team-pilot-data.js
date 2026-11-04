export const pilotMigrationUrl = 'https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/006_pilot_learning.sql';
export const pilotSetupUrl = 'https://supabase.com/dashboard/project/ftcurcqduzrxsvkujfql/sql/new';
export function pilotError(error) {
  if (['42P01','PGRST202','PGRST205','42703'].includes(error?.code)) return 'Die Erweiterung 006 ist noch nicht eingerichtet. Die bisherigen Aufgaben und Dateien kannst du weiter benutzen.';
  if (error?.code === '42501') return 'Für diese Aktion fehlen deinem Konto die Rechte. Bitte wende dich an Patrick Walter.';
  if (error?.code === '23505') return 'Diese Person hat den Kurs bereits zugewiesen bekommen.';
  if (error?.code === '40001') return 'Der Stand wurde inzwischen geändert. Bitte aktualisieren und erneut prüfen.';
  if (error?.message?.includes('Wait ten seconds')) return 'Bitte warte zehn Sekunden vor dem nächsten Quizversuch.';
  if (error?.message?.includes('Assigned courses')) return 'Zugewiesene Kurse bleiben unverändert. Bitte erstelle einen neuen Kurs.';
  if (error?.code === '23514') return 'Bitte prüfe die Eingaben und die Voraussetzungen für diese Aktion.';
  return 'Die Serverabfrage oder Speicherung konnte nicht bestätigt werden. Bitte aktualisieren und erneut versuchen.';
}
export async function pilotRpc(client, name, args, signal) {
  const query = client.rpc(name,args);
  const result = await (signal ? query.abortSignal(signal) : query);
  if (result.error) throw result.error;
  return result.data;
}
export async function pilotRows(client, table, signal, order = 'id') {
  const rows = [];
  for (let offset=0;offset<5000;offset+=200) {
    let query=client.from(table).select('*').order(order);
    if(table==='learning_reads') query=query.order('lesson_index');
    const result=await query.range(offset,offset+199).abortSignal(signal);
    if (result.error) throw result.error;
    rows.push(...result.data);
    if (result.data.length<200) return rows;
  }
  throw new Error('Too many rows for this view');
}
export const pilotDate = date => date ? new Date(date+'T12:00:00').toLocaleDateString('de-DE') : 'Ohne Frist';
