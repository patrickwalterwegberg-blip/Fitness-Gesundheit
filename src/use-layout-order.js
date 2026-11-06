import {useEffect,useState} from 'react';
import {layoutEvent,layoutStorageKey,mergeVisibleOrder,readLayout} from './layout-order';
export default function useLayoutOrder(backend,user){
 const key=layoutStorageKey(backend,user),[state,setState]=useState(()=>({key,orders:key?readLayout(key):{}}));
 const orders=state.key===key?state.orders:key?readLayout(key):{};
 useEffect(()=>{const refresh=event=>{if(!event||event.key===key||event.detail?.key===key||event.type==='storage'&&event.key===null)setState({key,orders:key?readLayout(key):{}});};refresh();window.addEventListener('storage',refresh);window.addEventListener(layoutEvent,refresh);return()=>{window.removeEventListener('storage',refresh);window.removeEventListener(layoutEvent,refresh);};},[key]);
 function save(patch){if(!key)throw new Error('Bitte zuerst im Team anmelden.');const next={...readLayout(key)};for(const [name,ids] of Object.entries(patch)){if(ids===null)delete next[name];else next[name]=mergeVisibleOrder(next[name]||[],ids);}try{localStorage.setItem(key,JSON.stringify({version:1,orders:next}));}catch{throw new Error('Dein Browser konnte die Anordnung nicht speichern. Bitte erlaube das Speichern von Seitendaten und versuche es erneut.');}setState({key,orders:next});window.dispatchEvent(new CustomEvent(layoutEvent,{detail:{key}}));}
 return {orders,save};
}
