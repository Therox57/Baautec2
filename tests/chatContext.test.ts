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


test('owner-provided university answers are retrieved for natural student questions', () => {
  const cases: [string, RegExp][] = [
    ['Dekanlar kimdir?', /Salman Süleymanov Səfəralı oğlu/],
    ['İqtisadiyyat fakültəsinin dekan müavini kimdir?', /Nigar Əliyeva/],
    ['Tərcümə kafedrasının müdiri kimdir?', /Nigar Əliyeva/],
    ['Dekanlığın iş saatları?', /08:00–12:00 və 14:00–18:00/],
    ['500 bal toplamışam güzəşt var?', /ixtisas seçiminin ilk mərhələsində/],
    ['Ərəb dili təqaüdü necə alınır?', /ən azı 91/],
    ['İmtahandan keçmək üçün neçə bal lazımdır?', /ən azı 17 bal/],
    ['Kitabxana haradadır?', /300-cü otaq/],
    ['Portal parolumu unutmuşam', /Qeydiyyat Ofisinə/],
    ['Psixoloji dəstək var?', /psixoloqa yönləndirilə/],
    ['Mübadilə üçün hara müraciət edim?', /layihələrin idarəedilməsi departamentinə/],
    ['TGT rəhbəri kimdir?', /Aysu Qədirova/],
  ];
  for (const [question, expected] of cases) {
    const value = context(question);
    assert.match(value, expected, question);
    assert.ok(value.length <= 6500, question);
  }
});

test('retrieved answers preserve missing details and dated financial conditions', () => {
  assert.match(context('Mütəllim müəllimin otaq nömrəsi nədir?'), /otaq nömrəsi verilməyib/);
  assert.match(context('Portal parolumu necə bərpa edim?'), /URL uydurma/);
  const discount = context('Təqaüd və güzəşt şərtləri nədir?');
  assert.match(discount, /2026\/2027/);
  assert.match(discount, /bütün təhsil illərinə və ya başqa qəbul ilinə şamil etmə/);
  const followup = getChatKnowledge([
    {role: 'user', text: 'Filologiya dekanı kimdir?'},
    {role: 'assistant', text: 'Uydurma rəhbər'},
    {role: 'user', text: 'İş saatları necədir?'},
  ]);
  assert.match(followup, /302-ci otaq/);
  assert.doesNotMatch(followup, /Uydurma rəhbər/);
});
