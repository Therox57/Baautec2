
import type { ChatMessage } from './security.js';

export const TOPIC_MESSAGE =
  'Mən BAAU və TEC haqqında məlumat vermək üçün yaradılmışam. 😊 Sualında BAAU və ya TEC-i qeyd edə bilərsən. Məsələn: "BAAU-da tələbə həyatı necədir?"';

// ==========================================
// MƏTNİN NORMALİZASİYASI
// ==========================================

export function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLocaleLowerCase('az')
    .replace(/[ə]/g, 'e')
    .replace(/[ı]/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u');
}

// ==========================================
// GEMINI İSTİFADƏ ETMƏYƏN YERLİ CAVABLAR
// ==========================================

export function getLocalReply(
  messages: ChatMessage[]
): string | null {
  const raw = messages.at(-1)?.text ?? '';

  if (
    raw.length > 100 ||
    /[\p{Cf}\p{Cc}]/u.test(raw)
  ) {
    return null;
  }

  const text = normalize(raw)
    .trim()
    .replace(/[!?.]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  // ========================================
  // DAVAM SUALI: KEÇİD İSTƏYİ
  // ========================================

  const asksForLink = [
    'bes linkini at',
    'bes linki at',
    'linkini at',
    'linki at',
    'link ver',
    'linkini ver',
    'linkini goster',
    'linki goster',
  ].includes(text);

  if (asksForLink) {
    const previousUserMessage = messages
      .slice(0, -1)
      .reverse()
      .find(message => message.role === 'user');

    const previousTopic = previousUserMessage
      ? classifyTopic([previousUserMessage])
      : null;

    const previousIds = previousTopic?.id.split('+') ?? [];

    if (previousIds.includes('membership')) {
      return (
        'Buyur! 😊 TEC üzvlük qeydiyyatı:\n' +
        'https://baautec.vercel.app'
      );
    }

    if (
      previousIds.includes('tec') ||
      previousIds.includes('clubs') ||
      previousIds.includes('events')
    ) {
      return (
        'Buyur! 😊 BAAU TEC Instagram:\n' +
        'https://www.instagram.com/baau__tec/'
      );
    }

    if (previousTopic) {
      return (
        'Buyur! 😊 BAAU rəsmi saytı:\n' +
        'https://baau.edu.az'
      );
    }

    // Sərbəst əvvəlki sual strict classifier-ə düşməyə bilər.
    // Belə halda cavabı Groq conversation context-ə burax.
    return null;
  }

  const greetings = [
    'salam',
    'salamlar',
    'salam tecgpt',
    'salam baau',
    'salam necesen',
  ];

  if (greetings.includes(text)) {
    return (
      'Salam! 👋 Mən TECGPT-yəm. ' +
      'Bakı Avrasiya Universiteti və ' +
      'Tələbə Elmi Cəmiyyəti haqqında ' +
      'suallarını cavablandıra bilərəm.'
    );
  }

  const identityQuestions = [
    'sen kimsen',
    'sen kimdir',
    'sen nesen',
    'tecgpt kimdir',
    'tecgpt nedir',
    'ozunu tanit',
  ];

  if (identityQuestions.includes(text)) {
    return (
      'Mən TECGPT, Bakı Avrasiya ' +
      'Universiteti Tələbə Elmi ' +
      'Cəmiyyəti üçün hazırlanmış rəqəmsal ' +
      'məlumat köməkçisiyəm. 😊 ' +
      'BAAU, TEC, tələbə həyatı, ' +
      'fakültələr və universitet ' +
      'haqqında məlumat verə bilərəm.'
    );
  }

  return null;
}

// ==========================================
// İCAZƏ VERİLƏN MÖVZULAR
// ==========================================

const topics = [
  [
    'membership',
    /^(uzv(luk|luyu|luyune|lukle)?|qeydiyyat(a|dan|i)?|qosulmaq|muraciet|join|membership|registration)$/,
    'TEC üzvlüyü və qeydiyyat qaydaları',
  ],

  [
    'clubs',
    /^(klub(lar|lari|larina|lariyla)?|clubs?|debat|oxucular|yazicilar)$/,
    'BAAU TEC klubları',
  ],

  [
    'student-life',
    /^(heyat(i|inda|indan)?|telebeheyati)$/,
    'BAAU-da tələbə həyatı, tələbə təşkilatları və tələbələrin iştirak edə biləcəyi fəaliyyətlər',
  ],

  [
    'housing',
    /^(yataqxana(si|sinda|sinin|ya)?|dormitory|accommodation)$/,
    'BAAU yataqxanası',
  ],

  [
    'study',
    /^(fakulte(ler|leri|si)?|ixtisas(lar|lari)?|tehsil|qebul|bakalavr(iat)?|magistr(atura)?|doktorantura|admission|faculties|programs)$/,
    'BAAU fakültələri, ixtisaslar və qəbul barədə ümumi məlumat',
  ],

  [
    'library',
    /^(kitabxana(si|sinda)?|library)$/,
    'BAAU kitabxanası',
  ],

  [
    'exchange',
    /^(erasmus|mubadile|orhun|movlana|exchange)$/,
    'BAAU tələbə mübadiləsi imkanları',
  ],

  [
    'career',
    /^(karyera|tecrube|cv|musahibe|career|internship)$/,
    'BAAU Karyera və Təcrübə Mərkəzinin tələbə dəstəyi',
  ],

  [
    'research',
    /^(elmi|tedqiqat|meqale|konfrans(lar|lari)?|seminar(lar|lari)?|research)$/,
    'BAAU TEC elmi fəaliyyətinə tələbələrin qoşulması',
  ],

  [
    'events',
    /^(tedbir(ler|leri)?|elan(lar|lari)?|events?)$/,
    'BAAU TEC tədbirləri və rəsmi elan mənbələri',
  ],

  [
    'leadership',
    /^(sedr(i|in)?|rehber(lik|liyi)?|rektor|chairman|president)$/,
    'BAAU TEC rəhbərliyi barədə təsdiqlənmiş məlumat',
  ],

  [
    'location',
    /^(unvan(i)?|harada(dir)?|hardadi(r)?|yerlesir|otaq|otaqda|mertebe|address|location|where)$/,
    'BAAU və TEC ünvanı və yerləşməsi',
  ],

  [
    'contact',
    /^(elaqe|sayt(i)?|instagram|sosial|media|contact|website)$/,
    'BAAU və TEC rəsmi əlaqə və sosial media mənbələri',
  ],
] as const;

// ==========================================
// NORMAL SÖHBƏT İFADƏLƏRİ
// ==========================================

const filler =
  /^(salam|salamlar|zehmet|olmasa|haqqinda|haqqindaki|barede|ile|ucun|ve|ne|nedir|nedi|nece|necedir|necedi|kim|kimdir|kimsen|hansi|var|varmi|olur|olar|ola|edir|edim|edek|olmaq|olum|isteyirem|melumat|ver|vere|bilersen|bilersiniz|bilerem|men|mene|sen|biz|telebe(ler|leri|si)?|universitet(i|inde|inin)?|baki|avrasiya|cemiyyeti|bu|gun|indi|hazirda|son|is|bes|orada|oradaki|hemin|danis|please|tell|me|about|what|is|the|how|can|i|a|of|at|in|student|students|university|baku|eurasian|society)$/;

// ==========================================
// MÖVZU TƏSNİFATI
// ==========================================

export type Topic = {
  id: string;
  question: string;
};

export function classifyTopic(
  messages: ChatMessage[]
): Topic | null {

  const raw = messages.at(-1)?.text ?? '';

  // Çox uzun və gizli simvollu mesajları rədd et.
  if (
    raw.length > 500 ||
    /[\p{Cf}\p{Cc}]/u.test(raw)
  ) {
    return null;
  }

  const text = normalize(raw);

  // Naməlum simvolları və rəqəmli tapşırıqları
  // avtomatik qəbul etmə.
  if (/[^a-z\s?!.,'’-]/u.test(text)) {
    return null;
  }

  const words = text
    .replace(/['’-]/g, ' ')
    .split(/[\s?!.,]+/)
    .filter(Boolean);

  let anchored = false;

  const found = new Set<number>();

  for (const word of words) {

    // BAAU / TEC açıq qeyd olunmalıdır.
    if (
      /^(baau|tec|tecgpt)(da|de|nin|in|e|a)?$/.test(
        word
      )
    ) {
      anchored = true;
      continue;
    }

    // Şəkilçilər.
    if (/^(da|de|nin|in|e|a)$/.test(word)) {
      continue;
    }

    const index = topics.findIndex(
      ([, pattern]) => pattern.test(word)
    );

    if (index >= 0) {
      found.add(index);
      continue;
    }

    // Tanınmayan ifadələri rədd et.
    if (!filler.test(word)) {
      return null;
    }
  }

  anchored ||=
    text.includes(
      'baki avrasiya universitet'
    ) ||
    text.includes(
      'baku eurasian university'
    ) ||
    text.includes(
      'telebe elmi cemiyyeti'
    );

  if (
    !anchored ||
    found.size > 3
  ) {
    return null;
  }

  if (!found.size) {
    return {
      id: /\btec\b/.test(text)
        ? 'tec'
        : 'baau',

      question: /\btec\b/.test(text)
        ? 'BAAU Tələbə Elmi Cəmiyyəti nədir?'
        : 'BAAU haqqında ümumi məlumat ver.',
    };
  }

  const selected = [...found]
    .sort((a, b) => a - b)
    .map((index) => topics[index]);

  return {
    id: selected
      .map(([id]) => id)
      .join('+'),

    question: selected
      .map(([, , question]) => question)
      .join('; '),
  };
}
