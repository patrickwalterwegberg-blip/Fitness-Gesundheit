const stopwords=new Set('aber alle alles also am an auch auf aus bei bin bis bitte das dass dein deine dem den der des die diese dieser dieses doch ein eine einem einen einer eines er es für gibt habe haben hat hier ich im in ist kann kannst könntest man mein meine meinen meiner mit muss nach nicht noch oder sie sind so soll sollte um und uns unser unsere vom von vor wann warum was welche welchen welcher welches wenn wer wie wir wird wo zum zur'.split(' '));
export function assistantSearchQuery(question){const terms=[...new Set((question.toLocaleLowerCase('de').match(/[\p{L}\p{N}]{3,}/gu)||[]).filter(term=>!stopwords.has(term)))].slice(0,10);if(!terms.length)return question.trim().slice(0,300);const selected=[];let length=0;for(const term of terms){const literal='"'+term.slice(0,250)+'"',extra=literal.length+(selected.length?4:0);if(length+extra>300)break;selected.push(literal);length+=extra;}return selected.join(' OR ');}
export function assistantTaskIntent(question){
 const text=question.toLocaleLowerCase('de').replace(/heute\s+morgen/g,'heute').replace(/\b(?:noch\s+)?nicht\s+erledigt\w*\b/g,'offen');
 if(!/aufgab|to.?do/i.test(text)||!/fällig|heute|welche|meine|zeig|offen|überfällig/i.test(text)||/anlegen|erstellen|bearbeiten|zuweisen|löschen|erledigen|abschließen/i.test(text)||/^\s*(wie(?!\s+viele)|warum|was\s+(ist|bedeutet))\b/i.test(text))return null;
 if(/\b(morgen|übermorgen|gestern|vorgestern|woche[n]?|monat\w*|jahr\w*|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember|täglich|wöchentlich|jährlich|wiederkehrend\w*|erledigt\w*|abgeschlossen\w*|team|mitarbeiter\w*|kolleg\w*|andere[nr]?|fremde[nr]?)\b/.test(text)||/\b\d{1,2}\.\s*\d{1,2}\.|\b\d{4}-\d{2}-\d{2}\b/.test(text))return 'unsupported';
 if(/\bnicht\s+(heute\s+)?fällig\b/.test(text))return 'unsupported';
 return /überfällig/.test(text)?'overdue':/heute|fällig/.test(text)?'due':'open';
}
export function asksForDueTasks(question){return assistantTaskIntent(question)==='due';}

export function sourceExcerpt(text,question,max=700){const value=(text||'').replace(/\s+/g,' ').trim();if(value.length<=max)return value;const terms=(question.toLocaleLowerCase('de').match(/[\p{L}]{4,}/gu)||[]).filter(t=>!stopwords.has(t));const lower=value.toLocaleLowerCase('de'),positions=terms.map(t=>lower.indexOf(t)).filter(i=>i>=0),position=positions.length?Math.min(...positions):0,start=Math.max(0,position-100),end=Math.min(value.length,start+max);return (start?'…':'')+value.slice(start,end)+(end<value.length?'…':'');}
export async function searchAssistantKnowledge(client,question,signal){
 const query=client.rpc('search_knowledge',{p_query:assistantSearchQuery(question),p_studio:null,p_category:'',p_state:'published',p_page:0,p_size:5});const found=await query.abortSignal(signal);if(found.error)throw found.error;if(!Array.isArray(found.data?.items))throw new Error('Die Wissenssuche konnte nicht bestätigt werden.');
 const results=await Promise.all(found.data.items.slice(0,3).map(async candidate=>{
  const doc=await client.from('knowledge_documents').select('id,title,summary,category,published_version_id,archived,updated_at').eq('id',candidate.id).maybeSingle().abortSignal(signal);if(doc.error)throw doc.error;if(!doc.data?.published_version_id||doc.data.archived)return null;
  const version=await client.from('knowledge_versions').select('id,document_id,state,kind,text_content,published_at').eq('id',doc.data.published_version_id).maybeSingle().abortSignal(signal);if(version.error)throw version.error;const v=version.data;if(!v||v.document_id!==doc.data.id||v.state!=='ready'||!v.published_at)return null;
  const isText=!!v.text_content?.trim();return {id:doc.data.id,title:doc.data.title,category:doc.data.category,updated_at:doc.data.updated_at,quote:sourceExcerpt(isText?v.text_content:doc.data.summary,question),isText};
 }));return {sources:results.filter(Boolean),total:found.data.total||0};
}
