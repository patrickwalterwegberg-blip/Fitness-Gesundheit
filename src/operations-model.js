export const operationsMigrationUrl='https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/014_operations_check.sql';
export const operationsTables=['profiles','tasks','calendar_events','knowledge_documents','knowledge_versions','learning_videos','team_chat_messages','team_feedback','onboarding_enrollments','team_function_access'];
export const qualityChecks=[
 ['active_without_studio','Aktive Mitarbeiter ohne Studio','Kontozuordnung im Mitarbeiterbereich prüfen. Admins benötigen keine einzelne Studiozuordnung.'],
 ['auth_without_profile','Anmeldekonten ohne Mitarbeiterprofil','Bestehende Konten im Anmeldedienst zuordnen; nicht erneut einladen oder automatisch löschen.'],
 ['duplicate_email_groups','Doppelte normalisierte E-Mail-Gruppen','Gleich geschriebene Adressen nach Groß-/Kleinschreibung und Leerzeichen prüfen.'],
 ['invalid_published_versions','Unstimmige veröffentlichte Wissensversionen','Freigabe und zugehörige Version im Dateibereich prüfen.'],
 ['pending_knowledge_uploads','Unvollständige Wissens-Uploads','Ein laufender Upload kann regulär sein. Abgebrochene Uploads im Dateibereich prüfen.'],
 ['unlinked_knowledge_objects','Wissensdateien ohne Hubeintrag','Direkt im Speicher abgelegte Dateien haben nicht automatisch einen Wissenseintrag.'],
 ['missing_knowledge_objects','Bereite Wissenseinträge ohne Originaldatei','Original und Version prüfen. Fehlende Dateien gegebenenfalls aus einer geprüften Sicherung wiederherstellen.'],
 ['missing_video_objects','Bereite Videos ohne Originaldatei','Bibliothekseintrag und Speicher prüfen. Fehlende Originale nicht als erfolgreich verfügbar behandeln.'],
 ['pending_video_uploads','Unvollständige Video-Uploads','Laufende oder unterbrochene Übertragungen im Videostudio prüfen.'],
 ['unlinked_video_objects','Videodateien ohne Bibliothekseintrag','Datei und Bibliothekszuordnung prüfen; keine automatische Bereinigung auslösen.'],
];
const count=n=>Number.isSafeInteger(n)&&n>=0;
export function validOperations(data){
 if(data?.version!==1||typeof data.checked_at!=='string'||!Number.isFinite(Date.parse(data.checked_at))||typeof data.private_schema_anonymous!=='boolean'||!['onboarding','assistant'].every(k=>typeof data.installations?.[k]==='boolean')||typeof data.cron?.installed!=='boolean'||!(data.cron.active_jobs===null||count(data.cron.active_jobs))||!qualityChecks.every(([k])=>count(data.quality?.[k])))return false;
 if(!Array.isArray(data.buckets)||data.buckets.length!==2||!['team-knowledge','course-videos'].every(id=>data.buckets.filter(b=>b?.id===id&&typeof b.exists==='boolean'&&(b.exists?typeof b.private==='boolean':b.private===null)&&(b.size_limit===null||count(b.size_limit))).length===1))return false;
 return Array.isArray(data.tables)&&data.tables.length===operationsTables.length&&operationsTables.every(name=>data.tables.filter(t=>t?.name===name&&typeof t.exists==='boolean'&&typeof t.rls==='boolean'&&(t.exists?typeof t.anonymous_select==='boolean':t.anonymous_select===null)).length===1);
}
export function operationsError(error){
 if(['PGRST202','PGRST205','42P01','42883'].includes(error?.code))return {setup:true,text:'Die Betriebsprüfung ist im Backend noch nicht eingerichtet. Bitte Erweiterung 014 nach den vorhandenen Erweiterungen 001–012 installieren.'};
 if(error?.code==='42501'||error?.status===403)return {setup:false,text:'Die Betriebsprüfung ist ausschließlich für aktive Admin- und Geschäftsleitungszugänge freigegeben.'};
 return {setup:false,text:'Die Betriebsprüfung konnte nicht bestätigt werden. Vorherige Prüfdaten wurden verworfen. Bitte Verbindung und Backend prüfen.'};
}
