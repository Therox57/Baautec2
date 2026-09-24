
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

import { answerTopic } from "../server/tecgpt.js";

export default async function handler(req: any, res: any) {

  res.setHeader("Cache-Control", "no-store");

  res.setHeader(
    "X-Content-Type-Options",
    "nosniff"
  );

  try {

    // ==========================================
    // MESAJLARIN YOXLANMASI
    // ==========================================

    const messages = validateChatRequest(req);

    // ==========================================
    // YERLİ CAVABLAR
    // GEMINI API İSTİFADƏ OLUNMUR
    // ==========================================

    const localReply = getLocalReply(messages);

    if (localReply !== null) {
      return res.status(200).json({
        reply: localReply,
        model: "local",
      });
    }

    // ==========================================
    // BAAU / TEC MÖVZU FİLTRİ
    // ==========================================

    const topic = classifyTopic(messages);

    if (!topic) {
      return res.status(200).json({
        reply: TOPIC_MESSAGE,
        model: "local",
        rejected: true,
      });
    }

    // ==========================================
    // SERVER KONFİQURASİYASI
    // ==========================================

    const geminiKey =
      process.env.GEMINI_API_KEY;

    if (
      !geminiKey ||
      !process.env.KV_REST_API_URL ||
      !process.env.KV_REST_API_TOKEN
    ) {
      return res.status(503).json({
        error:
          "Qonaq TECGPT konfiqurasiyası hazır deyil.",
      });
    }

    // ==========================================
    // İSTİFADƏÇİNİN IP ÜNVANI
    // ==========================================

    const ip = clientIp(req);

    // ==========================================
    // REDIS SORĞU LİMİTLƏRİ
    // ==========================================

    await enforceLimit(
      "guest-burst",
      ip
    );

    await enforceLimit(
      "guest-hour",
      ip
    );

    // ==========================================
    // REDIS CACHE + GEMINI
    // ==========================================

    return res.status(200).json(
      await answerTopic(topic)
    );

  } catch (error) {

    // ==========================================
    // TƏHLÜKƏSİZLİK XƏTALARI
    // ==========================================

    if (sendSecurityError(error, res)) {
      return;
    }

    // ==========================================
    // ÜMUMİ SERVER XƏTASI
    // ==========================================

    return res.status(500).json({
      error:
        "TECGPT serverində xəta baş verdi.",
    });

  }
}
