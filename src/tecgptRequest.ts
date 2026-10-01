export type ClientMessage = {role:'user'|'assistant';text:string};
export type ChatResult = {reply:string;degraded?:boolean};
// All polls reuse the original message and job; no duplicate chat bubbles or GPU work.
export async function requestChat(endpoint:string,messages:ClientMessage[],headers:Record<string,string>={},onProgress:(text:string)=>void=()=>{},fetchImpl:typeof fetch=fetch,wait:(ms:number)=>Promise<void>=ms=>new Promise(resolve=>setTimeout(resolve,ms)),signal?:AbortSignal):Promise<ChatResult>{
 const requestId=crypto.randomUUID();let localJobId:string|undefined;const started=Date.now();let transient=0;
 while(Date.now()-started<300000){
  if(signal?.aborted)throw new DOMException('Sorğu ləğv edildi.','AbortError');
  let response:Response|undefined;
  let data:Record<string,unknown>;
  const controller=new AbortController();
  const cancel=()=>controller.abort();
  signal?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(cancel,20000);
  try{
   response=await fetchImpl(endpoint,{method:'POST',headers:{...headers,'Content-Type':'application/json','x-tecgpt-request-id':requestId},body:JSON.stringify({messages,...(localJobId?{localJobId}:{})}),signal:controller.signal});
   try{data=await response.json()}catch{throw new Error('Server cavabı oxuna bilmədi. Mesajı yenidən sına.');}
  }catch(error){
   if(signal?.aborted||response)throw error;
   if(++transient>2)throw new Error('Bağlantı kəsildi. Mesajı yenidən sına.');
   onProgress('Bağlantı yoxlanılır...');await wait(3000);continue;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
  if(!response)throw new Error('Bağlantı kəsildi.');
  if(response.status===202){
   if(data.pending!==true||typeof data.jobId!=='string'||!/^[a-f0-9]{64}$/.test(data.jobId)||!['queued','running'].includes(String(data.state)))throw new Error('Növbə cavabı düzgün deyil.');
   localJobId=data.jobId;transient=0;
   onProgress(data.state==='queued'?`Növbədəsən${Number.isInteger(data.position)?' · '+data.position+'-ci yer':''}. Mesajın avtomatik cavablandırılacaq.`:'Cavab hazırlanır...');
   await wait(3000);continue;
  }
  if(!response.ok)throw new Error(typeof data.error==='string'?data.error:'TECGPT cavab verə bilmədi.');
  if(typeof data.reply!=='string'||!data.reply.trim())throw new Error('TECGPT boş cavab qaytardı.');
  return {reply:data.reply.trim(),degraded:data.degraded===true};
 }
 throw new Error('Gözləmə vaxtı bitdi. Mesajı yenidən sına.');
}
