/// <reference types="node" />

import { clientIp, enforceLimit, validateChatRequest, sendSecurityError } from "../server/security.js";

import { classifyTopic, TOPIC_MESSAGE } from "../server/topic.js";
import { answerTopic } from "../server/tecgpt.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  res.setHeader("X-Content-Type-Options", "nosniff");

  try {
    const messages = validateChatRequest(req);
    const topic = classifyTopic(messages);
    if (!topic) return res.status(200).json({ reply: TOPIC_MESSAGE, model: 'local', rejected: true });

    const geminiKey = process.env.GEMINI_API_KEY;

    if (
      !geminiKey ||
      !process.env.KV_REST_API_URL ||
      !process.env.KV_REST_API_TOKEN
    ) {
      return res.status(503).json({
        error: "Qonaq TECGPT konfiqurasiyası hazır deyil.",
      });
    }

    const ip = clientIp(req);
    await enforceLimit('guest-burst', ip);
    await enforceLimit('guest-hour', ip);

    return res.status(200).json(await answerTopic(topic));
  } catch (error) {
    if (sendSecurityError(error, res)) return;
    return res.status(500).json({
      error:
        "TECGPT serverində xəta baş verdi.",
    });
  }
}
