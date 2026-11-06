export const layoutEvent='team-layout-order-changed';
export function layoutStorageKey(backend,user){return user?`teamhub-layout-v1:${backend||'team'}:${user}`:null;}
export function readLayout(key){try{const value=JSON.parse(localStorage.getItem(key));if(value?.version!==1||!value.orders||typeof value.orders!=='object')return {};return Object.fromEntries(Object.entries(value.orders).filter(([k,v])=>['menu','shortcuts','home-link','home-news','home-contact'].includes(k)&&Array.isArray(v)&&v.length<=1000).map(([k,v])=>[k,[...new Set(v.filter(id=>typeof id==='string'&&id.length<=100))]]));}catch{return {};}}
export function ordered(items,preference=[],id=item=>item.id){const rank=new Map(preference.map((key,i)=>[key,i]));return items.map((item,i)=>({item,index:rank.has(id(item))?rank.get(id(item)):preference.length+i})).sort((a,b)=>a.index-b.index).map(row=>row.item);}
export function moveOrder(ids,from,to){const next=[...ids],a=next.indexOf(from),b=next.indexOf(to);if(a<0||b<0||a===b)return next;next.splice(a,1);next.splice(b,0,from);return next;}
// Keep the positions of temporarily hidden areas while changing the visible ones.
export function mergeVisibleOrder(previous,visible){const allowed=new Set(visible);let i=0;const next=previous.map(id=>allowed.has(id)?visible[i++]:id);return [...new Set([...next,...visible.slice(i)])];}
