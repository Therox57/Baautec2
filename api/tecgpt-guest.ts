/// <reference types="node" />

import {
  clientIp,
  enforceLimit,
  validateChatRequest,
  sendSecurityError,
  HttpError,
} from "../server/security.js";

import {
  getLocalReply,
  TOPIC_MESSAGE,
} from "../server/topic.js";

import {
  LOCAL_UNKNOWN_REPLY,
} from "../server/localAnswers.js";

import {
  answerConversationWithGroq,
  getNaturalFallbackForConversation,
  isGroqConfigured,
  resolveGroqTopic,
} from "../server/groq.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  try {
    const messages = validateChatRequest(req);

    if (
      !process.env.KV_REST_API_URL ||
      !process.env.KV_REST_API_TOKEN
    ) {
      return res.status(503).json({
        error: "TECGPT təhlükəsizlik xidməti hazır deyil.",
      });
    }

    const ip = clientIp(req);

    await enforceLimit("guest-burst", ip);
    await enforceLimit("guest-hour", ip);

    // Normal söhbətdə ilk seçim Groq-dur. Model son mesajın
    // mənasını söhbət kontekstindən özü anlayır; phrase -> answer
    // cədvəli ilə idarə olunmur.
    if (isGroqConfigured()) {
      try {
        await enforceLimit("provider-minute", "groq");
        await enforceLimit("provider-day", "groq");

        const groq = await answerConversationWithGroq(
          messages
        );

        if (groq) {
          return res.status(200).json({
            reply: groq.reply,
            model: groq.model,
            provider: "groq",
          });
        }
      } catch (error) {
        if (
          !(
            error instanceof HttpError &&
            (error.status === 429 ||
              error.status === 503)
          )
        ) {
          throw error;
        }
      }
    }

    // Provider yoxdursa / limitə düşübsə lokal yol yalnız
    // fallback kimi işləyir.
    const localReply = getLocalReply(messages);

    if (localReply !== null) {
      return res.status(200).json({
        reply: localReply,
        model: "local",
        degraded: true,
      });
    }

    const topic = resolveGroqTopic(messages);

    if (!topic) {
      return res.status(200).json({
        reply: TOPIC_MESSAGE,
        model: "local",
        rejected: true,
        degraded: true,
      });
    }

    const fallback =
      getNaturalFallbackForConversation(
        messages,
        topic
      ) ?? LOCAL_UNKNOWN_REPLY;

    return res.status(200).json({
      reply: fallback,
      model: "local",
      degraded: true,
    });
  } catch (error) {
    if (sendSecurityError(error, res)) {
      return;
    }

    console.error(
      "TECGPT guest error:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return res.status(500).json({
      error: "TECGPT serverində xəta baş verdi.",
    });
  }
}
