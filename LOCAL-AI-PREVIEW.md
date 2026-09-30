# Local 9B preview

This branch can route TECGPT chat requests to the owner's local Qwen3.5 9B model. It is enabled only when VERCEL_ENV is preview and both TECGPT_LOCAL_URL and TECGPT_LOCAL_BRIDGE_KEY are configured. Set these variables only for the tecgpt-local-9b-preview branch. Production continues using its existing provider.

The local bridge accepts only authenticated POST /api/chat requests, validates message sizes, allows one active generation, and caps accepted requests per minute. Ollama, filesystem access, and the local setup page are not exposed through the tunnel. The bridge secret remains in a server-side environment variable and is never returned to the browser.

The Windows runtime is C:/Users/user/tecgpt-local-runtime. Start preview-bridge.mjs with Node and a Cloudflare Quick Tunnel to localhost:4178. Keep the computer running. Quick Tunnel URLs change after restart; update the preview-only URL and redeploy if that happens. Secret setup is available locally on localhost:4178/setup and cannot be served through Cloudflare. Models and credentials are not committed.

Local replies use verified BAAU/TEC source text, a draft and editorial review, plus conservative Azerbaijani corrections. Unknown facts and off-topic requests keep the requested standard replies. These safeguards reduce mistakes; they do not guarantee perfect language or factual accuracy.

Checks: npm run test:security and npm run build. Targeted language/meaning checks and actual model responses are saved in the local runtime folder.

The tested local AI source snapshot is versioned in local-ai/. It requires the existing Ollama qwen3.5:9b-best import; weights and Cloudflare executables remain local. Runtime source improvements include context-sensitive source selection, editorial review, and conservative language and response-length checks.

Owner-maintained persona.mjs records TEC's general social activity (owner confirmed 2026-10-01), separately from visitor claims. Joining/comparison advice presents TEC positively without inventing events or disparaging TGT. Identity questions use configured assistant metadata. Unknown institutional facts retain the source fallback.
