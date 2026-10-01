import { TECGPT_KNOWLEDGE } from '../src/tecgptKnowledge.js';
import { normalize } from './topic.js';
// Retrieve source sections, never generated answers. Keep headings so facts
// belonging to BAAU's other departments are not attributed to TEC.
const parts = TECGPT_KNOWLEDGE.split(/^={10,}\s*$/m).map(s => s.trim()).filter(Boolean);
const sections = Array.from({ length: Math.floor(parts.length / 2) }, (_, i) => ({
    title: parts[i * 2], text: parts[i * 2 + 1],
}));
const policyTitles=new Set(['TECGPT','MƏXFİLİK VƏ TƏHLÜKƏSİZLİK','MƏLUMATIN AKTUALLIĞI','SON QAYDA']);
const coreTitles = new Set([
    'BAKI AVRASİYA UNİVERSİTETİ — BAAU',
    'BAAU TƏLƏBƏ ELMİ CƏMİYYƏTİ — TEC',
    'TƏLƏBƏ GƏNCLƏR TƏŞKİLATI — TGT',
    'BAAU TEC ÜZVLÜK QEYDİYYATI',
]);
const stopwords = new Set(['baau', 'tecgpt', 'haqqinda', 'mene', 'sence', 'nece', 'deye', 'qisa', 'danisma', 'resmi', 'bilersen']);
const tokens = (text) => [...new Set(normalize(text).match(/[a-z]{4,}/g) ?? [])]
    .filter(t => !stopwords.has(t)).map(t => t.slice(0, 5));
export function getChatKnowledge(messages,{excludedTopics=[]}={}) {
    const users = messages.filter(m => m.role === 'user').slice(-4).reverse();
    const latest=normalize(users[0]?.text||'');
    const excludeRegistration=excludedTopics.includes('registration')||/qeydiyyat\w*.*(?:izah etme|istemi|deme|yazma|lazim deyil)|(?:izah etme|istemi|deme|yazma).*qeydiyyat/.test(latest);
    const registrationRelevant=!excludeRegistration&&users.some(m=>/qeydiyyat|nece qosul|nece uzv|link|muraciet/.test(normalize(m.text)));
    const eligible=sections.filter(s=>!policyTitles.has(s.title)&&(s.title!=='BAAU TEC ÜZVLÜK QEYDİYYATI'||registrationRelevant)&&!(excludedTopics.includes('tgt')&&s.title==='TƏLƏBƏ GƏNCLƏR TƏŞKİLATI — TGT'));
    const ranked = eligible.filter(s => !coreTitles.has(s.title)).map(section => {
        const title = normalize(section.title), body = normalize(section.text);
        const score = users.reduce((sum, message, i) => sum + tokens(message.text).reduce((n, token) => n + (title.includes(token) ? 6 : body.includes(token) ? 1 : 0), 0) * (i === 0 ? 4 : 1 / i), 0);
        return { section, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    const selected = eligible.filter(s => coreTitles.has(s.title));
    let size = selected.reduce((n, s) => n + s.title.length + s.text.length + 4, 0);
    for (const { section } of ranked) {
        if (selected.length >= coreTitles.size + 3)
            break;
        const length = section.title.length + section.text.length + 4;
        if (size + length > 6500)
            continue;
        selected.push(section);
        size += length;
    }
    const excludedUrls=excludedTopics.includes('registration')?(sections.find(s=>s.title==='BAAU TEC ÜZVLÜK QEYDİYYATI')?.text.match(/https?:\/\/[^\s]+/g)??[]):[];
    return selected.map(s=>s.title+'\n'+s.text.split(/\n\n+/).filter(paragraph=>!excludedUrls.some(url=>paragraph.includes(url))).join('\n\n')).join('\n\n');
}
