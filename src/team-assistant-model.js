export {assistantSearchQuery,sourceExcerpt,searchAssistantKnowledge} from '../backend/supabase/functions/_shared/assistant-knowledge.mjs';
export function assistantTaskIntent(question){
 const text=question.toLocaleLowerCase('de').replace(/heute\s+morgen/g,'heute').replace(/\b(?:noch\s+)?nicht\s+erledigt\w*\b/g,'offen');
 if(!/aufgab|to.?do/i.test(text)||!/fällig|heute|welche|meine|zeig|offen|überfällig/i.test(text)||/anlegen|erstellen|bearbeiten|zuweisen|löschen|erledigen|abschließen/i.test(text)||/^\s*(wie(?!\s+viele)|warum|was\s+(ist|bedeutet))\b/i.test(text))return null;
 if(/\b(morgen|übermorgen|gestern|vorgestern|woche[n]?|monat\w*|jahr\w*|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember|täglich|wöchentlich|jährlich|wiederkehrend\w*|erledigt\w*|abgeschlossen\w*|team|mitarbeiter\w*|kolleg\w*|andere[nr]?|fremde[nr]?)\b/.test(text)||/\b\d{1,2}\.\s*\d{1,2}\.|\b\d{4}-\d{2}-\d{2}\b/.test(text))return 'unsupported';
 if(/\bnicht\s+(heute\s+)?fällig\b/.test(text))return 'unsupported';
 return /überfällig/.test(text)?'overdue':/heute|fällig/.test(text)?'due':'open';
}
export function asksForDueTasks(question){return assistantTaskIntent(question)==='due';}
