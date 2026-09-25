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

    const authHeader = String(
      req.headers.authorization || ""
    );

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "TECGPT girişi tələb olunur.",
      });
    }

    if (
      authHeader.length > 8192 ||
      !authHeader.slice(7).trim()
    ) {
      return res.status(401).json({
        error: "Sessiya etibarsızdır.",
      });
    }

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL;

    const supabaseKey =
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Server konfiqurasiyası tamamlanmayıb.",
      });
    }

    await enforceLimit(
      "auth-ip",
      clientIp(req)
    );

    const accessToken = authHeader.slice(7);

    const userResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        signal: AbortSignal.timeout(8000),
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

    if (
      typeof user?.id !== "string" ||
      !user.id
    ) {
      return res.status(401).json({
        error: "Sessiya etibarsızdır.",
      });
    }

    const roleResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(
        user.id
      )}&role=in.(admin,tester)&select=role&limit=1`,
      {
        signal: AbortSignal.timeout(8000),
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
      !roles.some(
        (entry: any) =>
          entry?.role === "admin" ||
          entry?.role === "tester"
      )
    ) {
      return res.status(403).json({
        error:
          "Bu funksiya yalnız TECGPT tester və administratorları üçündür.",
      });
    }

    await enforceLimit(
      "user-minute",
      user.id
    );

    await enforceLimit(
      "user-hour",
      user.id
    );

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
      "TECGPT local admin error:",
      error instanceof Error ? error.name : "UnknownError"
    );

    return res.status(500).json({
      error: "TECGPT serverində xəta baş verdi.",
    });
  }
}
