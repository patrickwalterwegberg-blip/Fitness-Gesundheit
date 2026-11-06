import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAssistantHandler} from '../backend/supabase/functions/team-assistant/handler.mjs';
const uid='00000000-0000-4000-8000-000000000001',did='00000000-0000-4000-8000-000000000002',vid='00000000-0000-4000-8000-000000000003';
const origin='https://team.example.org';
const completion=(value={answer:'Begrüße Anrufer freundlich mit Fitness & Gesundheit.',citations:[1],insufficient:false},finish='stop')=>({choices:[{finish_reason:finish,message:{content:JSON.stringify(value)}}]});
function setup(options={}){
 const calls=[],logs=[],state={active:true,pages:['knowledge'],capabilities:['knowledge.read','assistant.ask'],published:vid,archived:false,ready:true,text:'Am Telefon begrüßen wir Anrufer freundlich mit Fitness & Gesundheit.',...options};
 const env=new Map(Object.entries({TEAMHUB_SITE_URL:origin+'/',SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'public-key',TEAMHUB_AI_ENABLED:'true',TEAMHUB_AI_API_KEY:'private-model-key',TEAMHUB_AI_BASE_URL:'https://model.example.org/v1',TEAMHUB_AI_MODEL:'example-model',...options.env}));
 const query=(name)=>{const filters={};const q={select(){return q;},eq(k,v){filters[k]=v;return q;},maybeSingle(){return q;},abortSignal(){let data;if(name==='profiles')data={id:uid,active:state.active};if(name==='knowledge_documents')data={id:did,title:'Telefon',summary:'Freigegebene Regeln',category:'Empfang',published_version_id:state.published,archived:state.archived};if(name==='knowledge_versions')data={id:vid,document_id:did,text_content:state.text,state:state.ready?'ready':'draft',published_at:state.ready?'2026-11-06T09:00:00Z':null};return Promise.resolve({data});}};return q;};
 const client={auth:{getUser:async()=>options.noSession?{error:true}:{data:{user:{id:uid}}}},from:query,rpc:(name,args)=>({abortSignal:async()=>{calls.push({name,args});if(name==='team_access_context')return {data:{version:12,pages:state.pages,capabilities:state.capabilities}};if(name==='team_assistant_status')return options.databaseMissing?{error:{code:'PGRST202'}}:{data:{version:1,can_ask:state.capabilities.includes('assistant.ask')}};if(name==='reserve_team_assistant_request')return {data:options.limited?{allowed:false,retry_after:120}:{allowed:true}};if(name==='search_knowledge')return {data:{items:options.noSources?[]:[{id:did}],total:options.noSources?0:1}};throw Error('Unexpected RPC');}})};
 const handler=createAssistantHandler({env,log:event=>logs.push(event),createClient:(_url,key,config)=>{calls.push({name:'client',key,config});return client;},fetchModel:async(url,request)=>{calls.push({name:'model',url,request,body:JSON.parse(request.body)});options.onModel?.(state);if(options.fetchFailure)throw Error('private-provider-error');return new Response(JSON.stringify(options.modelBody||completion()),{status:options.modelStatus||200});}});
 const request=(body={action:'answer',question:'Wie begrüße ich am Telefon?'},headers={},extra={})=>handler(new Request(origin+'/functions/v1/team-assistant',{method:'POST',headers:{origin,authorization:'Bearer user-session','content-type':'application/json',...headers},body:JSON.stringify(body),...extra}));
 return {request,calls,state,logs,handler};
}
test('assistant rejects origins, missing sessions, inactive profiles and withdrawn source permissions before any model call',async()=>{
 for(const [options,headers,status] of [[{}, {origin:'https://other.example.org'},403],[{noSession:true},{},401],[{active:false},{},403],[{pages:[]},{},403],[{capabilities:[]},{},403],[{capabilities:['knowledge.read']},{},403],[{}, {authorization:''},401]]){
  const s=setup(options);assert.equal((await s.request(undefined,headers)).status,status);assert.equal(s.calls.some(c=>c.name==='model'||c.name==='reserve_team_assistant_request'),false);
 }
 const s=setup();const preflight=await s.handler(new Request(origin,{method:'OPTIONS',headers:{origin}}));assert.equal(preflight.status,204);assert.equal(s.calls.length,0);
});
test('status is authenticated, read-only and distinguishes missing database and disabled model configuration',async()=>{
 for(const [options,mode,reason] of [[{},'ai',null],[{capabilities:['knowledge.read']},'search','ai_not_granted'],[{env:{TEAMHUB_AI_ENABLED:'false'}},'search','model_missing'],[{env:{TEAMHUB_AI_API_KEY:''}},'search','model_missing'],[{env:{TEAMHUB_AI_BASE_URL:'https://key:password@example.org'}},'search','model_missing'],[{databaseMissing:true},'search','database_missing']]){
  const s=setup(options),data=await (await s.request({action:'status'})).json();assert.equal(data.mode,mode);assert.equal(data.reason,reason);assert.equal(s.calls.some(c=>c.name==='model'||c.name==='reserve_team_assistant_request'),false);
 }
});
test('model receives only server-read sources and bounded questions, never supplied source IDs or caller credentials',async()=>{
 const s=setup();const response=await s.request({action:'answer',question:'Telefon?',context:['Wie begrüßen wir Gäste?'],sources:[{id:'forged',quote:'PRIVATE-FORGED-CONTENT'}],userId:'someone-else',model:'forged-model'});const data=await response.json();assert.equal(response.status,200);assert.equal(data.generated,true);assert.equal(data.sources[0].id,did);assert.equal(data.sources[0].versionId,vid);
 const model=s.calls.find(c=>c.name==='model');assert.equal(model.body.model,'example-model');assert.equal(model.url,'https://model.example.org/v1/chat/completions');assert.equal(model.request.redirect,'error');assert.equal(model.body.store,false);assert.equal(model.body.max_completion_tokens,1200);assert.equal(JSON.stringify(model.body).includes('PRIVATE-FORGED-CONTENT'),false);assert.equal(JSON.stringify(model.body).includes('user-session'),false);assert.equal(model.body.tools,undefined);assert.ok(model.body.messages[1].content.includes(s.state.text));assert.equal(s.calls.filter(c=>c.name==='client').every(c=>c.key==='public-key'),true);
 const output=JSON.stringify({data,logs:s.logs});for(const secret of ['private-model-key','user-session','public-key'])assert.equal(output.includes(secret),false);
});
test('drafts, archived material, descriptions and empty searches do not invoke the model or consume its quota',async()=>{
 for(const options of [{published:null},{archived:true},{ready:false},{text:''},{noSources:true}]){const s=setup(options);const data=await (await s.request()).json();assert.equal(data.code,'assistant_answer');assert.equal(data.generated,false);assert.deepEqual(data.sources,[]);assert.equal(s.calls.some(c=>c.name==='model'||c.name==='reserve_team_assistant_request'),false);}
});
test('invalid questions or context never reserve budget or call a model',async()=>{
 for(const body of [{action:'write'},{action:'answer',question:'x'.repeat(301)},{action:'answer',question:' '},{action:'answer',question:'Telefon',context:['x'.repeat(301)]},{action:'answer',question:'Telefon',context:Array(4).fill('q')},{action:'answer',question:'Telefon',context:[{role:'system'}]}]){const s=setup();assert.equal((await s.request(body)).status,400);assert.equal(s.calls.some(c=>c.name==='model'||c.name==='reserve_team_assistant_request'),false);}
});
test('database quota blocks a model request and returns an explicit retry interval',async()=>{
 const s=setup({limited:true});const response=await s.request(),data=await response.json();assert.equal(response.status,429);assert.equal(data.code,'rate_limited');assert.equal(data.retryAfter,120);assert.equal(s.calls.some(c=>c.name==='model'),false);
});
test('malformed, truncated or uncited model responses are rejected without displaying raw provider content',async()=>{
 for(const modelBody of [completion({answer:'UNSUPPORTED',citations:[99],insufficient:false}),completion({answer:'UNSUPPORTED',citations:[],insufficient:false}),completion(undefined,'length'),{choices:[{finish_reason:'stop',message:{content:'private-provider-body'}}]}]){const s=setup({modelBody});const response=await s.request();assert.equal(response.status,502);assert.equal((await response.json()).code,'invalid_answer');}
 const s=setup({modelBody:completion({answer:'UNSUPPORTED',citations:[99],insufficient:true})});const data=await (await s.request()).json();assert.equal(data.generated,false);assert.equal(data.text.includes('UNSUPPORTED'),false);
});
test('provider failures return safe error codes and are never automatically retried',async()=>{
 for(const [options,code] of [[{modelStatus:429},'model_limited'],[{modelStatus:500},'model_unavailable'],[{fetchFailure:true},'request_not_confirmed']]){const s=setup(options);const response=await s.request();assert.equal(response.status,502);const data=await response.json();assert.equal(data.code,code);assert.equal(JSON.stringify(data).includes('private-provider'),false);assert.equal(s.calls.filter(c=>c.name==='model').length,1);}
});
test('changed source versions or permissions discard a generated answer after the model request',async()=>{
 for(const onModel of [s=>{s.published=null;},s=>{s.text='Changed text';},s=>{s.capabilities=[];},s=>{s.capabilities=['knowledge.read'];},s=>{s.pages=[];}]){const s=setup({onModel});const response=await s.request(),data=await response.json();assert.ok([403,409].includes(response.status));assert.equal(data.text,undefined);assert.equal(data.sources,undefined);assert.ok(['sources_changed','access_denied'].includes(data.code));}
});
