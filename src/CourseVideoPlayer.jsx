import React,{useEffect,useRef,useState} from 'react';
import {Play,RefreshCw} from 'lucide-react';
import {videoBucket,videoError} from './course-video-model';
import './course-videos.css';
export default function CourseVideoPlayer({client,id,title='Kursvideo'}){
 const [url,setUrl]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false),[reload,setReload]=useState(0),[requested,setRequested]=useState(false);const player=useRef(null);
 useEffect(()=>{setRequested(false);setUrl('');setError('');},[id]);
 useEffect(()=>{const controller=new AbortController();let active=true;const el=player.current;setUrl('');setError('');if(!requested)return;setLoading(true);
 (async()=>{const r=await client.from('learning_videos').select('id,state,object_path').eq('id',id).single().abortSignal(controller.signal);if(r.error)throw r.error;if(r.data?.state!=='ready')throw {code:'42501'};const signed=await client.storage.from(videoBucket).createSignedUrl(r.data.object_path,600);if(signed.error)throw signed.error;if(!signed.data?.signedUrl)throw new Error('Missing video URL');if(active)setUrl(signed.data.signedUrl);})().catch(e=>{if(active&&!controller.signal.aborted)setError(videoError(e));}).finally(()=>{if(active)setLoading(false);});
 return()=>{active=false;controller.abort();if(el){el.pause();el.removeAttribute('src');el.load();}};
 },[client,id,requested,reload]);
 return <section className="course-video-player" aria-label={'Video: '+title}>{!requested?<button className="button button-secondary" onClick={()=>setRequested(true)}><Play size={17}/>Video laden</button>:loading?<p role="status">Videozugriff wird geprüft …</p>:url&&<video key={url} ref={player} src={url} controls playsInline preload="metadata" aria-label={title} onError={()=>setError('Dieses Video konnte nicht abgespielt werden. Lade es erneut. Falls das Format auf deinem Gerät nicht unterstützt wird, verwende ein MP4-Video mit H.264.')}/>} {error&&<><p className="team-error" role="alert">{error}</p><button className="button button-secondary" onClick={()=>{setRequested(true);setReload(n=>n+1);}}><RefreshCw size={15}/>Video erneut laden</button></>}</section>;
}
