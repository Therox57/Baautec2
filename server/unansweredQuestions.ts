import { Redis } from '@upstash/redis';

export type UnansweredStatus = 'pending' | 'approved' | 'dismissed';
export type UnansweredQuestion = {
  id: string;
  question: string;
  status: UnansweredStatus;
  answer?: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
};

const INDEX = 'tecgpt:unanswered:index';
const APPROVED = 'tecgpt:unanswered:approved';
const PREFIX = 'tecgpt:unanswered:item:';
const MAX_ITEMS = 500;
const TTL_SECONDS = 60 * 60 * 24 * 180;
const redis = () => {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Unanswered queue storage is not configured.');
  return new Redis({ url, token });
};
const itemKey = (id: string) => PREFIX + id;
const loadItems = (db: Redis, ids: string[]) => ids.length
  ? db.mget<(UnansweredQuestion | null)[]>(ids.map(itemKey))
  : Promise.resolve([] as (UnansweredQuestion | null)[]);
const normalizeQuestion = (value: string) => value.toLocaleLowerCase('az').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// Do not retain likely contact details or student identifiers in this queue.
export function isSafeQuestionForReview(question: string): boolean {
  return question.length > 0 && question.length <= 1000 &&
    !/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u.test(question) &&
    !/(?:\+?\d[\s().-]*){7,}/u.test(question);
}

export async function recordUnansweredQuestion(question: string): Promise<void> {
  const clean = question.trim();
  if (!isSafeQuestionForReview(clean)) return;
  const db = redis();
  const recentIds = await db.lrange<string>(INDEX, 0, 79);
  const recent = await loadItems(db, recentIds);
  const normalized = normalizeQuestion(clean);
  const duplicate = recent.find(item => item?.status === 'pending' && normalizeQuestion(item.question) === normalized);
  if (duplicate) {
    duplicate.updatedAt = new Date().toISOString();
    await db.set(itemKey(duplicate.id), duplicate, { ex: TTL_SECONDS });
    return;
  }
  const now = new Date().toISOString();
  const item: UnansweredQuestion = {
    id: crypto.randomUUID(), question: clean, status: 'pending', createdAt: now, updatedAt: now,
  };
  await db.set(itemKey(item.id), item, { ex: TTL_SECONDS });
  await db.lpush(INDEX, item.id);
  await db.ltrim(INDEX, 0, MAX_ITEMS - 1);
}

export async function listUnansweredQuestions(status: UnansweredStatus): Promise<UnansweredQuestion[]> {
  const db = redis();
  const ids = await db.lrange<string>(INDEX, 0, MAX_ITEMS - 1);
  const values = await loadItems(db, ids);
  return values.filter((item): item is UnansweredQuestion => !!item && item.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateUnansweredQuestion(
  id: string,
  patch: { status: UnansweredStatus; answer?: string; sourceUrl?: string },
): Promise<UnansweredQuestion | null> {
  const db = redis();
  const item = await db.get<UnansweredQuestion>(itemKey(id));
  if (!item) return null;
  item.status = patch.status;
  item.updatedAt = new Date().toISOString();
  if (patch.status === 'approved') {
    item.answer = patch.answer?.trim();
    item.sourceUrl = patch.sourceUrl?.trim();
    item.reviewedAt = item.updatedAt;
    await db.lrem(APPROVED, 0, id);
    await db.lpush(APPROVED, id);
    await db.ltrim(APPROVED, 0, MAX_ITEMS - 1);
  } else {
    delete item.answer;
    delete item.sourceUrl;
    delete item.reviewedAt;
    await db.lrem(APPROVED, 0, id);
  }
  await db.set(itemKey(id), item, { ex: TTL_SECONDS });
  return item;
}

export async function getApprovedAnswerContext(question: string): Promise<string> {
  const db = redis();
  const ids = await db.lrange<string>(APPROVED, 0, MAX_ITEMS - 1);
  const items = await loadItems(db, ids);
  const query = new Set(normalizeQuestion(question).split(' ').filter(word => word.length > 2));
  const ranked = items.filter((item): item is UnansweredQuestion =>
    !!item && item.status === 'approved' && !!item.answer && !!item.sourceUrl
  ).map(item => {
    const words = new Set(normalizeQuestion(item.question + ' ' + item.answer).split(' ').filter(word => word.length > 2));
    const score = [...query].reduce((sum, word) => sum + (words.has(word) ? 1 : 0), 0);
    return { item, score };
  }).filter(entry => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  return ranked.map(({ item }) => `Admin tərəfindən rəsmi mənbə ilə təsdiqlənmiş cavab.\nSual: ${item.question}\nCavab: ${item.answer}\nMənbə: ${item.sourceUrl}`).join('\n\n').slice(0, 2400);
}
