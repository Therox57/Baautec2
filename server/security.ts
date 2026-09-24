import { isIP } from 'node:net';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

export class HttpError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number) { super(message); }
}
type RequestLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string };
};
export type ChatMessage = { role: 'user' | 'assistant'; text: string };

export function validateChatRequest(req: RequestLike): ChatMessage[] {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
  // Browser origin checks complement authentication and shared quotas.
  if (req.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403, 'Başqa saytdan göndərilən sorğu qəbul edilmir.');
  const contentType = req.headers['content-type'];
  if (typeof contentType !== 'string' || contentType.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new HttpError(415, 'Sorğu JSON formatında olmalıdır.');
  }
  const maxBytes = 64 * 1024;
  if (Number(req.headers['content-length']) > maxBytes) throw new HttpError(413, 'Sorğu həddən artıq böyükdür.');
  let body = req.body;
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  if (!raw) throw new HttpError(400, 'Mesaj boşdur.');
  if (Buffer.byteLength(raw, 'utf8') > maxBytes) throw new HttpError(413, 'Sorğu həddən artıq böyükdür.');
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch { throw new HttpError(400, 'JSON düzgün deyil.'); }
  }
  const input = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(input) || input.length < 1 || input.length > 12) throw new HttpError(400, 'Sorğuda 1–12 mesaj olmalıdır.');
  const messages: ChatMessage[] = input.map((message: unknown) => {
    const m = message as Partial<ChatMessage> | null;
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.text !== 'string' || !m.text.trim()) {
      throw new HttpError(400, 'Mesaj formatı düzgün deyil.');
    }
    if (m.text.length > 4000) throw new HttpError(413, 'Mesaj 4000 simvoldan uzun ola bilməz.');
    return { role: m.role, text: m.text.trim() };
  });
  if (messages.reduce((sum, m) => sum + m.text.length, 0) > 12000) throw new HttpError(413, 'Söhbət həddən artıq uzundur. Yeni söhbət başladın.');
  while (messages[0]?.role === 'assistant') messages.shift();
  if (!messages.length || messages.at(-1)?.role !== 'user') throw new HttpError(400, 'Son mesaj istifadəçidən olmalıdır.');
  return messages;
}

export function clientIp(req: RequestLike): string {
  // Trust only Vercel's overwritten header on Vercel, not arbitrary proxies.
  const forwarded = process.env.VERCEL === '1' ? req.headers['x-vercel-forwarded-for'] : undefined;
  const value = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress;
  return value && isIP(value) ? value : 'unknown';
}
type Bucket = 'guest-burst' | 'guest-hour' | 'guest-day' | 'auth-ip' | 'user-minute' | 'user-hour' | 'auth-day' | 'provider-day';
const configs: Record<Bucket, { limit: number; window: '1 m' | '1 h' | '1 d'; prefix: string }> = {
  'provider-day': { limit: 1000, window: '1 d', prefix: 'tecgpt:provider:daily-attempts' },
  'guest-burst': { limit: 10, window: '1 m', prefix: 'tecgpt:guest:minute' },
  'guest-hour': { limit: 60, window: '1 h', prefix: 'tecgpt:guest:hourly' },
  'guest-day': { limit: 1000, window: '1 d', prefix: 'tecgpt:guest:daily-global' },
  'auth-ip': { limit: 60, window: '1 m', prefix: 'tecgpt:auth:ip' },
  'user-minute': { limit: 20, window: '1 m', prefix: 'tecgpt:auth:user-minute' },
  'user-hour': { limit: 200, window: '1 h', prefix: 'tecgpt:auth:user-hour' },
  'auth-day': { limit: 2000, window: '1 d', prefix: 'tecgpt:auth:daily-global' },
};
export async function enforceLimit(bucket: Bucket, identifier: string): Promise<void> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new HttpError(503, 'TECGPT təhlükəsizlik xidməti hazır deyil.');
  const config = configs[bucket];
  try {
    const limiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(config.limit, config.window),
      prefix: config.prefix,
      timeout: 3000,
    });
    const result = await limiter.limit(identifier);
    // Upstash can return success:true on a timeout. Fail closed for paid calls.
    if (result.reason === 'timeout') throw new HttpError(503, 'TECGPT sorğu limiti hazırda yoxlanıla bilmir.');
    if (!result.success) throw new HttpError(429, 'Sorğu limitinə çatmısınız. Bir qədər sonra yenidən yoxlayın.',
      Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, 'TECGPT sorğu limiti hazırda yoxlanıla bilmir.');
  }
}
export function sendSecurityError(error: unknown, res: any): boolean {
  if (!(error instanceof HttpError)) return false;
  if (error.status === 405) res.setHeader('Allow', 'POST');
  if (error.retryAfter) res.setHeader('Retry-After', String(error.retryAfter));
  res.status(error.status).json({ error: error.message });
  return true;
}
