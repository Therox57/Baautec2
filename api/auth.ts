import { HttpError, sendSecurityError } from "../server/security.js";
import {
  jsonBody,
  config,
  saveSession,
  removeSession,
  requireSession,
  requireRole,
  cookie,
  loginLimits,
  secureResponse,
} from "../server/portalSecurity.js";
export function createAuthHandler(
  deps = {
    requireSession,
    requireRole,
    removeSession,
    saveSession,
    loginLimits,
  },
) {
  return async function handler(req: any, res: any) {
    secureResponse(res);
    try {
      if (req.method === "GET") {
        try {
          const s = await deps.requireSession(req);
          const roles = await deps.requireRole(s, ["admin", "tester"]);
          return res
            .status(200)
            .json({ user: s.user, roles, expiresAt: s.expiresAt });
        } catch (e) {
          if (e instanceof HttpError && e.status === 401)
            return res.status(200).json({ user: null, roles: [] });
          throw e;
        }
      }
      if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
      const b = jsonBody(req, 2048);
      if (b.action === "logout") {
        await deps.removeSession(req);
        res.setHeader("Set-Cookie", cookie("", 0));
        return res.status(200).json({ success: true });
      }
      if (
        b.action !== "login" ||
        typeof b.email !== "string" ||
        b.email.length > 254 ||
        typeof b.password !== "string" ||
        b.password.length < 1 ||
        b.password.length > 128
      )
        throw new HttpError(400, "Giriş məlumatları düzgün deyil.");
      const email = b.email.trim().toLowerCase();
      await deps.loginLimits(req, email);
      const c = config();
      const r = await fetch(c.url + "/auth/v1/token?grant_type=password", {
        method: "POST",
        headers: { apikey: c.key, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: b.password }),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new HttpError(401, "E-poçt və ya şifrə yanlışdır.");
      const result = await r.json();
      if (
        typeof result.access_token !== "string" ||
        typeof result.user?.id !== "string" ||
        typeof result.expires_in !== "number"
      )
        throw new HttpError(502, "Giriş tamamlanmadı.");
      const user = {
        id: result.user.id,
        email: String(result.user.email || email),
      };
      await deps.requireRole(
        {
          accessToken: result.access_token,
          user,
          expiresAt: Date.now() + 600000,
        },
        ["admin", "tester"],
      );
      await deps.removeSession(req);
      const session = await deps.saveSession(
        result.access_token,
        user,
        result.expires_in,
      );
      res.setHeader("Set-Cookie", cookie(session.id, session.ttl));
      return res
        .status(200)
        .json({ user, expiresAt: Date.now() + session.ttl * 1000 });
    } catch (e) {
      if (sendSecurityError(e, res)) return;
      console.error(
        "[portal auth]",
        e instanceof Error ? e.name : "UnknownError",
      );
      return res.status(503).json({ error: "Giriş xidməti hazır deyil." });
    }
  };
}
export default createAuthHandler();
