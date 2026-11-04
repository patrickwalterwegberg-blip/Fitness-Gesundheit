import React,{useEffect,useRef,useState} from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, ClipboardList, Eye, EyeOff, FolderOpen, KeyRound, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { authErrorMessage,passwordValidation,teamAuthRedirect } from './team-auth';
import './team-login.css';

function PasswordField({name,label,autoComplete='current-password',minLength,disabled}) {
  const [shown,setShown]=useState(false);
  const id=React.useId();
  return <div className="auth-field"><label htmlFor={id}>{label}</label><div className="auth-password-input"><input id={id} name={name} type={shown?'text':'password'} autoComplete={autoComplete} required minLength={minLength} maxLength={autoComplete==='new-password'?128:1024} disabled={disabled}/><button type="button" className="auth-eye" aria-label={`${label} ${shown?'verbergen':'anzeigen'}`} aria-pressed={shown} onClick={()=>setShown(v=>!v)} disabled={disabled}>{shown?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></div>;
}

export default function TeamLogin({client,onStart,accountEmail=null,onClose,initialMode='password'}) {
  const [mode,setMode]=useState(accountEmail?'reset':initialMode),[email,setEmail]=useState(accountEmail||''),[busy,setBusy]=useState(false),[cooldown,setCooldown]=useState(0),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const live=useRef(true),operation=useRef(false);
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(n=>Math.max(0,n-1)),1000);return()=>clearTimeout(timer);},[cooldown]);
  function changeMode(next){if(busy)return;setMode(next);setError('');setNotice('');onStart?.();}
  async function submit(e){
    e.preventDefault();if(operation.current||(mode!=='password'&&cooldown))return;
    const values=new FormData(e.currentTarget),address=(accountEmail||values.get('email')||'').trim();
    operation.current=true;setBusy(true);setError('');setNotice('');onStart?.();
    try {
      const redirect=teamAuthRedirect();
      if(mode==='password') {
        const result=await client.auth.signInWithPassword({email:address,password:values.get('password')});
        if(result.error)throw result.error;
        if(!result.data.session)throw new Error('No confirmed session');
      } else {
        const result=mode==='reset'?await client.auth.resetPasswordForEmail(address,{redirectTo:redirect}):await client.auth.signInWithOtp({email:address,options:{shouldCreateUser:false,emailRedirectTo:redirect}});
        if(result.error&&!['user_not_found','signup_disabled'].includes(result.error.code)&&!/signups? not allowed|user not found/i.test(result.error.message||''))throw result.error;
        if(!live.current)return;
        setNotice(mode==='reset'?'Falls für diese Adresse ein Konto eingerichtet ist, erhältst du eine E-Mail zum Festlegen deines Passworts. Öffne den neuesten Link. Prüfe auch den Spamordner.':'Falls für diese Adresse ein Zugang eingerichtet ist, erhältst du einen Anmeldelink. Prüfe auch den Spamordner.');
        setCooldown(60);
      }
    } catch(e){if(live.current)setError(authErrorMessage(e,mode==='password'?'login':'email'));}
    finally{operation.current=false;if(live.current)setBusy(false);}
  }
  const reset=mode==='reset',magic=mode==='magic';
  return <section className={'team-auth '+(accountEmail?'team-auth-account':'')} aria-label={accountEmail?'Passwort festlegen oder ändern':'Mitarbeiteranmeldung'}>
    {!accountEmail&&<aside className="auth-welcome"><div className="eyebrow">FITNESS & GESUNDHEIT · TEAMHUB</div><h2>Sieben Studios.<br/><span>Ein Team.</span></h2><p>Dein Arbeitsplatz für einen gut organisierten Studioalltag.</p><ul><li><ClipboardList size={21}/><div><strong>Wissen, was ansteht.</strong><span>Deine Aufgaben und Termine im Blick.</span></div></li><li><BookOpen size={21}/><div><strong>Gemeinsam besser werden.</strong><span>Lernen und Fortschritte verfolgen.</span></div></li><li><FolderOpen size={21}/><div><strong>Antworten schnell finden.</strong><span>Freigegebene Unterlagen an einem Ort.</span></div></li></ul><small>Sögel · Bersenbrück · Dörpen · Lathen · Haselünne · Löningen · Werlte</small></aside>}
    <div className="auth-card"><span className="auth-mark">{reset?<KeyRound size={25}/>:magic?<Mail size={25}/>:<LockKeyhole size={25}/>}</span><h2>{reset?'Dein Passwort festlegen.':magic?'Anmeldung per E-Mail.':'Willkommen im Team.'}</h2><p>{reset?'Beim ersten Mal oder wenn du dein Passwort vergessen hast: Fordere einen persönlichen Link per E-Mail an.':magic?'Du erhältst einen zeitlich begrenzten Anmeldelink für dein bestehendes Konto.':'Melde dich mit deiner Firmen-E-Mail-Adresse und deinem persönlichen Teamhub-Passwort an.'}</p>
      {error&&<div className="auth-error" role="alert">{error}</div>}{notice&&<div className="auth-notice" role="status"><CheckCircle2 size={17}/><span>{notice}</span></div>}
      <form onSubmit={submit}><div className="auth-field"><label htmlFor={accountEmail?'account-auth-email':'login-auth-email'}>Deine Firmen-E-Mail-Adresse</label><input id={accountEmail?'account-auth-email':'login-auth-email'} name="email" type="email" autoComplete={mode==='password'?'username':'email'} required maxLength={254} value={email} readOnly={!!accountEmail} disabled={busy} onChange={e=>setEmail(e.target.value)} placeholder="name@hiermachtgesundheitspass.de"/></div>
        {mode==='password'&&<PasswordField name="password" label="Dein Teamhub-Passwort" disabled={busy}/>}
        <button className="button auth-submit" type="submit" disabled={busy||(mode!=='password'&&cooldown>0)}>{busy?<LoaderCircle size={17}/>:reset?<KeyRound size={17}/>:magic?<Mail size={17}/>:<LockKeyhole size={17}/>} {busy?'Bitte warten …':mode!=='password'&&cooldown?`Erneut anfordern in ${cooldown} s`:reset?'Link zum Passwort festlegen senden':magic?'Anmeldelink anfordern':'Anmelden'}</button>
      </form>
      {!accountEmail&&<div className="auth-options">{mode==='password'?<><button type="button" disabled={busy} onClick={()=>changeMode('reset')}>Passwort festlegen / vergessen?</button><button type="button" disabled={busy} onClick={()=>changeMode('magic')}>Mit Anmeldelink anmelden</button></>:<button type="button" disabled={busy} onClick={()=>changeMode('password')}><ArrowLeft size={14}/>Zur Passwort-Anmeldung</button>}</div>}
      {accountEmail&&<button className="text-link auth-back" type="button" disabled={busy} onClick={onClose}>Zurück zum Teamhub</button>}
      <p className="auth-help">{mode==='password'?'Noch kein Teamhub-Passwort? Wähle „Passwort festlegen / vergessen“. ':''}Nur freigeschaltete Mitarbeiter können auf Teamdaten zugreifen. Bei Problemen wende dich an Patrick Walter.</p>
    </div>
  </section>;
}

export function TeamNewPassword({onSave,email,disabled=false}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');const live=useRef(true),operation=useRef(false);
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  async function submit(e){e.preventDefault();if(operation.current||disabled)return;const data=new FormData(e.currentTarget),password=data.get('new_password'),confirmation=data.get('confirm_password'),validation=passwordValidation(password,confirmation);if(validation){setError(validation);return;}operation.current=true;setBusy(true);setError('');try{await onSave(password);}catch(e){if(live.current)setError(authErrorMessage(e,'password'));}finally{operation.current=false;if(live.current)setBusy(false);}}
  return <section className="team-auth team-auth-account"><div className="auth-card"><span className="auth-mark"><KeyRound size={25}/></span><h2>Dein neues Teamhub-Passwort.</h2><p>Lege dein persönliches Passwort für {email} fest. Danach meldest du dich mit E-Mail und Passwort an.</p>{error&&<div className="auth-error" role="alert">{error}</div>}<form onSubmit={submit}><PasswordField name="new_password" label="Neues Passwort" autoComplete="new-password" minLength={12} disabled={busy||disabled}/><PasswordField name="confirm_password" label="Neues Passwort wiederholen" autoComplete="new-password" minLength={12} disabled={busy||disabled}/><p className="auth-password-hint">Mindestens 12 Zeichen. Eine längere, eigene Passphrase lässt sich gut merken.</p><button className="button auth-submit" disabled={busy||disabled} type="submit">{busy?<LoaderCircle size={17}/>:<LockKeyhole size={17}/>} {busy?'Wird gespeichert …':'Passwort speichern und abmelden'}</button></form><p className="auth-help">Verwende ein eigenes Passwort für den Teamhub. Dein 1&1-Postfachpasswort wird dafür nicht benötigt.</p></div></section>;
}
