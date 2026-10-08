import { siteKnowledgeSections } from './siteKnowledge.js';
import { TECGPT_KNOWLEDGE } from '../src/tecgptKnowledge.js';
import { normalize } from './topic.js';
import type { ChatMessage } from './security.js';

// Retrieve source sections, never generated answers. Keep headings so facts
// belonging to BAAU's other departments are not attributed to TEC.
const parts = TECGPT_KNOWLEDGE.split(/^={10,}\s*$/m).map(s => s.trim()).filter(Boolean);
const sections = Array.from({ length: Math.floor(parts.length / 2) }, (_, i) => ({
  title: parts[i * 2], text: parts[i * 2 + 1],
})).concat(siteKnowledgeSections);
const coreTitles = new Set([
  'BAKI AVRASİYA UNİVERSİTETİ — BAAU',
  'BAAU TƏLƏBƏ ELMİ CƏMİYYƏTİ — TEC',
  'TƏLƏBƏ GƏNCLƏR TƏŞKİLATI — TGT',
  'BAAU TEC ÜZVLÜK QEYDİYYATI',
]);
const stopwords = new Set(['baau', 'tecgpt', 'haqqinda', 'mene', 'sence', 'nece', 'deye', 'qisa', 'danisma', 'resmi', 'bilersen']);
const tokens = (text: string) => [...new Set(normalize(text).match(/[a-z]{4,}|\d{1,4}/g) ?? [])]
  .filter(t => !stopwords.has(t)).map(t => t.slice(0, 5));

export function getChatKnowledge(messages: ChatMessage[]): string {
  const users = messages.filter(m => m.role === 'user').slice(-4).reverse();
  const ranked = sections.filter(s => !coreTitles.has(s.title)).map(section => {
    const title = normalize(section.title), body = normalize(section.text);
    const score = users.reduce((sum, message, i) => sum + tokens(message.text).reduce(
      (n, token) => n + (title.includes(token) ? 6 : body.includes(token) ? 1 : 0), 0
    ) * (i === 0 ? 4 : 1 / i), 0);
    const latest = normalize(users[0]?.text ?? '');
    // Keep similarly named university services from crowding out TEC contact facts.
    const tecAnchor = /\btec\b/.test(latest) && /^(tec\b|baau tec\b)/.test(title) ? 4 : 0;
    return { section, score: score > 0 ? score + tecAnchor : 0 };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  const selected = sections.filter(s => coreTitles.has(s.title));
  let size = selected.reduce((n, s) => n + s.title.length + s.text.length + 4, 0);
  for (const { section } of ranked) {
    if (selected.length >= coreTitles.size + 5) break;
    const length = section.title.length + section.text.length + 4;
    if (size + length > 6500) continue;
    selected.push(section); size += length;
  }
  return selected.map(s => s.title + '\n' + s.text).join('\n\n');
}
