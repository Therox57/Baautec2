import test from 'node:test';
import assert from 'node:assert/strict';
import { events, writersPlan } from '../src/siteContent.js';
import { siteKnowledgeSections } from '../server/siteKnowledge.js';
import { writersDocumentKnowledge } from '../src/writersDocumentKnowledge.js';
import { TECGPT_KNOWLEDGE, TECGPT_SYSTEM_RULES } from '../src/tecgptKnowledge.js';

test('every public event and writer month is available to the bot from the same source', () => {
  const text = siteKnowledgeSections.map(section => section.text).join('\n');
  assert.equal(events.length, 19);
  for (const event of events) {
    assert.ok(text.includes(event.date + ' ('), event.id);
    assert.ok(text.includes(event.title), event.id);
  }
  for (const [month, activity] of writersPlan) {
    assert.ok(text.includes(month + ' — ' + activity), month);
  }
  assert.equal(events.find(event => event.id === 'r1')?.date, '2026-10-21');
  assert.ok(text.includes('Dəqiq saat, auditoriya və qeydiyyat linki verilməyib'));
});

test('the complete DOCX is source knowledge, including conditions and evaluation rather than only monthly headlines', () => {
  const text = writersDocumentKnowledge.map(section => section.title + '\n' + section.text).join('\n');
  assert.match(text, /1.KLUBUN ƏSAS MƏQSƏDİ/);
  assert.match(text, /8.YEKUN MÜDDƏA/);
  assert.match(text, /Tələbələrdən alınan rəy və təkliflər/);
  assert.match(text, /İyun 2027/);
  assert.match(text, /rəhbərliyin razılığı/);
  assert.match(TECGPT_KNOWLEDGE, /TEC SERTİFİKAT VƏ PORTFOLİO ŞƏRTLƏRİ/);
  assert.doesNotMatch(TECGPT_SYSTEM_RULES, /TEC SERTİFİKAT VƏ PORTFOLİO ŞƏRTLƏRİ/);
});
