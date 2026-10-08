import { events, writersPlan, dateLabel } from '../src/siteContent.js';
import { writersDocumentKnowledge } from '../src/writersDocumentKnowledge.js';

const source = 'Mənbə: sayt sahibinin göndərdiyi 2026/2027 klub planları. Planlaşdırılmış tarixlərdir, keçirilmə zəmanəti deyil. Dəqiq saat, auditoriya və qeydiyyat linki verilməyib. Məkan Oxucular planında BAAU-dur. Tədbirlər: https://baautec.vercel.app/tedbirler';
export const siteKnowledgeSections = [
  ...['Oxucular Klubu', 'Debat Klubu'].map(club => ({
    title: club.toLocaleUpperCase('az') + ' — TƏDBİRLƏR VƏ 2026/2027 İLLİK PLAN',
    text: source + '\n' + events.filter(event => event.club === club).map(event =>
      event.date + ' (' + dateLabel(event.date) + ') — ' + event.title + ' — ' + event.format +
      (event.note ? ' — ' + event.note : '')
    ).join('\n') + (club === 'Oxucular Klubu'
      ? '\nMartin İden tədbirinin köhnə 9 oktyabr tarixi sayt sahibinin son göstərişi ilə 21 oktyabr 2026-ya dəyişdirilib. Son yenilənmiş tarix əsasdır.' : ''),
  })),
  {
    title: 'YAZIÇILAR KLUBU — TƏDBİRLƏR VƏ 2026/2027 AYLIQ PLAN',
    text: source + '\n' + writersPlan.map(([month, activity]) => month + ' — ' + activity).join('\n') +
      '\nDəqiq günlər akademik təqvim, rəhbərliyin razılığı və təşkilati imkanlara uyğun müəyyən ediləcək. Bunları dəqiq tarixli təsdiqlənmiş elan kimi təqdim etmə.',
  },
  ...writersDocumentKnowledge,
];
