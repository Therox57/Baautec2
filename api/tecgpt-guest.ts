/// <reference types="node" />

import {
  clientIp,
  enforceLimit,
  validateChatRequest,
  sendSecurityError,
} from "../server/security.js";

import {
  classifyTopic,
  getLocalReply,
  TOPIC_MESSAGE,
} from "../server/topic.js";

import {
  getLocalAnswer,
  LOCAL_UNKNOWN_REPLY,
} from "../server/localAnswers.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  try {
    const messages = validateChatRequest(req);

    const localReply = getLocalReply(messages);

    if (localReply !== null) {
      return res.status(200).json({
        reply: localReply,
        model: "local",
      });
    }

    const topic = classifyTopic(messages);

    if (!topic) {
      return res.status(200).json({
        reply: TOPIC_MESSAGE,
        model: "local",
        rejected: true,
      });
    }

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

    const answer = getLocalAnswer(topic);

    return res.status(200).json({
      reply: answer ?? LOCAL_UNKNOWN_REPLY,
      model: "local",
    });
  } catch (error) {
    if (sendSecurityError(error, res)) {
      return;
    }

    console.error(
      "TECGPT local guest error:",
      error instanceof Error ? error.name : "UnknownError"
    );

    return res.status(500).json({
      error: "TECGPT serverində xəta baş verdi.",
    });
  }
}
