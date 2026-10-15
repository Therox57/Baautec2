import {randomBytes,createHash} from 'node:crypto';

// One GPU generation at a time. Polling never starts another generation.
export function createJobQueue(answer,{capacity=3,runMs=90000,leaseMs=45000,ttlMs=300000,quota=6,windowMs=60000,cacheMs=300000,cacheCapacity=64,now=Date.now,log=console.log}={}){
 const jobs=new Map(),keys=new Map(),answers=new Map(),waiting=[];let closed=false,active=null,windowStart=Date.now(),count=0;
 const publicCacheKey=messages=>messages.length===1&&messages[0].role==='user'?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Baku',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now()))+':'+digest(messages):null;
 const digest=messages=>createHash('sha256').update(JSON.stringify(messages)).digest('hex');
 function finish(job,state,reason){job.state=state;job.finished=Date.now();job.messages=null;log('[TECGPT queue]',{id:job.id.slice(0,8),state,reason,seconds:Math.round((Date.now()-job.created)/1000)});}
 function sweep(){
  const wallTime=Date.now();
  for(const [key,entry] of answers)if(entry.expires<=now())answers.delete(key);
  for(const job of jobs.values()){
   if(['queued','running'].includes(job.state)&&wallTime-job.lastPoll>leaseMs){job.controller.abort();finish(job,'failed','abandoned');}
   if(job.finished&&wallTime-job.finished>ttlMs){jobs.delete(job.id);if(keys.get(job.key)===job.id)keys.delete(job.key);}
  }
 }
 async function pump(){
  if(active||closed)return;
  let job;while((job=waiting.shift())&&job.state!=='queued'){}
  if(!job)return;
  active=job;job.state='running';log('[TECGPT queue]',{id:job.id.slice(0,8),state:'running'});
  const timer=setTimeout(()=>job.controller.abort(),runMs);
  try{
   const result=await answer(job.messages,{review:true,fastSingleTurn:true,signal:job.controller.signal});
   job.controller.signal.throwIfAborted();
   if(!result.guardAccepted)throw Error('guard-rejected');
   job.result={reply:result.reply,model:result.model,provider:'local-9b',scope:result.scope,kind:result.kind,guardAccepted:result.guardAccepted,rejected:['out_of_scope','private_data'].includes(result.scope),needsReview:result.kind==='unknown',reviewed:result.reviewed,seconds:result.seconds};
   // Reuse only independently reviewed public facts, never contextual turns,
   // refusals, uncertain results or advice. Retain hashes, not message bodies.
   const cacheKey=publicCacheKey(job.messages);
   if(cacheMs>0&&cacheKey&&result.scope==='baau_tec'&&result.kind==='fact'&&result.verified===true&&result.reviewed===true&&result.cacheable===true){
    answers.delete(cacheKey);answers.set(cacheKey,{expires:now()+cacheMs,result:{...job.result}});
    while(answers.size>cacheCapacity)answers.delete(answers.keys().next().value);
   }
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
   const cacheKey=publicCacheKey(messages),cached=cacheKey&&answers.get(cacheKey);
   if(cached&&cached.expires>now())return {status:200,body:{...cached.result,seconds:0}};
   if(cacheKey)answers.delete(cacheKey);
   if([...jobs.values()].filter(j=>['queued','running'].includes(j.state)).length>=capacity)return {status:429,body:{error:'Növbə doludur. Bir qədər sonra yenidən sına.',reason:'queue_full',retryAfter:15}};
   if(Date.now()-windowStart>=windowMs){windowStart=Date.now();count=0;}
   if(count>=quota)return {status:429,body:{error:'Yerli modelin sorğu limitinə çatılıb. Bir qədər sonra yenidən sına.',reason:'quota',retryAfter:Math.max(1,Math.ceil((windowMs-Date.now()+windowStart)/1000))}};
   count++;
   const job={id:randomBytes(32).toString('hex'),key,hash,messages,controller:new AbortController(),created:Date.now(),lastPoll:Date.now(),state:'queued'};
   jobs.set(job.id,job);keys.set(key,job.id);waiting.push(job);log('[TECGPT queue]',{id:job.id.slice(0,8),state:'queued',depth:waiting.length});void pump();return view(job);
  },
  close(){closed=true;answers.clear();waiting.length=0;clearInterval(cleaner);for(const job of jobs.values())job.controller.abort();},
 };
}
