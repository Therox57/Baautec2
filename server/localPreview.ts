/// <reference types="node" />
import {createHash,randomUUID} from 'node:crypto';
import { HttpError, type ChatMessage } from './security.js';
export function isLocalPreviewConfigured(): boolean {
 return process.env.VERCEL_ENV === 'preview' && !!process.env.TECGPT_LOCAL_URL && !!process.env.TECGPT_LOCAL_BRIDGE_KEY;
}
export function localJobId(req: {body?: unknown}): string | undefined {
 let body=req.body;
 if(typeof body==='string')body=JSON.parse(body);
 const id=(body as {localJobId?: unknown} | null)?.localJobId;
 if(id===undefined)return undefined;
 if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw new HttpError(400,'Sorğu identifikatoru düzgün deyil.');
 return id;
}
export function localRequestKey(req: {headers: Record<string,unknown>}, owner: string): string {
 const id=req.headers['x-tecgpt-request-id'];
 if(id!==undefined&&(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id)))throw new HttpError(400,'Sorğu identifikatoru düzgün deyil.');
 return createHash('sha256').update(owner+'\n'+(id||randomUUID())).digest('hex');
}
type Pending = {pending:true;jobId:string;state:'queued'|'running';position:number;retryAfter:number};
type Answer = {reply:string;model:string;provider:string;rejected:boolean;needsReview:boolean};
export async function answerWithLocalPreview(messages: ChatMessage[], fetchImpl: typeof fetch = fetch, jobId?: string, requestId?: string): Promise<Pending|Answer> {
 const endpoint = process.env.TECGPT_LOCAL_URL;
 const secret = process.env.TECGPT_LOCAL_BRIDGE_KEY;
 if (!isLocalPreviewConfigured() || !endpoint || !secret) throw new HttpError(503, 'Yerli TECGPT bağlantısı hazır deyil.');
 const url = new URL(endpoint);
 if (url.protocol !== 'https:' || !url.hostname.endsWith('.trycloudflare.com') || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new HttpError(503, 'Yerli TECGPT bağlantısı düzgün qurulmayıb.');
 let response: Response;
 try { response = await fetchImpl(new URL('/api/chat', url), {method:'POST', redirect:'error', headers:{'Content-Type':'application/json',Authorization:'Bearer '+secret},signal:AbortSignal.timeout(15000),body:JSON.stringify({messages,...(jobId?{jobId}:{}),...(requestId?{requestId}:{})})}); }
 catch { throw new HttpError(503, 'Kompüterdəki TECGPT-yə çatmaq mümkün olmadı. Kompüter və preview bağlantısı açıq olmalıdır.'); }
 if (response.status === 429) {
  const data=await response.json().catch(()=>({})) as {reason?:string};
  throw new HttpError(429,data.reason==='quota'?'Yerli modelin sorğu limitinə çatılıb. Bir qədər sonra yenidən sına.':'Növbə doludur. Bir qədər sonra yenidən sına.',Math.min(60,Math.max(1,Number(response.headers.get('Retry-After'))||15)));
 }
 if(response.status===404)throw new HttpError(404,'Gözlənilən sorğu artıq mövcud deyil. Mesajı yenidən sına.');
 if (!response.ok) throw new HttpError(503, 'Yerli TECGPT cavabı tamamlaya bilmədi. Mesajı yenidən sına.');
 let result: Record<string,unknown>;
 try{result=await response.json()}catch{throw new HttpError(503,'Yerli TECGPT cavabı düzgün deyil.');}
 if(response.status===202){
  if(result.pending!==true||typeof result.jobId!=='string'||!/^[a-f0-9]{64}$/.test(result.jobId)||!['queued','running'].includes(String(result.state))||!Number.isInteger(result.position)||Number(result.position)<0||Number(result.position)>4)throw new HttpError(503,'Yerli TECGPT növbə cavabı düzgün deyil.');
  return {pending:true,jobId:result.jobId,state:result.state as Pending['state'],position:Number(result.position),retryAfter:3};
 }
 if(typeof result.reply!=='string'||!result.reply.trim()||result.reply.length>3200||result.model!=='qwen3.5:9b-best'||result.provider!=='local-9b'||typeof result.rejected!=='boolean'||typeof result.needsReview!=='boolean')throw new HttpError(503,'Yerli TECGPT cavabı düzgün deyil.');
 return {reply:result.reply,model:result.model,provider:'local-9b',rejected:result.rejected,needsReview:result.needsReview};
}
