import test from 'node:test';
import assert from 'node:assert/strict';
import { answerAvailableChat } from '../server/chatAvailability.js';
import { HttpError } from '../server/security.js';

const messages = [{role: 'user' as const, text: 'BAAU dekanı kimdir?'}];

test('busy primary bucket uses a separate fallback model without losing conversation or approved facts', async () => {
  const attempts: string[] = [];
  const limits: string[] = [];
  const result = await answerAvailableChat(messages, {
    provider: 'groq', model: 'openai/gpt-oss-120b', approvedKnowledge: 'approved facts',
    limit: async (bucket, id) => {
      limits.push(bucket + ':' + id);
      if (bucket === 'provider-minute' && id.endsWith('120b')) throw new HttpError(429, 'busy', 45);
    },
    answer: async (received, options) => {
      assert.equal(received, messages);
      assert.equal(options?.approvedKnowledge, 'approved facts');
      attempts.push(options!.model!);
      return {reply: 'Dekan məlumatı', model: options!.model!};
    },
  });
  assert.deepEqual(attempts, ['openai/gpt-oss-20b']);
  assert.equal(result.provider, 'groq');
  assert.ok(limits.includes('provider-minute:groq:openai/gpt-oss-20b'));
  assert.equal(limits.filter(value => value.startsWith('provider-day')).length, 1);
});

test('provider failure tries the fallback once and accounts for both actual attempts', async () => {
  const attempts: string[] = [];
  let daily = 0;
  const result = await answerAvailableChat(messages, {
    provider: 'groq', model: 'openai/gpt-oss-120b',
    limit: async bucket => {if (bucket === 'provider-day') daily++;},
    answer: async (_, options) => {
      attempts.push(options!.model!);
      return attempts.length === 1 ? null : {reply: 'AI cavabı', model: options!.model!};
    },
  });
  assert.equal(result.model, 'openai/gpt-oss-20b');
  assert.equal(daily, 2);
  assert.equal(attempts.length, 2);
});

test('exhausted AI models return a retryable error, never a canned answer', async () => {
  let calls = 0;
  await assert.rejects(answerAvailableChat(messages, {
    provider: 'groq', model: 'openai/gpt-oss-120b',
    limit: async () => {},
    answer: async () => {calls++;return null;},
  }), error => error instanceof HttpError && error.status === 503 && !!error.retryAfter);
  assert.equal(calls, 2);
});

test('daily cap or quota-service failures cannot be bypassed by fallback', async () => {
  for (const status of [429, 503]) {
    let calls = 0;
    await assert.rejects(answerAvailableChat(messages, {
      provider: 'groq', model: 'openai/gpt-oss-120b',
      limit: async bucket => {if (bucket === 'provider-day') throw new HttpError(status, 'limit');},
      answer: async () => {calls++;return null;},
    }), error => error instanceof HttpError && error.status === status);
    assert.equal(calls, 0);
  }
});

test('OpenRouter failures do not silently switch paid provider or loop', async () => {
  let calls = 0;
  await assert.rejects(answerAvailableChat(messages, {
    provider: 'openrouter', model: 'openai/gpt-oss-120b',
    limit: async () => {}, answer: async () => {calls++;return null;},
  }), error => error instanceof HttpError && error.status === 503);
  assert.equal(calls, 1);
});
