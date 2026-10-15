# TECGPT check — 2026-10-16

## Scope and evidence

Visitor chat at `/tecgpt-guest` → the shipped chat client request/poll protocol → Vercel guest API → authenticated Cloudflare bridge → PC-hosted `qwen3.5:9b-best` → validated response.

- 94 application/server/client tests passed.
- 34 local runtime tests passed, including FIFO queueing, cancellation, capacity, malformed results, constraints, refusal, missing facts, source IDs and calendar consistency.
- 21 live scenarios passed after iterative fixes and targeted retests. All returned `provider: local-9b`. Responses were checked against the owner-provided knowledge, not independently verified as current university policy.
- Build passed.
- Live HTTP checks: chat page 200; unsupported guest GET 405; invalid payload 400; anonymous access to the protected tester endpoint 401. The authenticated bridge rejects requests without its key.

## Corrections applied

- Preserve semantic source exclusions when syncing the local knowledge snapshot. Keep literal negative user instructions over an incorrectly inverted generated summary.
- Hide superseded registration history when the latest request explicitly excludes it. Excluded registration sentences/URLs cannot survive output validation; an empty result fails closed.
- Bound focused PC context and ignore broad planner boilerplate during retrieval. Clear single-turn requests skip a redundant interpretation pass while keeping source checks and independent factual review. Refusals and empty unknown answers do not receive unnecessary factual reviews.
- Give interpretation, generation and review the same current Baku date. Planned events remain plans; unknown hours, rooms and signup links stay unknown.
- Remove unsourced publication claims about omitted contact/schedule details, including false claims that official sources have or have not published them.
- Ask for the referent on bare third-person questions instead of generating an unrelated greeting or switching languages.
- Preserve the supplied club leader surname, and mark unsupported facts as unknown for review.

## Live scenarios

The suite was executed iteratively while fixes were applied. Failed cases were repeated; final targeted retests replaced older results. Timing figures span those runs and are not a controlled benchmark.

| Scenario | Result | Seconds |
|---|---|---:|
| membership-free | Pass | 79.7 |
| followup-deans | Pass | 68.2 |
| library | Pass | 68.8 |
| exam-both-thresholds | Pass | 78.4 |
| martin-date-correction | Pass | 72.1 |
| writers-docx | Pass | 85.2 |
| deputy-unknown | Pass | 31 |
| housing-price-unknown | Pass | 37.6 |
| scholarship-year | Pass | 76.1 |
| certificate-no-guarantee | Pass | 69.1 |
| project-submission | Pass | 45.9 |
| no-registration | Pass | 35.3 |
| topic-switch | Pass | 3.8 |
| private-data | Pass | 8.1 |
| prompt-injection | Pass | 31 |
| factual-followup | Pass | 61.4 |
| relative-date | Pass | 61.9 |
| rector-typo | Pass | 62.1 |
| office-club-leaders | Pass | 48.3 |
| sparse-reference | Pass | 3.8 |
| psychology-support | Pass | 28.5 |

## Practical limits and untested surfaces

- PC response time remains variable: substantive examples took roughly 28–85 seconds across the runs. The previously failing scholarship question completed at about 76 seconds. The final office/leader retest took about 48 seconds versus about 86 seconds before changes. This is a single-PC model, not a capacity/stress-test result.
- One generation runs at a time, with a bounded queue and explicit retryable errors. PC, Ollama, bridge and tunnel must remain running.
- This check covers actual guest API/model flow and the client protocol tests. No fresh visual browser inspection was completed. A real signed-in tester session was not used; its authentication guard and mocked session behavior were tested.
- This is a finite functional check, not a guarantee against every possible model mistake or a new whole-site penetration test.

## Reproduce

Run `npm run test:security`, then `node --test local-ai/tests/*.test.mjs` for automated tests. The dedicated live runner `qa/bot-full-check-2026-10-15.mjs` uses the production guest endpoint and writes its report locally. It sends 21 synthetic scenarios through the PC queue; run deliberately while the PC bridge is available, not on every build. `TECGPT_QA_ONLY` can select comma-separated scenario IDs for targeted retests.
