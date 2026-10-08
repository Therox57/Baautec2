import { answerConversationWithGroq, getChatProvider, type ChatProvider } from './groq.js';
import { enforceLimit, HttpError, type ChatMessage } from './security.js';

type Options = {
  approvedKnowledge?: string;
  provider?: ChatProvider;
  model?: string;
  limit?: typeof enforceLimit;
  answer?: typeof answerConversationWithGroq;
};

// Both chat endpoints share the same model buckets and daily spend cap.
// A busy primary model must not silently turn a conversation into a canned FAQ.
export async function answerAvailableChat(messages: ChatMessage[], options: Options = {}) {
  const provider = options.provider ?? getChatProvider();
  const primaryModel = options.model ??
    (provider === 'openrouter' ? process.env.OPENROUTER_MODEL : process.env.GROQ_MODEL) ?? 'openai/gpt-oss-120b';
  const models = provider === 'groq'
    ? [...new Set([primaryModel, 'openai/gpt-oss-20b'])]
    : [primaryModel];
  const limit = options.limit ?? enforceLimit;
  const answer = options.answer ?? answerConversationWithGroq;
  let retryAfter = 30;
  for (const model of models) {
    try {
      await limit(provider === 'openrouter' ? 'paid-provider-minute' : 'provider-minute', provider + ':' + model);
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 429) throw error;
      retryAfter = Math.max(retryAfter, error.retryAfter ?? 30);
      continue;
    }
    // Count every actual provider attempt; never bypass the daily cap on fallback.
    await limit('provider-day', provider);
    const result = await answer(messages, {provider, model, approvedKnowledge: options.approvedKnowledge});
    if (result) return {...result, provider};
  }
  throw new HttpError(503, 'TECGPT hazırda məşğuldur. Bir qədər sonra yenidən cəhd et.', retryAfter);
}
