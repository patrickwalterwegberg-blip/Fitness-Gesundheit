import {searchAssistantKnowledge} from '../_shared/assistant-knowledge.mjs';
import {modelConfiguration,modelMessages,noEvidence,readModelAnswer} from './model.mjs';
export function createAssistantHandler({createClient,env,fetchModel=fetch,log=event=>console.info(JSON.stringify(event))}){
 return async request=>{
  const requestId=crypto.randomUUID();let origin;
  try{const site=new URL(env.get('TEAMHUB_SITE_URL'));if(site.protocol!=='https:'||site.username||site.password)throw Error();origin=site.origin;}catch{return Response.json({code:'setup_missing',requestId},{status:503});}
  const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'authorization, x-client-info, apikey, content-type','access-control-allow-methods':'POST, OPTIONS','vary':'Origin','cache-control':'no-store'};
  const reply=(code,status,extra={})=>{try{log({event:'teamhub_assistant',requestId,code,status});}catch{}return Response.json({code,requestId,...extra},{status,headers});};
  if(request.headers.get('origin')!==origin)return reply('origin_denied',403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return reply('method_not_allowed',405);
  const authorization=request.headers.get('authorization')||'';
  if(!/^Bearer \S+$/i.test(authorization))return reply('not_authenticated',401);
  const signal=AbortSignal.any([request.signal,AbortSignal.timeout(25000)]);
  try{
   const url=env.get('SUPABASE_URL'),key=env.get('SUPABASE_ANON_KEY');if(!url||!key)return reply('setup_missing',503);
   // Every read and budget reservation uses the caller's JWT. No service-role client.
   const caller=createClient(url,key,{global:{headers:{Authorization:authorization},fetch:(url,init={})=>fetch(url,{...init,signal:AbortSignal.any([signal,...(init.signal?[init.signal]:[])])})},auth:{persistSession:false,autoRefreshToken:false}});
   const {data:auth,error:authError}=await caller.auth.getUser();if(authError||!auth?.user)return reply('not_authenticated',401);
   const {data:profile,error:profileError}=await caller.from('profiles').select('id,active').eq('id',auth.user.id).maybeSingle().abortSignal(signal);
   if(profileError||!profile?.active)return reply('access_denied',403);
   const {data:scope,error:scopeError}=await caller.rpc('team_access_context').abortSignal(signal);
   if(scopeError||(scope?.version||0)<9||!scope?.pages?.includes('knowledge')||!scope?.capabilities?.includes('knowledge.read'))return reply('access_denied',403);
   if(!request.headers.get('content-type')?.startsWith('application/json'))return reply('invalid_input',400);
   const raw=await request.text();if(raw.length>4096)return reply('invalid_input',400);
   let input;try{input=JSON.parse(raw);}catch{return reply('invalid_input',400);}
   if(!['status','answer'].includes(input?.action))return reply('invalid_input',400);
   if(input.action==='answer'&&!scope.capabilities.includes('assistant.ask'))return reply('access_denied',403);
   let config;try{config=modelConfiguration(env);}catch{config=null;}
   const ready=await caller.rpc('team_assistant_status').abortSignal(signal);
   if(ready.error?.code==='42501')return reply('access_denied',403);
   if(ready.error&&!['PGRST202','PGRST205','42P01','42883'].includes(ready.error.code))return reply('request_not_confirmed',502);
   if(ready.error||ready.data?.version!==1)return input.action==='status'?reply('assistant_status',200,{mode:'search',reason:'database_missing'}):reply('database_missing',503);
   if(input.action==='status')return reply('assistant_status',200,{mode:config&&ready.data.can_ask?'ai':'search',reason:!ready.data.can_ask?'ai_not_granted':config?null:'model_missing'});
   if(!config)return reply('model_missing',503);
   const question=typeof input.question==='string'?input.question.trim():'';
   const context=input.context===undefined?[]:input.context;
   if(!question||question.length>300||!Array.isArray(context)||context.length>3||context.some(q=>typeof q!=='string'||q.length>300))return reply('invalid_input',400);
   const searchContext=[question,...context.slice().reverse()].join(' ');
   const found=await searchAssistantKnowledge(caller,searchContext,signal);
   const sources=found.sources.filter(s=>s.isText);
   if(!sources.length)return reply('assistant_answer',200,{text:noEvidence,sources:[],generated:false});
   const reservation=await caller.rpc('reserve_team_assistant_request').abortSignal(signal);
   if(reservation.error)return reply(reservation.error.code==='42501'?'access_denied':'database_missing',reservation.error.code==='42501'?403:503);
   if(reservation.data?.allowed!==true)return reply('rate_limited',429,{retryAfter:Math.min(90000,Math.max(10,Number(reservation.data?.retry_after)||60))});
   const response=await fetchModel(config.url,{method:'POST',redirect:'error',signal,headers:{'authorization':`Bearer ${config.key}`,'content-type':'application/json'},body:JSON.stringify({model:config.model,messages:modelMessages(question,context,sources),response_format:{type:'json_object'},max_completion_tokens:1200,temperature:0.2,store:false})});
   if(!response.ok)return reply(response.status===429?'model_limited':'model_unavailable',502);
   let answer;try{const body=await response.text();if(body.length>100000)throw Error();answer=readModelAnswer(JSON.parse(body),sources);}catch{return reply('invalid_answer',502);}
   // Re-read rights and published versions after the model call. Changed content is never returned.
   const latest=await searchAssistantKnowledge(caller,searchContext,signal);
   if(sources.some(s=>!latest.sources.some(n=>n.id===s.id&&n.versionId===s.versionId&&n.quote===s.quote)))return reply('sources_changed',409);
   const refreshed=await caller.rpc('team_access_context').abortSignal(signal);
   if(refreshed.error||!refreshed.data?.pages?.includes('knowledge')||!refreshed.data?.capabilities?.includes('knowledge.read')||!refreshed.data?.capabilities?.includes('assistant.ask'))return reply('access_denied',403);
   return reply('assistant_answer',200,answer);
  }catch{return reply(signal.aborted?'request_timeout':'request_not_confirmed',502);}
 };
}
