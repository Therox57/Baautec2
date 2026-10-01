# Video security controls — 2026-10-01

Scope: video items 1–9; item 10 (admin IP restriction) expressly excluded.

| Item | Implementation and verification |
| --- | --- |
| 1 HttpOnly cookies | Browser Supabase authentication replaced by same-origin BFF. Opaque 256-bit session cookie: HttpOnly, Secure, SameSite=Strict, Path=/, __Host prefix. JWT and refresh token never returned to browser. Legacy browser auth storage removed. |
| 2 Short session | Redis session and cookie expire after at most 600 seconds; no refresh token retained. Underlying Lovable Auth JWT lifetime cannot be changed in the exposed Cloud Auth settings; this is NOT a claim that provider JWT expiry was changed. Admin must log in again after expiry. |
| 3 Login rate limit | Fail-closed Redis quotas: account 5/15 minutes and IP 8/15 minutes. Registration 5/hour/IP, 200/hour/global. |
| 4 Server authorization | Every protected endpoint verifies cookie session against Auth, then queries actual role table. Browser role checks alone cannot authorize writes. |
| 5 Ownership | Server derives owner from verified session; checks chat ownership before message reads/writes and chat changes. Foreign identifiers fail even if mocked database RLS is permissive. |
| 6 RLS | Live Cloud database: all four portal tables have RLS. has_role now SECURITY INVOKER, public/anon execution revoked. Explicit restrictive UPDATE owner USING/WITH CHECK on messages. Audit log access stays server-only. |
| 7 Server env secrets | Existing server KV credentials required, fail closed if unavailable. Server-only Auth/db calls; no service-role credentials added. |
| 8 Frontend secrets | Browser SDK/config removed, CSP connect-src restricted to self. Bundled browser code contains no session JWT/refresh token or backend secret. Public publishable keys are not treated as secret. |
| 9 Server validation | Allowlisted registration fields, closed language objects, type/length/date/phone/email/course/privacy checks; DB CHECK constraints enforce those bounds for direct database inserts too. |

## Executed checks

- 72 automated tests passed, including new auth/CSRF/expired-session/ownership/form tests.
- TypeScript and Vite production build passed; git diff --check clean.
- Live Cloud SQL test: valid synthetic registration INSERT succeeded; invalid phone, email, future birth date and language level rejected. Entire synthetic test rolled back, no test row persisted.
- Live metadata: all_rls_enabled=true; role_function_invoker=true; message_owner_check=true.
- Cloud Auth settings: public sign-up disabled; anonymous sign-in disabled. JWT lifetime and provider login quota controls were not exposed in that panel.

## Limits / follow-up

- Database migration is already applied to shared live Cloud database. Frontend/BFF changes deploy to preview first; old production frontend remains until promotion.
- Existing anonymous direct database registration remains to preserve the original published Lovable registration form. A caller with the public key can bypass Vercel registration quotas, but DB validation still applies. Fully closing this path needs server-only registration credentials plus removal of anonymous INSERT, together with migration of the original Lovable form.
- Original Lovable create-admin endpoint remains independently available with its existing admin authorization and minimum 8-character password rule. The new Vercel proxy additionally requires same-origin cookie auth and 12 characters; that does not change the original endpoint.
- Admin registration listing currently caps 1000 records, chat listing 100, messages 500. Pagination is a follow-up before those bounds are reached.
- Owner signed into the deployed preview with their existing account. Admin dashboard loaded 206 registrations and the unanswered-question queue. Browser console error/warning scan returned none. No passwords were requested through chat and no real admin accounts were created in tests.
- Local AI tunnel URL has changed after restart; preview AI env update still needs the user's Vercel security verification. Security deployment itself does not require disabling or skipping that verification.

## Deployment verification

Preview branch tecgpt-local-9b-preview; GitHub Vercel status success for 76e5315. Preview admin browser login and protected data loading verified by owner sign-in. Node HTTP probes hit Vercel deployment protection, so their 401 responses are NOT counted as application authorization test passes. The connected Vercel app lacks access to this team; browser access worked with the owner session.
