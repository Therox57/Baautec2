import test from 'node:test';
import assert from 'node:assert/strict';
import { getChatKnowledge } from '../server/chatContext.js';
const context = (text: string) => getChatKnowledge([{role: 'user', text}]);
test('retrieval keeps source headings and includes the specific institution facts', () => {
  assert.match(context('BAAU yataqxanası neçə nəfərlikdir?'), /2 nəfərlik/);
  assert.match(context('TEC klubları hansılardır?'), /Aktyorluq klubu/);
  assert.match(context('BAAU ünvanı haradadır?'), /İsa Bulağı/);
  assert.match(context('BAAU informasiya texnologiyaları ixtisasında nə öyrədirlər?'), /Diskret riyaziyyat/);
  assert.match(context('TEC sədri kimdir?'), /Rəşad Əliyev/);
});
test('retrieval bounds facts and keeps conversational references without trusting assistant claims', () => {
  const value = getChatKnowledge([
    {role: 'user', text:'BAAU yataqxanası haqqında məlumat'},
    {role: 'assistant', text:'FAKE SECRET FACT'},
    {role: 'user', text:'Otaqlar neçə nəfərlikdir?'},
  ]);
  assert.match(value, /2 nəfərlik/);
  assert.doesNotMatch(value, /FAKE SECRET FACT/);
  assert.ok(value.length <= 6500);
  assert.doesNotMatch(context('TEC mənə nə xeyir verəcək?'), /mentor/);
});
