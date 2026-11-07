import React,{useEffect,useId,useRef} from 'react';
import {X} from 'lucide-react';
import './team-schedule.css';
export default function ScheduleDialog({title,onClose,busy=false,error,children,className='',wide=false,closeLabel='Fenster schließen'}){
 const ref=useRef(null),close=useRef(onClose),titleId=useId();close.current=onClose;
 useEffect(()=>{
  const dialog=ref.current,previous=document.activeElement;
  dialog.showModal();
  const field=[...dialog.querySelectorAll('input:not([type="hidden"]),select,textarea')].find(el=>!el.matches(':disabled')&&el.getClientRects().length);
  (field||dialog.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});
  return()=>{dialog.close();if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[]);
 useEffect(()=>{if(error)ref.current?.querySelector('[role="alert"]')?.scrollIntoView({block:'nearest'});},[error]);
 function keepFocus(event){
  const dialog=ref.current;
  if(event.key!=='Tab'||event.target.closest('dialog')!==dialog)return;
  const items=[...dialog.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(el=>el.tabIndex>=0&&!el.matches(':disabled')&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  const first=items[0],last=items.at(-1);
  if(!first){event.preventDefault();dialog.focus();return;}
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
 return <dialog onKeyDown={keepFocus} ref={ref} className={'panel schedule-dialog '+(wide?'schedule-dialog-wide ':'')+className} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();e.stopPropagation();if(!busy)close.current();}}><div className="section-heading"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label={closeLabel} disabled={busy} onClick={onClose}><X size={20}/></button></div><div className="schedule-dialog-body">{error&&<div className="team-error" role="alert">{error}</div>}{children}</div></dialog>;
}
