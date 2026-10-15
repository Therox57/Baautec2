# TECGPT speed check — 16 October 2026

The local `qwen3.5:9b-best` model and full fact review remain enabled. The model runs on the PC GPU; this change does not switch providers or lower model size.

## Changes

- Preserve the exact generation system prefix, verified sources and original conversation for the independent review. Append the checker task instead of replacing the complete prompt and processing the same evidence again.
- Shorten duplicated reviewer instructions, retaining grounding, privacy, user constraints, dates, roles and language checks. Preserve the original generation policy after comparing a shorter experimental variant.
- Reuse exact, single-message public factual answers for five minutes, maximum 64 entries. Require a verified answer, accepted guard and a successful independent review. Advice, contextual conversations, unknowns, refusals, failed reviews and repaired-but-not-revalidated drafts are excluded. Only message hashes and answers are retained. Expire on TTL, Baku calendar day change, and process restart; changed source modules require the normal bridge restart.

## Measurements

Three sequential direct-model requests, same model, review enabled, no answer cache:

| Question | Before | Shared-prefix review |
| --- | ---: | ---: |
| TEC office | 63.1 s | 33.3 s |
| TEC clubs and leaders | 51.3 s | 40.1 s |
| Learning opportunities, excluding registration and links | 83.1 s | 40.3 s |
| Mean | 65.8 s | 37.9 s |

The first baseline included approximately nine seconds of model loading. Generation and repair decisions vary between runs; these are small-sample measurements, not a latency guarantee. Reviewer prompt processing fell from 16.2–22.7 seconds to 8.1–9.8 seconds in these cases. A shorter generation-policy experiment was reverted and its results are not used in this table.

Final active bridge, real guest API on https://baautec.vercel.app, question `TEC-in otağı haradadır?`:

- First response: **36.2 s**, 11 HTTP requests including queue polling.
- Exact repeat with a new request ID: **0.5 s**, one HTTP request, identical reply.
- Both responses report `local-9b` / `qwen3.5:9b-best`, and return B building, floor 2, room 205.

Run `node qa/tecgpt-speed-check.mjs` for stage timings and `node qa/tecgpt-live-speed-check.mjs` for first/repeat behavior. The latter requires the compiled request helper from `npm run test:security` and the configured, running protected bridge. Avoid concurrent benchmarks on this single-GPU setup.

## Validation

- 94 server/client tests passed.
- 39 local runtime tests passed, including review-prefix evidence retention, fail-closed review, TTL, exact-message boundaries, busy-GPU reuse, contextual/private/unknown/advice exclusions and Baku midnight invalidation.
- Production build passed.

First-time questions still require inference, and complex conversations or repairs can take longer. Queue waiting and network latency remain additional costs. No fresh full 21-case audit is claimed by this speed check.
