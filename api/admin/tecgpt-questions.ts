import {sessionAuthorization,assertSameOrigin,jsonBody} from '../../server/portalSecurity.js';
import {enforceLimit,clientIp,sendSecurityError} from '../../server/security.js';
import type { UnansweredStatus } from '../../server/unansweredQuestions.js';
import { listUnansweredQuestions, updateUnansweredQuestion } from '../../server/unansweredQuestions.js';

const allowedHosts = new Set(['baau.edu.az', 'www.baau.edu.az', 'instagram.com', 'www.instagram.com']);

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    if(req.method==='PATCH')assertSameOrigin(req);
    const auth = await sessionAuthorization(req);
    if (!auth.startsWith('Bearer ') || auth.length > 8192) return res.status(401).json({ error: 'Admin girişi tələb olunur.' });
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Server konfiqurasiyası tamamlanmayıb.' });
    const headers = { apikey: supabaseKey, Authorization: auth };
    const userResponse = await fetch(supabaseUrl + '/auth/v1/user', { signal: AbortSignal.timeout(8000), headers });
    if (!userResponse.ok) return res.status(401).json({ error: 'Sessiya etibarsızdır.' });
    const user = await userResponse.json() as { id?: string };
    if (!user.id) return res.status(401).json({ error: 'Sessiya etibarsızdır.' });
    const roleResponse = await fetch(supabaseUrl + '/rest/v1/user_roles?user_id=eq.' + encodeURIComponent(user.id) + '&role=eq.admin&select=role&limit=1', { signal: AbortSignal.timeout(8000), headers });
    const roles = await roleResponse.json().catch(() => []);
    if (!roleResponse.ok || !Array.isArray(roles) || !roles.some((role: any) => role?.role === 'admin')) {
      return res.status(403).json({ error: 'Bu bölmə yalnız administratorlar üçündür.' });
    }
    await enforceLimit('portal-user',user.id);
    if (req.method === 'GET') {
      const status = String(req.query?.status || 'pending') as UnansweredStatus;
      if (!['pending', 'approved', 'dismissed'].includes(status)) return res.status(400).json({ error: 'Status yanlışdır.' });
      return res.status(200).json({ questions: await listUnansweredQuestions(status) });
    }
    let body: any;
    try { body = jsonBody(req,8192); }
    catch { return res.status(400).json({ error: 'Sorğu məlumatları düzgün deyil.' }); }
    if (!body || typeof body.id !== 'string' || body.id.length > 80 || !['approved', 'dismissed'].includes(body.status)) {
      return res.status(400).json({ error: 'Sorğu məlumatları yanlışdır.' });
    }
    let patch: { status: UnansweredStatus; answer?: string; sourceUrl?: string };
    if (body.status === 'approved') {
      if (typeof body.answer !== 'string' || !body.answer.trim() || body.answer.length > 2000 || typeof body.sourceUrl !== 'string' || body.sourceUrl.length > 500) {
        return res.status(400).json({ error: 'Təsdiq üçün cavab və rəsmi mənbə tələb olunur.' });
      }
      let source: URL;
      try { source = new URL(body.sourceUrl); } catch { return res.status(400).json({ error: 'Mənbə linki düzgün deyil.' }); }
      if (source.protocol !== 'https:' || !allowedHosts.has(source.hostname) || source.username || source.password || ((source.hostname === 'instagram.com' || source.hostname === 'www.instagram.com') && !/^\/baau__tec(?:\/|$)/.test(source.pathname))) {
        return res.status(400).json({ error: 'Yalnız BAAU və TEC-in rəsmi HTTPS səhifələri qəbul edilir.' });
      }
      patch = { status: 'approved', answer: body.answer.trim(), sourceUrl: source.href };
    } else patch = { status: 'dismissed' };
    const item = await updateUnansweredQuestion(body.id, patch);
    return item ? res.status(200).json({ question: item }) : res.status(404).json({ error: 'Sual tapılmadı.' });
  } catch (error) {
    if(sendSecurityError(error,res))return;
    console.error('[TECGPT admin questions]', error instanceof Error ? error.name : 'UnknownError');
    return res.status(500).json({ error: 'Cavabsız suallar hazırda yüklənə bilmir.' });
  }
}
