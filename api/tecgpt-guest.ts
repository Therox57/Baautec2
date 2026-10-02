import {isLocalPreviewConfigured, answerWithLocalPreview, localJobId, localRequestKey} from '../server/localPreview.js';
/// <reference types="node" />

import {
  clientIp,
  guestBrowserId,
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

import { getApprovedAnswerContext, recordUnansweredQuestion } from "../server/unansweredQuestions.js";

import {
  answerConversationWithGroq,
  getNaturalFallbackForConversation,
  isGroqConfigured,
  getChatProvider,
  resolveGroqTopic,
} from "../server/groq.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  try {
    const messages = validateChatRequest(req);

    // Groq konfiqurasiya olunmayıbsa köhnə təhlükəsiz lokal
    // greeting/off-topic davranışını Redis olmadan da saxla.
    // Production-da GROQ_API_KEY olduqda bu blok işləmir və normal
    // söhbət aşağıda Groq-a gedir.
    if (!isGroqConfigured() && !isLocalPreviewConfigured()) {
      const localReply = getLocalReply(messages);

      if (localReply !== null) {
        return res.status(200).json({
          reply: localReply,
          model: "local",
          degraded: true,
        });
      }

      const localTopic = resolveGroqTopic(messages);

      if (!localTopic) {
        return res.status(200).json({
          reply: TOPIC_MESSAGE,
          model: "local",
          rejected: true,
          degraded: true,
        });
      }
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

    const jobId=isLocalPreviewConfigured()?localJobId(req):undefined;
    if(jobId)await enforceLimit('local-poll',ip);
    else {
    const browserId=guestBrowserId(req,res);
    await enforceLimit("guest-browser", browserId);
    await enforceLimit("guest-burst", ip);
    await enforceLimit("guest-hour", ip);
    }

    if (isLocalPreviewConfigured()) {
      if(!jobId)await enforceLimit('provider-minute', 'local-9b');
      const localAI = await answerWithLocalPreview(messages,fetch,jobId,jobId?undefined:localRequestKey(req,'guest:'+ip));
      if('pending' in localAI)return res.status(202).json(localAI);
      if (localAI.needsReview) {
        try { await recordUnansweredQuestion(messages.at(-1)!.text); }
        catch { console.warn('[TECGPT] Unanswered-question save unavailable'); }
      }
      return res.status(200).json(localAI);
    }

    // Normal söhbətdə ilk seçim Groq-dur. Model son mesajın
    // mənasını söhbət kontekstindən özü anlayır; phrase -> answer
    // cədvəli ilə idarə olunmur.
    if (isGroqConfigured()) {
      try {
        const provider = getChatProvider();
        await enforceLimit(provider === 'openrouter' ? 'paid-provider-minute' : 'provider-minute', provider);
        await enforceLimit("provider-day", provider);

        const latestQuestion = messages.at(-1)!.text;
        let approvedKnowledge = "";
        try { approvedKnowledge = await getApprovedAnswerContext(latestQuestion); }
        catch { console.warn("[TECGPT] Approved-answer lookup unavailable"); }
        const groq = await answerConversationWithGroq(messages, { approvedKnowledge });
        if (groq?.needsReview) {
          try { await recordUnansweredQuestion(latestQuestion); }
          catch { console.warn("[TECGPT] Unanswered-question save unavailable"); }
        }

        if (groq) {
          return res.status(200).json({
            reply: groq.reply,
            model: groq.model,
            provider,
            rejected: groq.rejected ?? false,
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
    if (fallback === LOCAL_UNKNOWN_REPLY) {
      try { await recordUnansweredQuestion(messages.at(-1)!.text); }
      catch { console.warn("[TECGPT] Unanswered-question save unavailable"); }
    }

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
