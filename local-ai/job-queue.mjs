import {randomBytes,createHash} from 'node:crypto';

// One GPU generation at a time. Polling never starts another generation.
export function createJobQueue(answer,{capacity=3,runMs=90000,leaseMs=45000,ttlMs=300000,quota=6,windowMs=60000,log=console.log}={}){
 const jobs=new Map(),keys=new Map(),waiting=[];let closed=false,active=null,windowStart=Date.now(),count=0;
 const digest=messages=>createHash('sha256').update(JSON.stringify(messages)).digest('hex');
 function finish(job,state,reason){job.state=state;job.finished=Date.now();job.messages=null;log('[TECGPT queue]',{id:job.id.slice(0,8),state,reason,seconds:Math.round((Date.now()-job.created)/1000)});}
 function sweep(){
  const now=Date.now();
  for(const job of jobs.values()){
   if(['queued','running'].includes(job.state)&&now-job.lastPoll>leaseMs){job.controller.abort();finish(job,'failed','abandoned');}
   if(job.finished&&now-job.finished>ttlMs){jobs.delete(job.id);if(keys.get(job.key)===job.id)keys.delete(job.key);}
  }
 }
 async function pump(){
  if(active||closed)return;
  let job;while((job=waiting.shift())&&job.state!=='queued'){}
  if(!job)return;
  active=job;job.state='running';log('[TECGPT queue]',{id:job.id.slice(0,8),state:'running'});
  const timer=setTimeout(()=>job.controller.abort(),runMs);
  try{
   const result=await answer(job.messages,{review:true,signal:job.controller.signal});
   job.controller.signal.throwIfAborted();
   if(!result.guardAccepted)throw Error('guard-rejected');
   job.result={reply:result.reply,model:result.model,provider:'local-9b',scope:result.scope,kind:result.kind,guardAccepted:result.guardAccepted,rejected:['out_of_scope','private_data'].includes(result.scope),needsReview:result.kind==='unknown',reviewed:result.reviewed,seconds:result.seconds};
   finish(job,'done');
  }catch(error){if(job.state!=='failed')finish(job,'failed',job.controller.signal.aborted?'deadline':error.name);}
  finally{clearTimeout(timer);active=null;void pump();}
 }
 function view(job){
  if(job.state==='done')return {status:200,body:job.result};
  if(job.state==='failed')return {status:503,body:{error:'Yerli model cavabı tamamlaya bilmədi. Mesajı yenidən sına.'}};
  return {status:202,body:{pending:true,jobId:job.id,state:job.state,position:job.state==='queued'?waiting.filter(j=>j.state==='queued').indexOf(job)+1:0,retryAfter:3}};
 }
 const cleaner=setInterval(()=>{sweep();void pump();},Math.min(1000,leaseMs));cleaner.unref();
 return {
  request(messages,{jobId,requestId}={}){
   sweep();const hash=digest(messages);
   if(jobId){const job=jobs.get(jobId);if(!job||job.hash!==hash)return {status:404,body:{error:'Sorğu tapılmadı. Mesajı yenidən sına.'}};job.lastPoll=Date.now();return view(job);}
   const key=requestId||randomBytes(32).toString('hex');const previous=jobs.get(keys.get(key));
   if(previous){if(previous.hash!==hash)return {status:409,body:{error:'Sorğu identifikatoru artıq istifadə olunub.'}};previous.lastPoll=Date.now();return view(previous);}
   if([...jobs.values()].filter(j=>['queued','running'].includes(j.state)).length>=capacity)return {status:429,body:{error:'Növbə doludur. Bir qədər sonra yenidən sına.',reason:'queue_full',retryAfter:15}};
   if(Date.now()-windowStart>=windowMs){windowStart=Date.now();count=0;}
   if(count>=quota)return {status:429,body:{error:'Yerli modelin sorğu limitinə çatılıb. Bir qədər sonra yenidən sına.',reason:'quota',retryAfter:Math.max(1,Math.ceil((windowMs-Date.now()+windowStart)/1000))}};
   count++;
   const job={id:randomBytes(32).toString('hex'),key,hash,messages,controller:new AbortController(),created:Date.now(),lastPoll:Date.now(),state:'queued'};
   jobs.set(job.id,job);keys.set(key,job.id);waiting.push(job);log('[TECGPT queue]',{id:job.id.slice(0,8),state:'queued',depth:waiting.length});void pump();return view(job);
  },
  close(){closed=true;waiting.length=0;clearInterval(cleaner);for(const job of jobs.values())job.controller.abort();},
 };
}
