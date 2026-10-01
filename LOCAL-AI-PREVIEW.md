# Local 9B preview

This branch can route TECGPT chat requests to the owner's local Qwen3.5 9B model. It is enabled only when VERCEL_ENV is preview and both TECGPT_LOCAL_URL and TECGPT_LOCAL_BRIDGE_KEY are configured. Set these variables only for the tecgpt-local-9b-preview branch. Production continues using its existing provider.

The local bridge accepts only authenticated POST /api/chat requests, validates message sizes, allows one active generation, and caps accepted requests per minute. Ollama, filesystem access, and the local setup page are not exposed through the tunnel. The bridge secret remains in a server-side environment variable and is never returned to the browser.

The Windows runtime is C:/Users/user/tecgpt-local-runtime. Start preview-bridge.mjs with Node and a Cloudflare Quick Tunnel to localhost:4178. Keep the computer running. Quick Tunnel URLs change after restart; update the preview-only URL and redeploy if that happens. Secret setup is available locally on localhost:4178/setup and cannot be served through Cloudflare. Models and credentials are not committed.

Local replies use verified BAAU/TEC source text, a draft and editorial review, plus conservative Azerbaijani corrections. Unknown facts and off-topic requests keep the requested standard replies. These safeguards reduce mistakes; they do not guarantee perfect language or factual accuracy.

Checks: npm run test:security and npm run build. Targeted language/meaning checks and actual model responses are saved in the local runtime folder.

The tested local AI source snapshot is versioned in local-ai/. It requires the existing Ollama qwen3.5:9b-best import; weights and Cloudflare executables remain local. Runtime source improvements include context-sensitive source selection, editorial review, and conservative language and response-length checks.

Owner-maintained persona.mjs records TEC's general social activity (owner confirmed 2026-10-01), separately from visitor claims. Joining/comparison advice presents TEC positively without inventing events or disparaging TGT. Identity questions use configured assistant metadata. Unknown institutional facts retain the source fallback.

## General understanding checks

The local path has no greeting/identity phrase-to-answer routing, student-life canned fallback, or fast fragment bank. Both local modes generate text with Qwen3.5 9B. A separate model call interprets intent and missing context before source retrieval; final replies are checked for constraints, grounding and language, with one bounded repair attempt when required. Quality checks are performed by the same model and can make mistakes. Unknown-fact and off-topic messages are deliberately fixed product policies, not a general answer bank.

Run deterministic response-contract checks with node --test local-ai/tests/contract.test.mjs. Run live varied-intent checks with node local-ai/tests/semantic-general.mjs; it needs the existing local Ollama model and writes its generated corpus and results to the temporary tecgpt-general-qa directory. Set TECGPT_TEST_SEED to reproduce a run. These checks exercise varied wording, context, negation, writing, planning, known and missing facts, topic switches and injection; they cannot prove correctness for all possible messages.

The Windows runtime contains semantic-general-results.json, semantic-planner-results.json, semantic-final-results.json and semantic-latest-results.json from successive investigation versions. The first complete broad run passed 16/18 coarse checks, but manual review found additional formatting, grounding and meaning problems. Subsequent changes address scope/type contradictions, clarification/unknown confusion and identity metadata. These earlier artifacts are not proof that the current model is error-free.

## 1 October 2026 availability fix

The protected bridge now accepts a job immediately (HTTP 202), queues up to three jobs, and runs one GPU generation at a time. Browser polls every three seconds through the same Vercel API, receiving queued/running progress. Polls use a separate 60/minute limit, never the six new generations/minute quota. Job IDs are random 256-bit capabilities bound to the original message payload; request retry keys are scoped by user/IP and deduplicate inference. Model credentials remain server-only.

A generation has a 90-second deadline shared across understanding, generation, review and repair. Jobs abandoned for 45 seconds are cancelled. Completed/failed jobs expire after five minutes, and message bodies are cleared when finished. The client waits at most five minutes, retries transport failures twice using the same request key, and the guest UI can retry a failed message without adding another user bubble.

This fixes immediate rejection of a second concurrent message, not model reasoning limitations. Queue capacity, genuine quotas, unavailable PC/tunnel and failed quality checks can still produce visible errors. The local demo and direct Ollama clients are separate consumers; keep those idle while serving the preview to avoid GPU contention.

Run `node --test local-ai/tests/queue.test.mjs local-ai/tests/contract.test.mjs` and `npm run test:security`. Real model evidence is in the runtime's availability-live-results.json; test counts are reported only after completion.
