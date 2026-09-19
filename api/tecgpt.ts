/// <reference types="node" />

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

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL;

    const supabaseKey =
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!geminiKey || !supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Server konfiqurasiyası tamamlanmayıb.",
      });
    }

    const authHeader = String(
      req.headers.authorization || ""
    );

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "TECGPT girişi tələb olunur.",
      });
    }

    const accessToken = authHeader.slice(7);

    const userResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!userResponse.ok) {
      return res.status(401).json({
        error: "Sessiya etibarsızdır.",
      });
    }

    const user = await userResponse.json();

    const roleResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(
        user.id
      )}&role=in.(admin,tester)&select=role&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const roles = await roleResponse
      .json()
      .catch(() => []);

    if (
      !roleResponse.ok ||
      !Array.isArray(roles) ||
      roles.length === 0
    ) {
      return res.status(403).json({
        error:
          "Bu funksiya yalnız TECGPT tester və administratorları üçündür.",
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
