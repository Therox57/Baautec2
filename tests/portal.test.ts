import test from "node:test";
import assert from "node:assert/strict";
import {
  cookie,
  SESSION_SECONDS,
  sessionId,
  jsonBody,
  requireSession,
} from "../server/portalSecurity.js";
import { validateRegistration } from "../server/registration.js";
import { planQuery, createDataHandler } from "../api/data.js";
import auth from "../api/auth.js";
import register from "../api/register.js";
import createAdmin from "../api/admin/create-admin.js";
const headers = {
  host: "site.example",
  origin: "https://site.example",
  "content-type": "application/json",
};
const session = {
  accessToken: "test-upstream-token",
  user: {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    email: "test@example.com",
  },
  expiresAt: Date.now() + 600000,
};
function response() {
  let status = 0,
    body: any;
  const h: Record<string, string> = {};
  return {
    res: {
      setHeader(k: string, v: string) {
        h[k] = v;
      },
      status(n: number) {
        status = n;
        return this;
      },
      json(v: any) {
        body = v;
        return this;
      },
    },
    get status() {
      return status;
    },
    get body() {
      return body;
    },
    headers: h,
  };
}
test("session cookie is opaque, secure, HttpOnly, strict and short-lived", () => {
  assert.equal(SESSION_SECONDS, 600);
  const c = cookie("a".repeat(64));
  for (const flag of [
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Path=/",
    "Max-Age=600",
  ])
    assert.ok(c.includes(flag));
  assert.equal(
    sessionId({ headers: { cookie: "__Host-tec_session=" + "a".repeat(64) } }),
    "a".repeat(64),
  );
  for (const cookie of [
    "__Host-tec_session=forged",
    "__Host-tec_session=" +
      "a".repeat(64) +
      "; __Host-tec_session=" +
      "b".repeat(64),
  ])
    assert.equal(sessionId({ headers: { cookie } }), undefined);
});
test("cookie mutations reject cross-site, absent origin, bad JSON and oversized bodies", () => {
  for (const req of [
    { headers: { ...headers, origin: "https://attacker.example" }, body: {} },
    { headers: { ...headers, origin: undefined }, body: {} },
    { headers, body: "not-json" },
    { headers, body: { x: "x".repeat(17000) } },
  ])
    assert.throws(() => jsonBody(req));
  assert.deepEqual(jsonBody({ headers, body: { action: "logout" } }), {
    action: "logout",
  });
});
const valid = {
  first_name: "Test",
  last_name: "Example",
  father_name: "Example",
  birth_date: "2004-01-10",
  gender: "Kişi",
  phone: "+994 50 123 45 67",
  email: "test@example.com",
  faculty: "Test faculty",
  specialty: "Test specialty",
  course: "1-ci kurs",
  membership_reason: "Synthetic form validation only",
  languages: [{ language: "İngilis dili", level: "B1–B2" }],
  skills: "Testing",
  additional_note: null,
  privacy_accepted: true,
};
test("registration validates server-side, refuses role injection, invalid dates, excess input and missing consent", () => {
  assert.equal(validateRegistration(valid).email, "test@example.com");
  for (const change of [
    { role: "admin" },
    { birth_date: "2004-02-31" },
    { birth_date: "2099-01-01" },
    { gender: "x" },
    { course: "x" },
    { privacy_accepted: false },
    { phone: "x" },
    { email: "x" },
    { languages: [] },
    { languages: [{ language: "English", level: "bad" }] },
    { membership_reason: "x" },
    { skills: "x".repeat(1001) },
  ])
    assert.throws(() => validateRegistration({ ...valid, ...change }));
});
test("data plans use verified owner and server-selected fields, never visitor user id or arbitrary table", () => {
  const q = planQuery(
    {
      table: "tecgpt_chats",
      operation: "select",
      filters: { user_id: "victim" },
    },
    session.user.id,
  );
  assert.ok(q.path.includes(session.user.id));
  assert.ok(!q.path.includes("victim"));
  assert.equal(
    planQuery({ table: "tec_members", operation: "select" }, session.user.id)
      .admin,
    true,
  );
  assert.throws(() =>
    planQuery(
      { table: "user_roles", operation: "update", values: { role: "admin" } },
      session.user.id,
    ),
  );
  assert.throws(() =>
    planQuery({ table: "audit_logs", operation: "select" }, session.user.id),
  );
  assert.throws(() =>
    planQuery(
      {
        table: "tecgpt_chats",
        operation: "insert",
        values: { user_id: "victim", title: "x" },
      },
      session.user.id,
    ),
  );
});
test("foreign chat id cannot read or write messages even when database policies are missing", async () => {
  for (const operation of ["select", "insert"]) {
    let calls = 0;
    const handler = createDataHandler({
      requireSession: async () => session,
      requireRole: async () => [{ role: "tester" }],
      enforceLimit: async () => {},
      db: async (_s, path) => {
        calls++;
        assert.match(path, /user_id=eq.aaaaaaaa/);
        return [];
      },
    });
    const out = response();
    await handler(
      {
        method: "POST",
        headers,
        body: {
          table: "tecgpt_messages",
          operation,
          filters: { chat_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" },
          values: {
            chat_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            role: "user",
            content: "x",
          },
        },
      },
      out.res,
    );
    assert.equal(out.status, 404);
    assert.equal(calls, 1);
  }
});
test("owned chat operations continue through the authenticated database client", async () => {
  let calls = 0;
  const handler = createDataHandler({
    requireSession: async () => session,
    requireRole: async () => [{ role: "tester" }],
    enforceLimit: async () => {},
    db: async (s, path) => {
      assert.equal(s?.accessToken, session.accessToken);
      calls++;
      return calls === 1
        ? [{ id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" }]
        : [{ role: "user", content: "hello" }];
    },
  });
  const out = response();
  await handler(
    {
      method: "POST",
      headers,
      body: {
        table: "tecgpt_messages",
        operation: "select",
        filters: { chat_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" },
      },
    },
    out.res,
  );
  assert.equal(out.status, 200);
  assert.equal(calls, 2);
});
test("public and administrative endpoints fail before network for forged session or malformed form", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw Error("Unexpected network request");
  };
  try {
    let out = response();
    await auth({ method: "GET", headers: {} }, out.res);
    assert.deepEqual(out.body, { user: null, roles: [] });
    out = response();
    await createAdmin(
      { method: "POST", headers, body: { email: "x", password: "x" } },
      out.res,
    );
    assert.equal(out.status, 401);
    out = response();
    await register(
      { method: "POST", headers, body: { ...valid, privacy_accepted: false } },
      out.res,
    );
    assert.equal(out.status, 400);
    await assert.rejects(
      () => requireSession({ headers: { authorization: "Bearer forged" } }),
      (e: any) => e.status === 401,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("login sets only an opaque cookie, discards refresh token and rejects visitors before saving a session", async () => {
  const { createAuthHandler } = await import("../api/auth.js");
  const original = globalThis.fetch;
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "test-public";
  let saved = 0,
    limited = 0;
  globalThis.fetch = async () =>
    Response.json({
      access_token: "upstream-private-token",
      refresh_token: "must-not-reach-browser",
      expires_in: 3600,
      user: session.user,
    });
  const deps = {
    requireSession: async () => session,
    requireRole: async () => [{ role: "admin" }],
    removeSession: async () => {},
    saveSession: async () => {
      saved++;
      return { id: "c".repeat(64), ttl: 600 };
    },
    loginLimits: async () => {
      limited++;
    },
  };
  try {
    const out = response();
    await createAuthHandler(deps)(
      {
        method: "POST",
        headers,
        body: {
          action: "login",
          email: "test@example.com",
          password: "test-only-password",
        },
      },
      out.res,
    );
    assert.equal(out.status, 200);
    assert.equal(saved, 1);
    assert.equal(limited, 1);
    assert.ok(out.headers["Set-Cookie"].includes("HttpOnly"));
    assert.ok(!JSON.stringify(out.body).includes("token"));
    const deny = response();
    await createAuthHandler({
      ...deps,
      requireRole: async () => {
        const { HttpError } = await import("../server/security.js");
        throw new HttpError(403, "Denied");
      },
    })(
      {
        method: "POST",
        headers,
        body: {
          action: "login",
          email: "test@example.com",
          password: "test-only-password",
        },
      },
      deny.res,
    );
    assert.equal(deny.status, 403);
    assert.equal(saved, 1);
  } finally {
    globalThis.fetch = original;
    if (url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = url;
    if (key === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
    else process.env.SUPABASE_PUBLISHABLE_KEY = key;
  }
});
test("logout revokes the server session and expires the HttpOnly cookie", async () => {
  const { createAuthHandler } = await import("../api/auth.js");
  let removed = 0;
  const out = response();
  await createAuthHandler({
    requireSession: async () => session,
    requireRole: async () => [],
    removeSession: async () => {
      removed++;
    },
    saveSession: async () => ({ id: "x", ttl: 600 }),
    loginLimits: async () => {},
  })({ method: "POST", headers, body: { action: "logout" } }, out.res);
  assert.equal(removed, 1);
  assert.equal(out.status, 200);
  assert.ok(out.headers["Set-Cookie"].includes("Max-Age=0"));
});
test("expired server session cannot use a still valid upstream JWT", async () => {
  const original = globalThis.fetch;
  const u = process.env.KV_REST_API_URL,
    k = process.env.KV_REST_API_TOKEN;
  process.env.KV_REST_API_URL = "https://test-redis.example";
  process.env.KV_REST_API_TOKEN = "test-only";
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json([
      {
        result: Buffer.from(
          JSON.stringify({ ...session, expiresAt: Date.now() - 1 }),
        ).toString("base64"),
      },
    ]);
  };
  try {
    await assert.rejects(
      () =>
        requireSession({
          headers: { cookie: "__Host-tec_session=" + "d".repeat(64) },
        }),
      (e: any) => e.status === 401,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
    if (u === undefined) delete process.env.KV_REST_API_URL;
    else process.env.KV_REST_API_URL = u;
    if (k === undefined) delete process.env.KV_REST_API_TOKEN;
    else process.env.KV_REST_API_TOKEN = k;
  }
});
