import { jsonBody, db, secureResponse } from "../server/portalSecurity.js";
import { validateRegistration } from "../server/registration.js";
import {
  HttpError,
  enforceLimit,
  clientIp,
  sendSecurityError,
} from "../server/security.js";
export default async function handler(req: any, res: any) {
  secureResponse(res);
  try {
    if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
    const b = jsonBody(req);
    const record = validateRegistration(b);
    await enforceLimit("register-ip", clientIp(req));
    await enforceLimit("register-global", "global");
    await db(undefined, "tec_members", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(record),
    });
    return res.status(201).json({ success: true });
  } catch (e) {
    if (sendSecurityError(e, res)) return;
    console.error(
      "[portal registration]",
      e instanceof Error ? e.name : "UnknownError",
    );
    return res.status(503).json({ error: "Qeydiyyat hazırda tamamlanmadı." });
  }
}
