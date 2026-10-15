import { siteKnowledgeSections } from './siteKnowledge.js';
import { TECGPT_KNOWLEDGE } from '../src/tecgptKnowledge.js';
import { normalize } from './topic.js';
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
const stopwords = new Set(['baau', 'tecgpt', 'haqqinda', 'mene', 'sence', 'nece', 'deye', 'qisa', 'danisma', 'resmi', 'bilersen', 'hazirki', 'hazirda', 'kimdi', 'kimdir', 'kimlerdir', 'nedir', 'oldugunu', 'sorusur', 'isteyir', 'barede']);
const tokens = (text) => [...new Set(normalize(text).match(/[a-z]{4,}|\d{1,4}/g) ?? [])]
    .filter(t => !stopwords.has(t) && !t.startsWith('universitet')).map(t => t.slice(0, 5));
export function getChatKnowledge(messages, { excludedTopics = [], compactCore = false } = {}) {
    const users = messages.filter(m => m.role === 'user').slice(-4).reverse();
    const excluded = new Set(excludedTopics);
    const policyTitles = new Set(['TECGPT', 'MƏXFİLİK VƏ TƏHLÜKƏSİZLİK', 'MƏLUMATIN AKTUALLIĞI', 'SON QAYDA']);
    const focusedText = normalize(users.slice(0, 2).map(message => message.text).join(' '));
    if (compactCore && !/qeydiyyat|qosul|uzv|ayril|yeniden/.test(focusedText))
        excluded.add('registration');
    if (compactCore && !/\btgt\b|gencler teskilati/.test(focusedText))
        excluded.add('tgt');
    const eligible = sections.filter(section => !policyTitles.has(section.title) &&
        !(excluded.has('registration') && section.title === 'BAAU TEC ÜZVLÜK QEYDİYYATI') &&
        !(excluded.has('tgt') && section.title === 'TƏLƏBƏ GƏNCLƏR TƏŞKİLATI — TGT'));
    const ranked = eligible.filter(s => !coreTitles.has(s.title)).map(section => {
        const title = normalize(section.title), body = normalize(section.text);
        const score = users.reduce((sum, message, i) => sum + tokens(message.text).reduce((n, token) => n + (title.includes(token) ? 6 : body.includes(token) ? 1 : 0), 0) * (i === 0 ? 4 : 1 / i), 0);
        const latest = normalize(users[0]?.text ?? '');
        // Keep similarly named university services from crowding out TEC contact facts.
        const tecAnchor = /\btec\b/.test(latest) && /^(tec\b|baau tec\b)/.test(title) ? 4 : 0;
        return { section, score: score > 0 ? score + tecAnchor : 0 };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    const selected = eligible.filter(s => coreTitles.has(s.title));
    let size = selected.reduce((n, s) => n + s.title.length + s.text.length + 4, 0);
    const maxSections = selected.length + 5;
    const maxChars = compactCore ? 4500 : 6500;
    for (const { section } of ranked) {
        if (selected.length >= maxSections)
            break;
        const length = section.title.length + section.text.length + 4;
        if (size + length > maxChars)
            continue;
        selected.push(section);
        size += length;
    }
    return selected.map(s => s.title + '\n' + s.text).join('\n\n');
}
