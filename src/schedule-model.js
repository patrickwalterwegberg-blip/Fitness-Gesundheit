export const scheduleMigrationUrl='https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/010_calendar_tasks_notifications.sql';
export const repeats=[['none','Einmalig'],['day','Täglich'],['week','Wöchentlich'],['month','Monatlich'],['year','Jährlich']];
export function repeatLabel(task){if(!task.repeat_unit||task.repeat_unit==='none')return 'Einmalig';const n=task.repeat_every||1;return n===1?repeats.find(([id])=>id===task.repeat_unit)?.[1]:`Alle ${n} ${({day:'Tage',week:'Wochen',month:'Monate',year:'Jahre'})[task.repeat_unit]}`;}
export function scheduleError(error){
 if(['PGRST202','PGRST205','42P01','42703'].includes(error?.code))return 'Die Datenbankerweiterung 010 für Kalender, Aufgaben und Benachrichtigungen fehlt noch.';
 if(error?.code==='42501')return 'Für diese Aktion fehlt dir die Freigabe. Bitte wende dich an Patrick Walter.';
 if(error?.code==='40001'||error?.code==='PGRST116')return 'Dieser Eintrag wurde inzwischen geändert. Bitte schließen, aktualisieren und erneut öffnen.';
 if(error?.code==='23514'||error?.code==='23502')return 'Bitte prüfe die Angaben. Eine abgeschlossene Wiederholungsaufgabe mit Folgetermin kann nicht erneut geöffnet werden.';
 return error?.localMessage||'Die Serverabfrage oder Speicherung konnte nicht bestätigt werden. Bitte erneut versuchen.';
}
export async function scheduleRpc(client,name,args={},signal){const query=client.rpc(name,args);const result=await(signal?query.abortSignal(signal):query);if(result.error)throw result.error;return result.data;}
export function berlinLocal(value){if(!value)return '';const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;}
export function berlinInstant(value){
 const base=Date.parse(value+'Z');if(!Number.isFinite(base))throw {localMessage:'Bitte gib Datum und Uhrzeit vollständig ein.'};
 const matches=[2,1].map(offset=>new Date(base-offset*3600000).toISOString()).filter(iso=>berlinLocal(iso)===value);
 if(matches.length!==1)throw {localMessage:'Diese Uhrzeit ist wegen der Zeitumstellung nicht eindeutig oder existiert nicht. Bitte wähle eine andere Uhrzeit.'};return matches[0];
}
export const eventTime=value=>new Date(value).toLocaleString('de-DE',{timeZone:'Europe/Berlin',dateStyle:'short',timeStyle:'short'});
export function dayBounds(day){return [berlinInstant(day+'T00:00'),berlinInstant(new Date(Date.parse(day+'T12:00Z')+86400000).toISOString().slice(0,10)+'T00:00')];}
