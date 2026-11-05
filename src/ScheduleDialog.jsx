import React,{useEffect,useRef} from 'react';
import {X} from 'lucide-react';
import './team-schedule.css';
export default function ScheduleDialog({title,onClose,busy=false,error,children}){
 const ref=useRef(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const dialog=ref.current,previous=document.activeElement;dialog.showModal();dialog.querySelector('input,select,textarea')?.focus();return()=>{dialog.close();if(previous?.isConnected)previous.focus({preventScroll:true});};},[]);
 useEffect(()=>{if(error)ref.current?.querySelector('[role="alert"]')?.scrollIntoView({block:'nearest'});},[error]);
 return <dialog ref={ref} className="panel schedule-dialog" aria-labelledby="schedule-dialog-title" onCancel={e=>{e.preventDefault();if(!busy)close.current();}}><div className="section-heading"><h2 id="schedule-dialog-title">{title}</h2><button className="icon-button" aria-label="Fenster schließen" disabled={busy} onClick={onClose}><X size={20}/></button></div><div className="schedule-dialog-body">{error&&<div className="team-error" role="alert">{error}</div>}{children}</div></dialog>;
}
