const messages={
 setup_missing:'Der Einladungsdienst ist noch nicht vollständig eingerichtet. Bitte die Einrichtungshilfe für Mitarbeiterzugänge verwenden.',
 account_exists:'Für diese E-Mail-Adresse besteht bereits ein Konto. Aktualisiere die Liste und verwende dort „Anmeldelink anfordern“. Fehlt das Profil, muss die Geschäftsführung es im Backend zuordnen.',
 administrator_required:'Diese Funktion ist für deinen Zugang oder diesen Mitarbeiter nicht freigegeben.',
 not_authenticated:'Deine Sitzung konnte nicht bestätigt werden. Bitte melde dich erneut an.',
 invalid_input:'Bitte Namen, E-Mail-Adresse, Rolle und Standortzuordnung prüfen.',
 invitation_not_confirmed:'Die Einladung konnte beim E-Mail-Dienst nicht bestätigt werden. Aktualisiere die Zugangsliste und prüfe das Konto, bevor du erneut einlädst.',
 provisioning_not_confirmed:'Die Freigabe des eingeladenen Kontos konnte nicht bestätigt werden. Bitte das Mitarbeiterprofil im Backend prüfen.',
 login_target_unavailable:'Der Zugang ist nicht aktiv, hat keine Studiozuordnung oder wurde gerade erst angeschrieben. Bitte prüfen und mindestens 60 Sekunden bis zur nächsten Anfrage warten.',
 email_not_confirmed:'Der Anmeldelink konnte beim E-Mail-Dienst nicht bestätigt werden. Bitte SMTP-Einstellungen und Versandlimits prüfen.',
 mail_check_unavailable:'Dieser Zugang konnte nicht eindeutig geprüft werden. Aktualisiere die Mitarbeiterliste und öffne die Prüfung erneut.',
 request_not_confirmed:'Die Anfrage konnte nicht bestätigt werden. Ob der Versand bereits angestoßen wurde, ist unklar. Prüfe das Konto und Versandprotokoll, bevor du erneut anforderst.',
};
const reasons={
 rate_limited:'Der Anmeldedienst hat sein Anforderungs- oder Versandlimit erreicht. Bitte warte vor einer weiteren Anfrage. Ein Providerlimit kann länger als die Mindestwartezeit des Hubs gelten.',
 recipient_restricted:'Der E-Mail-Dienst hat den Versand an diese Empfängeradresse abgelehnt. Prüfe die Empfängerfreigabe beziehungsweise den eingerichteten SMTP-Versand für Mitarbeiteradressen.',
 provider_disabled:'Der E-Mail-Anbieter ist beim Anmeldedienst nicht aktiviert. Die Geschäftsführung muss die E-Mail-Anmeldung beim Anbieter prüfen.',
 account_unavailable:'Der Anmeldedienst hat den Empfängerzugang nicht bestätigt. Prüfe das bestehende Konto und seine Freischaltung; eine Link-Anforderung legt kein neues Konto an.',
 mail_service_error:'Der E-Mail-Dienst hat einen Versandfehler gemeldet. Prüfe im Anmeldedienst das Versandprotokoll und die SMTP-Einstellungen.',
};
export function mailReference(value){return typeof value==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value)?value:'';}
export function explainAccessError(error){
 let message=messages[error?.code];
 if(['email_not_confirmed','invitation_not_confirmed'].includes(error?.code)&&reasons[error?.reason])message=`${error.code==='invitation_not_confirmed'?'Die Einladung':'Der Anmeldelink'} konnte nicht bestätigt werden. ${reasons[error.reason]}`;
 if(!message){if(error?.code==='40001')message='Der Zugang wurde inzwischen geändert. Bitte aktualisieren und die Änderungen erneut prüfen.';else if(error?.code==='42501')message=messages.administrator_required;else if(['42P01','PGRST202','PGRST205'].includes(error?.code))message='Die Datenbankerweiterung für Mitarbeiterzugänge fehlt. Bitte Migration 003 installieren.';else if(error?.code==='23514')message='Bitte die Eingaben prüfen. Aktive Mitarbeiter benötigen einen Standort; der eigene Adminzugang muss aktiv bleiben.';else message='Die Aktion konnte nicht bestätigt werden. Bitte Verbindung und Einrichtung des Einladungsdienstes prüfen.';}
 const reference=mailReference(error?.requestId);return message+(reference?` Vorgangsnummer: ${reference}`:'');
}
export async function invokeTeamAccess(client,body){
 const {data,error}=await client.functions.invoke('team-access',{body,timeout:30000});if(error){let details;try{details=await error.context?.json();}catch{}throw details||error;}
 if(data?.code!==(body.action==='invite'?'invitation_requested':'login_link_requested'))throw data||{};
 return data;
}
