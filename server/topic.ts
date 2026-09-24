import type { ChatMessage } from './security.js';

export const TOPIC_MESSAGE = 'Yalnız BAAU, TEC və onlarla əlaqəli tələbə suallarına cavab verirəm. Sualı bir mövzu üzrə dəqiqləşdirin: məsələn, “TEC üzvlüyünə necə müraciət edim?” və ya “BAAU yataqxanası haqqında məlumat ver”.';
export function normalize(text: string): string {
  return text.normalize('NFKC').toLocaleLowerCase('az').replace(/[ə]/g, 'e').replace(/[ı]/g, 'i')
    .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ü/g, 'u');
}
// Finite vocabulary, never a keyword-only permission to send arbitrary prose.
const topics = [
  ['membership', /^(uzv(luk|luyu|luyune|lukle)?|qeydiyyat(a|dan|i)?|qosulmaq|muraciet|join|membership|registration)$/, 'TEC üzvlüyü və qeydiyyat qaydaları'],
  ['clubs', /^(klub(lar|lari|larina|lariyla)?|clubs?|debat|oxucular|yazicilar)$/, 'BAAU TEC klubları'],
  ['housing', /^(yataqxana(si|sinda|sinin|ya)?|dormitory|accommodation)$/, 'BAAU yataqxanası'],
  ['study', /^(fakulte(ler|leri|si)?|ixtisas(lar|lari)?|tehsil|qebul|bakalavr(iat)?|magistr(atura)?|doktorantura|admission|faculties|programs)$/, 'BAAU fakültələri, ixtisaslar və qəbul barədə ümumi məlumat'],
  ['library', /^(kitabxana(si|sinda)?|library)$/, 'BAAU kitabxanası'],
  ['exchange', /^(erasmus|mubadile|orhun|movlana|exchange)$/, 'BAAU tələbə mübadiləsi imkanları'],
  ['career', /^(karyera|tecrube|cv|musahibe|career|internship)$/, 'BAAU Karyera və Təcrübə Mərkəzinin tələbə dəstəyi'],
  ['research', /^(elmi|tedqiqat|meqale|konfrans(lar|lari)?|seminar(lar|lari)?|research)$/, 'BAAU TEC elmi fəaliyyətinə tələbələrin qoşulması'],
  ['events', /^(tedbir(ler|leri)?|elan(lar|lari)?|events?)$/, 'BAAU TEC tədbirləri və rəsmi elan mənbələri'],
  ['leadership', /^(sedr(i|in)?|rehber(lik|liyi)?|rektor|chairman|president)$/, 'BAAU TEC rəhbərliyi barədə təsdiqlənmiş məlumat'],
  ['location', /^(unvan(i)?|harada(dir)?|hardadi(r)?|yerlesir|otaq|otaqda|mertebe|address|location|where)$/, 'BAAU və TEC ünvanı və yerləşməsi'],
  ['contact', /^(elaqe|sayt(i)?|instagram|sosial|media|contact|website)$/, 'BAAU və TEC rəsmi əlaqə və sosial media mənbələri'],
] as const;
const filler = /^(salam|zehmet|olmasa|haqqinda|haqqindaki|barede|ile|ucun|ve|ne|nedir|nedi|nece|kim|kimdir|hansi|var|varmi|olur|olar|edir|edim|edek|olmaq|isteyirem|melumat|ver|vere|bilersen|bilersiniz|bilerem|men|mene|biz|telebe(ler|leri|si)?|heyati|universitet(i|inde|inin)?|baki|avrasiya|cemiyyeti|bu|gun|indi|hazirda|son|is|please|tell|me|about|what|is|the|how|can|i|a|of|at|in|student|students|university|baku|eurasian|society)$/;
export type Topic = { id: string; question: string };
export function classifyTopic(messages: ChatMessage[]): Topic | null {
  const raw = messages.at(-1)?.text ?? '';
  if (raw.length > 500 || /[\p{Cf}\p{Cc}]/u.test(raw)) return null;
  const text = normalize(raw);
  if (/[^a-z\s?!.,'’\-]/.test(text)) return null;
  const words = text.replace(/['’\-]/g, ' ').split(/[\s?!.,]+/).filter(Boolean);
  let anchored = false;
  const found = new Set<number>();
  for (const word of words) {
    if (/^(baau|tec|tecgpt)(da|de|nin|in|e|a)?$/.test(word)) { anchored = true; continue; }
    if (/^(da|de|nin|in|e|a)$/.test(word)) continue;
    const index = topics.findIndex(([, pattern]) => pattern.test(word));
    if (index >= 0) { found.add(index); continue; }
    if (!filler.test(word)) return null;
  }
  anchored ||= text.includes('baki avrasiya universitet') || text.includes('baku eurasian university') || text.includes('telebe elmi cemiyyeti');
  if (!anchored || found.size > 3) return null;
  if (!found.size) return { id: /\btec\b/.test(text) ? 'tec' : 'baau', question: /\btec\b/.test(text) ? 'BAAU Tələbə Elmi Cəmiyyəti nədir?' : 'BAAU haqqında ümumi məlumat ver.' };
  const selected = [...found].sort((a, b) => a - b).map(index => topics[index]);
  return { id: selected.map(([id]) => id).join('+'), question: selected.map(([, , question]) => question).join('; ') };
}
