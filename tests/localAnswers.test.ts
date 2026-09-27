import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyTopic,
  getLocalReply,
} from '../server/topic.js';

import { getLocalAnswer } from '../server/localAnswers.js';
import guest from '../api/tecgpt-guest.js';
import auth from '../api/tecgpt.js';

const classify = (text: string) =>
  classifyTopic([{ role: 'user', text }]);

test('TEC üzvlüyü üçün Gemini-siz cavab verir', () => {
  const topic = classify(
    'TEC üzvlüyünə necə müraciət edim?'
  );

  assert.ok(topic);

  const answer = getLocalAnswer(topic);

  assert.ok(answer);
  assert.ok(
    answer.includes('https://baautec.vercel.app')
  );
});

test('BAAU haqqında yerli cavab verir', () => {
  const topic = classify('BAAU nədir?');

  assert.ok(topic);

  const answer = getLocalAnswer(topic);

  assert.ok(answer);
  assert.ok(
    answer.includes('Bakı Avrasiya Universiteti')
  );
});

test('naməlum mövzuya cavab uydurmur', () => {
  const answer = getLocalAnswer({
    id: 'unknown-topic',
    question: 'Naməlum sual',
  });

  assert.equal(answer, null);
});

test('TEC-ə necə üzv olum sualını anlayır', () => {
  const topic = classify('TEC-ə necə üzv olum?');

  assert.equal(topic?.id, 'membership');

  const answer = getLocalAnswer(topic!);

  assert.ok(answer);
  assert.ok(
    answer.includes('https://baautec.vercel.app')
  );
});

test(
  'qonaq salamlaşmasına Gemini olmadan cavab verir',
  async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () => {
      throw new Error('NETWORK MUST NOT RUN');
    };

    try {
      let statusCode = 0;
      let response: any;

      const res = {
        setHeader() {},
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(value: unknown) {
          response = value;
          return this;
        },
      };

      await guest(
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: {
            messages: [
              {
                role: 'user',
                text: 'Salam',
              },
            ],
          },
        },
        res
      );

      assert.equal(statusCode, 200);
      assert.equal(response.model, 'local');
      assert.match(response.reply, /Salam/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
);

test('Bəs linkini at davam sualını anlayır', () => {
  const reply = getLocalReply([
    {
      role: 'user',
      text: 'TEC-ə necə üzv olum?',
    },
    {
      role: 'assistant',
      text: 'TEC üzvlüyü haqqında məlumat.',
    },
    {
      role: 'user',
      text: 'Bəs linkini at',
    },
  ]);

  assert.ok(reply);
  assert.ok(
    reply.includes('https://baautec.vercel.app')
  );
});

test('admin TECGPT girişsiz yerli cavab vermir', async () => {
  let statusCode = 0;
  let response: any;

  const res = {
    setHeader() {},
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(value: unknown) {
      response = value;
      return this;
    },
  };

  await auth(
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: {
        messages: [
          {
            role: 'user',
            text: 'Salam',
          },
        ],
      },
    },
    res
  );

  assert.equal(statusCode, 401);
  assert.equal(
    response.error,
    'TECGPT girişi tələb olunur.'
  );
});
