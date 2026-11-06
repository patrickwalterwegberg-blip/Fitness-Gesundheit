const errors={
 access_denied:'Dein Zugang ist für diese KI-Anfrage nicht freigegeben. Bitte aktualisiere deine Freigaben.',
 not_authenticated:'Deine Sitzung konnte nicht bestätigt werden. Bitte melde dich erneut an.',
 database_missing:'Die Datenbankerweiterung für den KI-Bot ist noch nicht eingerichtet. Die bisherige Wissenssuche bleibt verfügbar.',
 model_missing:'Der KI-Bot ist noch nicht mit einem Modell verbunden. Du kannst weiterhin die Originalquellen durchsuchen.',
 model_unavailable:'Das KI-Modell ist gerade nicht erreichbar. Deine Frage bleibt für einen erneuten Versuch erhalten.',
 model_limited:'Der KI-Anbieter hat sein Limit erreicht. Bitte versuche es später oder suche in den Originalquellen.',
 rate_limited:'Das Anfragelimit für den KI-Bot ist erreicht. Bitte warte bis zur nächsten Freigabe. Die Originalquellensuche bleibt verfügbar.',
 invalid_answer:'Die KI-Antwort konnte nicht mit gültigen Quellen bestätigt werden. Bitte suche in den Originalquellen oder versuche es erneut.',
 sources_changed:'Eine Quelle oder Freigabe wurde während der Antwort geändert. Bitte stelle die Frage erneut.',
 request_timeout:'Die KI-Anfrage hat zu lange gedauert. Deine Frage bleibt erhalten; es erfolgt kein automatischer Neuversuch.',
};
export function assistantServiceError(error){const message=errors[error?.code]||'Die KI-Anfrage konnte nicht bestätigt werden. Deine Frage bleibt erhalten. Die Originalquellensuche steht weiterhin zur Verfügung.';return message+(/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(error?.requestId||'')?` Vorgangsnummer: ${error.requestId}`:'');}
export async function invokeAssistant(client,body,signal){
 const {data,error}=await client.functions.invoke('team-assistant',{body,signal,timeout:30000});
 if(error){let detail;try{detail=await error.context?.json();}catch{}throw detail||error;}
 if(data?.code!==(body.action==='status'?'assistant_status':'assistant_answer'))throw data||{};
 if(body.action==='answer'&&(typeof data.text!=='string'||data.text.length>6000||typeof data.generated!=='boolean'||!Array.isArray(data.sources)||data.sources.length>3||(data.generated&&!data.sources.length)||data.sources.some(s=>!s||!['id','title','category','quote'].every(k=>typeof s[k]==='string')||typeof s.isText!=='boolean')))throw {code:'invalid_answer'};
 return data;
}
