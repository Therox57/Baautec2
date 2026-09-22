import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpError, clientIp, validateChatRequest } from '../server/security.js';
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
