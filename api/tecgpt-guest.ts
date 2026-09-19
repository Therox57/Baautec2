/// <reference types="node" />

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

function createGuestLimiter() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error("Guest Redis configuration is missing.");
  }

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(60, "1 h"),
    prefix: "tecgpt:guest:hourly",
  });
}


import {
  TECGPT_KNOWLEDGE,
  TECGPT_SYSTEM_RULES,
} from "../src/tecgptKnowledge.js";

const PRIMARY_MODEL = "gemini-3.8-flash";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function callGemini(
  model: string,
  geminiKey: string,
  payload: unknown
) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey,
      },
      body: JSON.stringify(payload),
    }
  );
}

function isRetryable(status: number) {
  return status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504;
}

async function runModel(
  model: string,
  geminiKey: string,
  payload: unknown,
  maxAttempts = 3
) {
  let lastResponse: Response | null = null;
  let lastData: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await callGemini(model, geminiKey, payload);
    const data = await response.json().catch(() => ({}));

    lastResponse = response;
    lastData = data;

    if (response.ok) {
      return {
        ok: true as const,
        response,
        data,
      };
    }

    if (!isRetryable(response.status)) {
      break;
    }

    if (attempt < maxAttempts - 1) {
      const baseDelay = 700 * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * 250);
      await sleep(baseDelay + jitter);
    }
  }

  return {
    ok: false as const,
    response: lastResponse,
    data: lastData,
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
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

    const forwarded =
      req.headers["x-vercel-forwarded-for"] ||
      req.headers["x-forwarded-for"];

    const ip = String(
      (Array.isArray(forwarded) ? forwarded[0] : forwarded) ||
      req.socket?.remoteAddress ||
      "unknown"
    ).split(",")[0].trim() || "unknown";

    try {
      const hourlyLimiter = createGuestLimiter();

      const dailyLimiter = new Ratelimit({
        redis: new Redis({
          url: process.env.KV_REST_API_URL,
          token: process.env.KV_REST_API_TOKEN,
        }),
        limiter: Ratelimit.slidingWindow(1000, "1 d"),
        prefix: "tecgpt:guest:daily-global",
      });

      const [hourly, daily] = await Promise.all([
        hourlyLimiter.limit(ip),
        dailyLimiter.limit("all-guests"),
      ]);

      if (!hourly.success || !daily.success) {
        return res.status(429).json({
          error: !hourly.success
            ? "Saatlıq 60 sorğu limitinə çatmısınız. Bir qədər sonra yenidən yoxlayın."
            : "TECGPT-nin ümumi gündəlik test limiti dolub. Daha sonra yenidən yoxlayın.",
        });
      }
    } catch (error) {
      console.error("Guest rate limit error:", error);

      return res.status(503).json({
        error: "TECGPT test limiti hazırda yoxlanıla bilmir.",
      });
    }

    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    let messages = Array.isArray(body?.messages)
      ? body.messages
          .filter(
            (m: any) =>
              (m?.role === "user" ||
                m?.role === "assistant") &&
              typeof m?.text === "string"
          )
          .slice(-12)
          .map((m: any) => ({
            role: m.role,
            text: m.text.trim().slice(0, 4000),
          }))
      : [];

    while (
      messages.length &&
      messages[0].role === "assistant"
    ) {
      messages.shift();
    }

    if (!messages.length) {
      return res.status(400).json({
        error: "Mesaj boşdur.",
      });
    }

    const totalLength = messages.reduce(
      (sum: number, m: any) =>
        sum + m.text.length,
      0
    );

    if (totalLength > 12000) {
      return res.status(400).json({
        error:
          "Söhbət həddən artıq uzundur. Yeni söhbət başladın.",
      });
    }

    const systemInstruction = `
${TECGPT_SYSTEM_RULES}

==============================
TECGPT TƏSDİQLƏNMİŞ BİLİK BAZASI
==============================

${TECGPT_KNOWLEDGE}

==============================
ƏLAVƏ QAYDA
==============================

Bu bilik bazasındakı məlumatları əsas götür.

Əgər istifadəçi BAAU və ya TEC barədə bilik bazasında olmayan
və dəqiqliyinə əmin olmadığın fakt soruşursa, məlumat uydurma.

Tədbir, elan, qəbul tarixi, rəhbərlik və digər dəyişə bilən
məlumatlarda cari məlumatın olmadığını açıq bildir.

Bugünkü tarix:
${new Date().toISOString().slice(0, 10)}
`;

    const contents = messages.map((m: any) => ({
      role:
        m.role === "assistant"
          ? "model"
          : "user",
      parts: [
        {
          text: m.text,
        },
      ],
    }));

    const payload = {
      system_instruction: {
        parts: [
          {
            text: systemInstruction,
          },
        ],
      },
      contents,
      generationConfig: {
        maxOutputTokens: 1200,
      },
    };

    let usedModel = PRIMARY_MODEL;

    let result = await runModel(
      PRIMARY_MODEL,
      geminiKey,
      payload,
      3
    );

    if (!result.ok) {
      console.warn(
        "Primary Gemini model failed:",
        PRIMARY_MODEL,
        result.response?.status,
        result.data?.error?.message || ""
      );

      usedModel = FALLBACK_MODEL;

      result = await runModel(
        FALLBACK_MODEL,
        geminiKey,
        payload,
        2
      );
    }

    if (!result.ok) {
      console.error(
        "Gemini API error:",
        result.response?.status,
        result.data?.error?.message || ""
      );

      return res.status(502).json({
        error:
          "TECGPT hazırda cavab yarada bilmədi. Bir neçə saniyə sonra yenidən yoxlayın.",
      });
    }

    const reply =
      result.data?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text || "")
        .join("")
        .trim() || "";

    if (!reply) {
      return res.status(502).json({
        error: "TECGPT boş cavab qaytardı.",
      });
    }

    return res.status(200).json({
      reply,
      model: usedModel,
    });
  } catch (error) {
    console.error(
      "TECGPT server error:",
      error instanceof Error
        ? error.message
        : error
    );

    return res.status(500).json({
      error:
        "TECGPT serverində xəta baş verdi.",
    });
  }
}
