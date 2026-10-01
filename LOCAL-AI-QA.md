# Local 9B preview verification — 2026-10-01

The preview uses asynchronous, bounded FIFO jobs instead of rejecting every overlapping request as busy. Browser polling and idempotent transport retries avoid duplicate generation; a retry does not add another user message. Abandoned jobs and generation deadlines release the queue. Credentials stay on the server.

Validation:
- 62 website/security/client/storage tests and 18 local-model queue/contract/constraint tests pass.
- Eight real requests in four concurrent pairs completed; the second request waited in the queue. Six malformed or unauthorized HTTP cases were rejected.
- An 18-case randomized semantic run exposed a genuine negation/source-selection defect and writing-perspective problems. General constraint extraction, source exclusion and reviewer instructions were corrected, rather than adding question-specific replies.
- Seven targeted live rechecks completed: identity, explicit constraints, writing perspective, unresolved reference, study levels, unknown room and instruction injection. Their contract assertions pass. Manual inspection still finds awkward Azerbaijani grammar in the drafted introduction; these assertions are not a guarantee of perfect language.
- Browser checks covered mobile width, queued completion, full-queue retry and absence of duplicate user bubbles. Cross-tab reply persistence has automated coverage.

Limitations: the same local 9B model plans, generates and reviews answers, so it can miss its own semantic or grammatical errors. Observed rechecks took approximately 6–78 seconds of model processing; waiting behind another request adds time. This is not exhaustive coverage of all possible messages or a claim of Gemini-level quality. The PC and protected tunnel must remain available. Production/main is unchanged by this preview work.
