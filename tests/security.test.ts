import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpError, clientIp, guestBrowserId, guestDailyWindow, consumeGuestDailyQuota, validateChatRequest } from '../server/security.js';
import { csvCell } from '../src/csv.js';

function request(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: { messages: [{ role: 'user', text: ' Salam ' }] },
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  };
}

test('valid chat payload is normalized', () => {
  assert.deepEqual(validateChatRequest(request()), [{ role: 'user', text: 'Salam' }]);
});

test('chat endpoint rejects unsafe request shapes', () => {
  const cases = [
    [request({ method: 'GET' }), 405],
    [request({ headers: { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' } }), 403],
    [request({ headers: { 'content-type': 'text/plain' } }), 415],
    [request({ body: { messages: [] } }), 400],
    [request({ body: { messages: [{ role: 'assistant', text: 'x' }] } }), 400],
    [request({ body: { messages: [{ role: 'user', text: 'x'.repeat(4001) }] } }), 413],
  ] as const;

  for (const [input, expectedStatus] of cases) {
    assert.throws(
      () => validateChatRequest(input),
      (error: unknown) => error instanceof HttpError && error.status === expectedStatus,
    );
  }
});

test('client IP trusts the Vercel-owned header only on Vercel', () => {
  const previous = process.env.VERCEL;
  try {
    delete process.env.VERCEL;
    assert.equal(clientIp(request({
      headers: {
        'content-type': 'application/json',
        'x-vercel-forwarded-for': '203.0.113.10',
      },
    })), '127.0.0.1');

    process.env.VERCEL = '1';
    assert.equal(clientIp(request({
      headers: {
        'content-type': 'application/json',
        'x-vercel-forwarded-for': '203.0.113.10',
      },
    })), '203.0.113.10');
  } finally {
    if (previous === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previous;
  }
});

test('CSV cells cannot execute spreadsheet formulas', () => {
  for (const value of ['=1+1', '+cmd', '-2+3', '@SUM(A1:A2)', '\t=1']) {
    assert.match(csvCell(value), /^"'|^"'/);
  }
  assert.equal(csvCell('normal'), '"normal"');
  assert.equal(csvCell('a"b'), '"a""b"');
});

 test('guest quotas separate browsers sharing an IP and reject forged or duplicate cookies',()=>{
  let header='';const res={setHeader: (_k:string,value:string)=>{header=value;}};
  const first=guestBrowserId(request(),res,'test-signing-key');const firstCookie=header.split(';')[0];
  assert.match(header,/HttpOnly; Secure; SameSite=Strict/);
  assert.equal(guestBrowserId(request({headers:{cookie:firstCookie}}),res,'test-signing-key'),first);
  const second=guestBrowserId(request(),res,'test-signing-key');assert.notEqual(second,first);
  assert.notEqual(guestBrowserId(request({headers:{cookie:firstCookie.slice(0,-1)+'z'}}),res,'test-signing-key'),first);
  assert.notEqual(guestBrowserId(request({headers:{cookie:firstCookie+'; '+firstCookie}}),res,'test-signing-key'),first);
 });


test('guest day resets at Baku midnight, not UTC midnight', () => {
  const before = Date.parse('2026-10-02T19:59:59Z');
  assert.deepEqual(guestDailyWindow(before), {day:'2026-10-02',reset:Date.parse('2026-10-02T20:00:00Z')});
  assert.deepEqual(guestDailyWindow(before+1000), {day:'2026-10-03',reset:Date.parse('2026-10-03T20:00:00Z')});
  assert.equal(guestDailyWindow(Date.parse('2026-10-02T00:00:00Z')).day,'2026-10-02');
});

test('guest daily quota blocks request 31, preserves the browser across chats and renews next day', async () => {
  const counters = new Map<string,number>();
  const evaluate = async (_script:string, keys:string[], args:number[]) => {
    const count = counters.get(keys[0]) ?? 0;
    if(count >= args[0]) return 0;
    counters.set(keys[0], count+1);
    return 1;
  };
  const now=Date.parse('2026-10-02T19:59:50Z');
  for(let i=0;i<30;i++)await consumeGuestDailyQuota('browser-a',evaluate,now);
  await assert.rejects(()=>consumeGuestDailyQuota('browser-a',evaluate,now), (error:unknown)=>{
    assert.ok(error instanceof HttpError);
    assert.equal(error.status,429);
    assert.equal(error.retryAfter,10);
    assert.match(error.message,/Gündəlik 30 sual/);
    assert.match(error.message,/00:00/);
    return true;
  });
  await consumeGuestDailyQuota('browser-b',evaluate,now);
  await consumeGuestDailyQuota('browser-a',evaluate,now+10000);
  await assert.rejects(()=>consumeGuestDailyQuota('browser-a',async()=>undefined,now), (error:unknown)=>error instanceof HttpError&&error.status===503);
});
