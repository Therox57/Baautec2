/// <reference types="node" />
import { HttpError, type ChatMessage } from './security.js';
export function isLocalPreviewConfigured(): boolean {
 return process.env.VERCEL_ENV === 'preview' && !!process.env.TECGPT_LOCAL_URL && !!process.env.TECGPT_LOCAL_SECRET;
}
export async function answerWithLocalPreview(messages: ChatMessage[], fetchImpl: typeof fetch = fetch) {
 const endpoint = process.env.TECGPT_LOCAL_URL;
 const secret = process.env.TECGPT_LOCAL_SECRET;
 if (!isLocalPreviewConfigured() || !endpoint || !secret) throw new HttpError(503, 'Yerli TECGPT bağlantısı hazır deyil.');
 const url = new URL(endpoint);
 if (url.protocol !== 'https:' || !url.hostname.endsWith('.trycloudflare.com') || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new HttpError(503, 'Yerli TECGPT bağlantısı düzgün qurulmayıb.');
 let response: Response;
 try { response = await fetchImpl(new URL('/api/chat', url), {method:'POST', redirect:'error', headers:{'Content-Type':'application/json',Authorization:'Bearer '+secret},signal:AbortSignal.timeout(105000),body:JSON.stringify({messages})}); }
 catch { throw new HttpError(503, 'Kompüterdəki TECGPT-yə çatmaq mümkün olmadı. Kompüter və preview bağlantısı açıq olmalıdır.'); }
 if (response.status === 429) throw new HttpError(429, 'Yerli model hazırda məşğuldur. Bir az sonra yenidən yoxla.', 15);
 if (!response.ok) throw new HttpError(503, 'Yerli TECGPT cavab verə bilmədi.');
 const result = await response.json() as Record<string, unknown>;
 if(typeof result.reply!=='string'||!result.reply.trim()||result.reply.length>3200||result.model!=='qwen3.5:9b-best'||result.provider!=='local-9b'||typeof result.rejected!=='boolean'||typeof result.needsReview!=='boolean')throw new HttpError(503,'Yerli TECGPT cavabı düzgün deyil.');
 return {reply:result.reply,model:result.model,provider:'local-9b',rejected:result.rejected,needsReview:result.needsReview};
}
