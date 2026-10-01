import {
  jsonBody,
  requireSession,
  requireRole,
  secureResponse,
} from "../../server/portalSecurity.js";
import {
  HttpError,
  enforceLimit,
  sendSecurityError,
} from "../../server/security.js";
export default async function handler(req: any, res: any) {
  secureResponse(res);
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const b = jsonBody(req, 2048);
    const s = await requireSession(req);
    await requireRole(s, ["admin"]);
    await enforceLimit("portal-user", s.user.id);
    if (
      typeof b.email !== "string" ||
      b.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(b.email.trim()) ||
      typeof b.password !== "string" ||
      b.password.length < 12 ||
      b.password.length > 128 ||
      Object.keys(b).some((k) => !["email", "password"].includes(k))
    )
      throw new HttpError(
        400,
        "E-poçt və ən azı 12 simvolluq şifrə tələb olunur.",
      );
    const r = await fetch(
      "https://tec-qeydiyyat-portal.lovable.app/api/public/create-admin",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + s.accessToken,
        },
        body: JSON.stringify({
          email: b.email.trim().toLowerCase(),
          password: b.password,
        }),
        signal: AbortSignal.timeout(12000),
        redirect: "error",
      },
    );
    if (!r.ok) throw new HttpError(502, "Admin hesabı yaradıla bilmədi.");
    const result = await r.json();
    if (result.success !== true)
      throw new HttpError(502, "Admin hesabı yaradıla bilmədi.");
    return res
      .status(200)
      .json({ success: true, message: "Yeni admin yaradıldı." });
  } catch (e) {
    if (sendSecurityError(e, res)) return;
    return res.status(503).json({ error: "Admin xidməti hazır deyil." });
  }
}
