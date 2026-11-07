import React,{useEffect,useRef} from 'react';
import {videoSize} from './course-video-model';
export default function VideoFileDetails({video}){
 const date=Date.parse(video.created_at);
 return <div className="video-file-details"><small>Originaldatei: <strong>{video.file_name||'Nicht vermerkt'}</strong></small><small>Angelegt: {Number.isFinite(date)?new Date(date).toLocaleString('de-DE',{timeZone:'Europe/Berlin',dateStyle:'short',timeStyle:'medium'}):'Nicht vermerkt'} · Europe/Berlin</small></div>;
}
export function VideoRemovalReview({video,busy,onConfirm,onCancel}){
 const ref=useRef(null);
 useEffect(()=>{ref.current?.scrollIntoView({block:'nearest'});ref.current?.querySelector('button')?.focus();},[video.id]);
 return <section ref={ref} className="video-remove-review" role="group" aria-label={`Entfernung prüfen: ${video.title}`}><h4>Entfernung prüfen</h4><p><strong>{video.title}</strong> · {videoSize(video.file_size)}</p><VideoFileDetails video={video}/><p>Entfernt diesen Bibliothekseintrag und seine Originaldatei aus dem Teamhub. Diese Aktion kann im Hub nicht rückgängig gemacht werden.</p><div className="button-group"><button type="button" className="button button-secondary" disabled={busy} onClick={onCancel}>Abbrechen</button><button type="button" className="button" disabled={busy} onClick={onConfirm}>Endgültig entfernen</button></div></section>;
}
