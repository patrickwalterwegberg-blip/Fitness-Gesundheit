export const homeMigrationUrl='https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/008_home_portal.sql';
export const homeSqlUrl='https://supabase.com/dashboard/project/ftcurcqduzrxsvkujfql/sql/new';
export const homeKinds={link:'Wichtiger Link',news:'Neuigkeit',contact:'Ansprechpartner'};
export function homeMissing(e){return ['PGRST202','PGRST205','42P01'].includes(e?.code);}
export function homeError(e){return e?.code==='40001'?'Dieser Eintrag wurde inzwischen geändert. Bitte schließen, aktualisieren und erneut öffnen.':e?.code==='42501'?'Diese Änderung ist für deinen Zugang nicht freigegeben.':e?.code==='23514'?'Bitte Angaben, Zieladresse und Sichtbarkeit prüfen.':'Die Abfrage oder Speicherung konnte nicht bestätigt werden. Bitte erneut versuchen.';}
export async function homeRpc(client,name,args={},signal){const query=client.rpc(name,args);const result=await(signal?query.abortSignal(signal):query);if(result.error)throw result.error;return result.data;}
export function safeHomeHref(value){try{const url=new URL(value);return ['https:','mailto:','tel:'].includes(url.protocol)?url.href:null;}catch{return null;}}
