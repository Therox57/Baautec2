import { createHash, randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";
import { HttpError, enforceLimit, clientIp } from "./security.js";
export const COOKIE = "__Host-tec_session";
export const SESSION_SECONDS = 600;
export type Session = {
  accessToken: string;
  user: { id: string; email: string };
  expiresAt: number;
};
export function sessionId(req: any) {
  const cookie = String(req.headers.cookie || "");
  const matches = cookie
    .split(";")
    .map((c: string) => c.trim())
    .filter((c: string) => c.startsWith(COOKIE + "="));
  if (matches.length !== 1) return undefined;
  const id = matches[0].slice(COOKIE.length + 1);
  return /^[a-f0-9]{64}$/.test(id) ? id : undefined;
}
export function cookie(value: string, maxAge = SESSION_SECONDS) {
  return (
    COOKIE +
    "=" +
    value +
    "; Path=/; Max-Age=" +
    maxAge +
    "; HttpOnly; Secure; SameSite=Strict"
  );
}
export function assertSameOrigin(req: any) {
  if (req.headers["sec-fetch-site"] === "cross-site")
    throw new HttpError(403, "Başqa saytdan sorğu qəbul edilmir.");
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (
    typeof origin !== "string" ||
    typeof host !== "string" ||
    origin !== "https://" + host
  )
    throw new HttpError(403, "Sorğunun mənbəyi təsdiqlənmədi.");
}
export function jsonBody(req: any, max = 16384) {
  assertSameOrigin(req);
  if (
    typeof req.headers["content-type"] !== "string" ||
    req.headers["content-type"].split(";")[0].trim() !== "application/json"
  )
    throw new HttpError(415, "JSON tələb olunur.");
  const raw =
    typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  if (!raw || Buffer.byteLength(raw) > max)
    throw new HttpError(413, "Sorğu həddən artıq böyükdür.");
  try {
    const b = JSON.parse(raw);
    if (!b || typeof b !== "object" || Array.isArray(b)) throw Error();
    return b;
  } catch {
    throw new HttpError(400, "Sorğu düzgün deyil.");
  }
}
export function config() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new HttpError(503, "Server konfiqurasiyası hazır deyil.");
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.pathname !== "/" ||
    !/\.(supabase\.co|lovable\.cloud)$/.test(u.hostname)
  )
    throw new HttpError(503, "Server konfiqurasiyası düzgün deyil.");
  return { url: u.origin, key };
}
function store() {
  const url = process.env.KV_REST_API_URL,
    token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new HttpError(503, "Sessiya xidməti hazır deyil.");
  return new Redis({ url, token });
}
export async function saveSession(
  accessToken: string,
  user: Session["user"],
  upstreamSeconds: number,
) {
  const ttl = Math.min(SESSION_SECONDS, Math.floor(upstreamSeconds));
  if (!Number.isFinite(ttl) || ttl < 30) throw new HttpError(503, "Sessiyanın ömrü düzgün deyil.");
  const id = randomBytes(32).toString("hex");
  await store().set(
    "portal:session:" + id,
    { accessToken, user, expiresAt: Date.now() + ttl * 1000 },
    { ex: ttl },
  );
  return { id, ttl };
}
export async function removeSession(req: any) {
  const id = sessionId(req);
  if (!id) return;
  const redis = store();
  const old = await redis.get<Session>("portal:session:" + id);
  await redis.del("portal:session:" + id);
  if (old?.accessToken) {
    const c = config();
    try {
      await fetch(c.url + "/auth/v1/logout?scope=local", {
        method: "POST",
        headers: { apikey: c.key, Authorization: "Bearer " + old.accessToken },
        signal: AbortSignal.timeout(8000),
      });
    } catch {}
  }
}
export async function requireSession(req: any) {
  const id = sessionId(req);
  if (!id) throw new HttpError(401, "Giriş tələb olunur.");
  let s: Session | null;
  try {
    s = await store().get<Session>("portal:session:" + id);
  } catch {
    throw new HttpError(503, "Sessiya xidməti hazır deyil.");
  }
  if (
    !s ||
    !Number.isFinite(s.expiresAt) ||
    s.expiresAt <= Date.now() ||
    typeof s.accessToken !== "string" ||
    !s.user?.id
  )
    throw new HttpError(401, "Sessiya bitib. Yenidən daxil olun.");
  const c = config();
  const r = await fetch(c.url + "/auth/v1/user", {
    headers: { apikey: c.key, Authorization: "Bearer " + s.accessToken },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new HttpError(401, "Sessiya etibarsızdır.");
  const user = await r.json();
  if (user.id !== s.user.id) throw new HttpError(401, "Sessiya etibarsızdır.");
  return s;
}
export async function db(
  s: Session | undefined,
  path: string,
  init: RequestInit = {},
) {
  const c = config();
  const headers = new Headers(init.headers);
  headers.set("apikey", c.key);
  headers.set("Content-Type", "application/json");
  if (s) headers.set("Authorization", "Bearer " + s.accessToken);
  const r = await fetch(c.url + "/rest/v1/" + path, {
    ...init,
    headers,
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok)
    throw new HttpError(
      r.status === 401 ? 401 : r.status === 403 ? 403 : 502,
      "Məlumat əməliyyatı tamamlanmadı.",
    );
  return r.status === 204 ? null : await r.json().catch(() => null);
}
export async function requireRole(s: Session, allowed: string[]) {
  const roles = await db(
    s,
    "user_roles?user_id=eq." + encodeURIComponent(s.user.id) + "&select=role",
  );
  if (!Array.isArray(roles) || !roles.some((r) => allowed.includes(r.role)))
    throw new HttpError(403, "Bu əməliyyata icazəniz yoxdur.");
  return roles.filter((r) => allowed.includes(r.role));
}
export async function sessionAuthorization(req: any) {
  const s = await requireSession(req);
  return "Bearer " + s.accessToken;
}
export async function loginLimits(req: any, email: string) {
  await enforceLimit("login-ip", clientIp(req));
  await enforceLimit(
    "login-account",
    createHash("sha256").update(email.toLowerCase()).digest("hex"),
  );
}
export function secureResponse(res: any) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
}
