// Reuse the redirect already allowlisted in Supabase; never accept a user supplied redirect.
export function teamAuthRedirect() {
  if (location.protocol !== 'https:' && location.protocol !== 'http:') throw new Error('Hosted sign-in required');
  const url=new URL(location.pathname,location.origin);
  if(url.pathname.endsWith('/login.html'))url.pathname=url.pathname.slice(0,-'login.html'.length);
  url.searchParams.set('team','1');
  return url.href;
}
export function isRejectedMailLink(error){return ['user_not_found','signup_disabled'].includes(error?.code)||/signups? not allowed|user not found/i.test(error?.message||'');}
export function mailRetryDelay(error){return error?.status===429||['over_request_rate_limit','over_email_send_rate_limit','over_sms_send_rate_limit'].includes(error?.code)||isRejectedMailLink(error)?60:0;}
export function authErrorMessage(error,action='login') {
  if(error?.status===429||['over_request_rate_limit','over_email_send_rate_limit','over_sms_send_rate_limit'].includes(error?.code)) return 'Zu viele Versuche. Bitte warte einen Moment und versuche es erneut.';
  if(action==='email') {
    if(isRejectedMailLink(error))return 'Ein Linkversand konnte nicht bestätigt werden. Lass deinen Zugang von der Geschäftsführung prüfen. Neue Mitarbeiter benötigen zuerst eine persönliche Einladung.';
    if(error?.code==='email_address_not_authorized'||/email address not authorized|can only send.*(team|authoriz)|not authorized.*(email|recipient)/i.test(error?.message||''))return 'Der E-Mail-Dienst hat den Versand an diese Empfängeradresse abgelehnt. Die Geschäftsführung muss die Versandfreigabe des E-Mail-Dienstes prüfen.';
    if(['email_provider_disabled','otp_disabled','provider_disabled'].includes(error?.code))return 'Die Anmeldung per E-Mail-Link ist beim Anmeldedienst derzeit nicht aktiviert. Nutze dein bestehendes Teamhub-Passwort oder wende dich an die Geschäftsführung.';
    if(error?.status>=500||/error sending.*(email|mail)|smtp/i.test(error?.message||''))return 'Der Anmeldedienst hat einen Fehler gemeldet. Der Linkversand konnte nicht bestätigt werden. Die Geschäftsführung muss das Versandprotokoll und die E-Mail-Einstellungen prüfen.';
  }
  if(action==='login'&&(['invalid_credentials','email_not_confirmed','user_banned'].includes(error?.code)||/invalid login credentials|email not confirmed/i.test(error?.message||''))) return 'Die Anmeldung war nicht möglich. Prüfe E-Mail und Passwort oder nutze „Passwort festlegen / vergessen“. Bei Problemen wende dich an Patrick Walter.';
  if(action==='password') {
    if(error?.code==='same_password')return 'Bitte wähle ein anderes Passwort als dein bisheriges.';
    if(error?.code==='weak_password'||error?.name==='AuthWeakPasswordError')return 'Dieses Passwort erfüllt die Vorgaben nicht. Wähle ein längeres Passwort mit mindestens 12 Zeichen; gegebenenfalls gelten zusätzliche Vorgaben des Anmeldedienstes.';
    if(['session_not_found','session_expired','refresh_token_not_found','bad_jwt'].includes(error?.code)||error?.status===401)return 'Der Link ist nicht mehr gültig. Bitte fordere einen neuen Link zum Festlegen deines Passworts an.';
  }
  if(location.protocol==='file:') return 'Bitte öffne zum Anmelden die veröffentlichte Teamhub-Webseite.';
  return action==='login'?'Die Anmeldung konnte nicht bestätigt werden. Prüfe deine Angaben und die Verbindung.':action==='password'?'Das neue Passwort konnte nicht gespeichert werden. Bitte versuche es erneut.':'Die E-Mail konnte nicht angefordert werden. Bitte versuche es später erneut oder wende dich an Patrick Walter.';
}
export function passwordValidation(password,confirmation) {
  if(password.length<12)return 'Dein neues Passwort muss mindestens 12 Zeichen lang sein.';
  if(password.length>128)return 'Dein neues Passwort darf höchstens 128 Zeichen lang sein.';
  if(password!==confirmation)return 'Die beiden Passwörter stimmen nicht überein.';
  return '';
}
