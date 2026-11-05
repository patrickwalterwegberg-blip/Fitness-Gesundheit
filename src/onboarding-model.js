export const onboardingMigrationUrl='https://github.com/patrickwalterwegberg-blip/Fitness-Gesundheit/blob/main/backend/supabase/012_employee_onboarding.sql';
export const onboardingCategories={welcome:'Willkommen',service:'Empfang & Service',safety:'Geräte & Sicherheit',tools:'Systeme & Abläufe',team:'Unser Team'};
export const onboardingKinds={course:'Kurs mit Wissenscheck',task:'Aufgabe im Kalender',check:'Checkliste / Einweisung'};
export const blankOnboardingStep=()=>({kind:'check',category:'welcome',title:'',description:'',days:0,course_id:null,requires_review:false,practice:false});
export function onboardingStarter(courses=[]){courses=courses.filter(c=>c.active!==false);return [
 {...blankOnboardingStep(),title:'Im Teamhub ankommen',description:'Öffne dein Mitarbeiterprofil und lerne Übersicht, Aufgaben, Kalender und Chat kennen. Bei Fragen hilft dir Patrick Walter.'},
 {...blankOnboardingStep(),kind:courses.length?'course':'check',category:courses.length?courseCategory(courses[0].title):'service',title:courses[0]?.title||'Empfang und Service kennenlernen',description:courses.length?'Bearbeite die Lektionen und den Wissenscheck dieses Kurses. Besprich offene Fragen mit deiner Leitung.':'Lerne mit der Leitung die Abläufe am Empfang und den Umgang mit Kunden kennen.',days:3,course_id:courses[0]?.id||null},
 {...blankOnboardingStep(),category:'safety',title:'Geräte und Sicherheitseinweisung',description:'Lass dir Geräte, Sicherheitsabläufe und zuständige Ansprechpartner im Studio persönlich zeigen. Die Leitung bestätigt die Einweisung separat.',days:7,requires_review:true},
 {...blankOnboardingStep(),kind:'task',category:'tools',title:'Erste Studioaufgabe erledigen',description:'Vereinbare mit deiner Leitung eine passende erste Tätigkeit und dokumentiere die Erledigung in dieser Aufgabe.',days:10},
 {...blankOnboardingStep(),category:'team',title:'Feedback zur Einarbeitung geben',description:'Besprich offene Fragen und Verbesserungswünsche mit deiner Leitung. Für Rückfragen zum Hub wende dich an Patrick Walter.',days:14},
 ];}
export function courseCompletion(course,assignment,progress){if(!assignment)return {percent:0,done:false};const count=Math.max(1,Number(course.lesson_count)||1),total=count+1+(assignment.requires_practice?1:0),done=Math.min(count,Math.max(0,Number(progress?.lessons_read)||0))+(progress?.quiz_passed?1:0)+(assignment.requires_practice&&progress?.practice_confirmed?1:0);return {percent:Math.floor(done/total*100),done:done===total};}
export function onboardingProgress(plan){const total=Number(plan?.total)||0,done=Math.min(total,Number(plan?.done)||0);return {total,done,percent:total?Math.floor(done/total*100):0,complete:total>0&&done===total};}
export function courseCategory(title){const s=title.toLocaleLowerCase('de');return /willkommen|onboarding|einarbeitung/.test(s)?'welcome':/empfang|service|beratung|vertrieb/.test(s)?'service':/gerät|sicher|hygiene|wartung/.test(s)?'safety':/system|software|hub|werkzeug/.test(s)?'tools':'team';}
export function onboardingError(error){
 if(['PGRST202','PGRST205','42P01'].includes(error?.code))return 'Die Erweiterung 012 für das Mitarbeiter-Onboarding fehlt noch.';
 if(error?.code==='42501')return 'Für diesen Einarbeitungsplan oder diese Aktion fehlt dir die Freigabe.';
 if(error?.code==='40001')return 'Die Vorlage wurde inzwischen geändert. Bitte neu laden und erneut öffnen.';
 if(error?.message?.includes('Assigned onboarding templates'))return 'Diese Vorlage wurde bereits zugewiesen. Erstelle eine Kopie für Änderungen; bestehende Pläne bleiben erhalten.';
 if(error?.message?.includes('already has this onboarding'))return 'Diese Person hat diesen Einarbeitungsplan bereits. Es wurden keine weiteren Aufgaben oder Kurse angelegt.';
 if(error?.message?.includes('different studio or practice'))return 'Ein vorhandener Lernauftrag hat einen anderen Standort oder eine andere Praxisanforderung. Bitte wähle einen passenden Kurs beziehungsweise eine passende Vorlage.';
 if(error?.message?.includes('another studio'))return 'Ein Kursvideo gehört zu einem anderen Studio. Bitte wähle den passenden Standort oder einen Kurs mit studioübergreifendem Video.';
 if(error?.message?.includes('Another reviewer'))return 'Für diese Einweisung muss eine andere berechtigte Person die Bestätigung übernehmen.';
 if(error?.message?.includes('Reviewed steps'))return 'Dieser Schritt wurde bereits von der Leitung bestätigt und bleibt abgeschlossen.';
 if(error?.code==='23514'||error?.code==='23502')return 'Bitte prüfe die Schritte, Kursauswahl, Studiozuordnung und den zuständigen Ansprechpartner.';
 return 'Die Abfrage oder Änderung konnte nicht bestätigt werden. Bitte erneut versuchen.';
}
export async function onboardingRpc(client,name,args={},signal){const q=client.rpc(name,args);const r=await(signal?q.abortSignal(signal):q);if(r.error)throw r.error;return r.data;}
