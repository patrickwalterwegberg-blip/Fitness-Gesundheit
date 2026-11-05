import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateVideo,videoMime,recorderMime,uploadCourseVideo,maxVideoBytes} from '../src/course-video-model.js';
import {answerComplete,courseQuizPayload,learnerAnswers} from '../src/learning-quiz.js';
test('video validation accepts supported formats, rejects empty/oversize/mismatched files',()=>{
 for(const [name,type] of [['video.mp4','video/mp4'],['video.webm','video/webm'],['video.mov','video/quicktime']]){const f=new File(['video'],name,{type});assert.equal(videoMime(f),type);validateVideo(f);}
 for(const f of [{name:'video.mp4',type:'video/mp4',size:0},{name:'video.mp4',type:'video/mp4',size:maxVideoBytes+1},{name:'video.mp4',type:'text/html',size:4},{name:'video.html',type:'video/mp4',size:4}])assert.throws(()=>validateVideo(f));
 assert.equal(recorderMime({isTypeSupported:t=>t==='video/webm'}),'video/webm');
});
test('typed exam payload separates author solutions from public question metadata',()=>{
 const qs=[{type:'single',prompt:'A',options:['a','b'],answer:1},{type:'multiple',prompt:'B',options:['x','y','z'],correctChoices:[2,0]},{type:'text',prompt:'C',correctText:'Patrick Walter'}];const p=courseQuizPayload(qs,true);assert.deepEqual(p.answers,[1,[0,2],'Patrick Walter']);assert.ok(!JSON.stringify(p.questions).includes('Patrick Walter'));assert.deepEqual(learnerAnswers(p.questions,{0:'1',1:[2,0],2:' Patrick Walter '}),[1,[0,2],'Patrick Walter']);assert.equal(answerComplete(qs[1],[]),false);assert.equal(answerComplete(qs[2],'   '),false);assert.equal(answerComplete(qs[0],0),true);
});
test('resumable uploads use a private bucket, fixed chunks, current session and an individual retry fingerprint',async()=>{
 let options,resumed=false;class FakeUpload{constructor(file,o){options=o;}async findPreviousUploads(){return[{url:'https://upload.invalid/1'}];}resumeFromPreviousUpload(){resumed=true;}start(){options.onProgress(2,4);options.onSuccess();}}
 const client={supabaseUrl:'https://project.invalid',supabaseKey:'public-test-key',auth:{getSession:async()=>({data:{session:{access_token:'simulated-session',user:{id:'actor'}}}})}};let progress;
 await uploadCourseVideo(client,new File(['test'],'v.mp4',{type:'video/mp4'}),{id:'video-id',object_path:'actor/video-id/original.mp4',mime_type:'video/mp4'},{UploadClass:FakeUpload,onProgress:p=>progress=p});
 assert.equal(options.metadata.bucketName,'course-videos');assert.equal(options.chunkSize,6*1024*1024);assert.equal(options.headers['x-upsert'],'false');assert.equal(progress,50);assert.equal(resumed,true);assert.ok((await options.fingerprint()).includes('actor:video-id'));let header;await options.onBeforeRequest({setHeader:(_,value)=>header=value});assert.equal(header,'Bearer simulated-session');
});
test('upload interruption aborts the current transfer and rejects without reporting success',async()=>{
 let current,started;const ready=new Promise(r=>started=r);class FakeUpload{constructor(file,o){current=this;}async findPreviousUploads(){return[];}start(){started();}async abort(){this.aborted=true;}}
 const c=new AbortController(),client={supabaseUrl:'https://project.invalid',supabaseKey:'public',auth:{getSession:async()=>({data:{session:{access_token:'simulated',user:{id:'u'}}}})}};
 const upload=uploadCourseVideo(client,new File(['test'],'v.mp4',{type:'video/mp4'}),{id:'v',object_path:'u/v/original.mp4',mime_type:'video/mp4'},{UploadClass:FakeUpload,signal:c.signal});await ready;c.abort();await assert.rejects(upload,e=>e.name==='AbortError');assert.equal(current.aborted,true);
});
