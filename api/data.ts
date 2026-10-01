import {
  HttpError,
  enforceLimit,
  sendSecurityError,
} from "../server/security.js";
import {
  jsonBody,
  requireSession,
  requireRole,
  db,
  secureResponse,
} from "../server/portalSecurity.js";
const uuid = (v: any) => {
  if (
    typeof v !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v)
  )
    throw new HttpError(400, "Identifikator düzgün deyil.");
  return v;
};
export function planQuery(b: any, userId: string) {
  const filters = b.filters || {};
  if (
    !filters ||
    Array.isArray(filters) ||
    typeof filters !== "object" ||
    Object.keys(filters).some(
      (k) => !["id", "chat_id", "user_id", "role"].includes(k),
    )
  )
    throw new HttpError(400, "Filtr düzgün deyil.");
  const owner = "user_id=eq." + encodeURIComponent(userId);
  let path = "",
    method = "GET",
    body: any,
    chatId: string | undefined,
    admin = false,
    tester = false;
  if (b.table === "user_roles" && b.operation === "select") {
    const role = filters.role;
    let suffix = "";
    if (role !== undefined) {
      const values = Array.isArray(role) ? role : [role];
      if (
        !values.length ||
        values.some((v) => !["admin", "tester"].includes(v))
      )
        throw new HttpError(400, "Rol filtri düzgün deyil.");
      suffix = "&role=in.(" + values.join(",") + ")";
    }
    path = "user_roles?" + owner + "&select=role" + suffix;
  } else if (b.table === "tec_members" && b.operation === "select") {
    admin = true;
    path = "tec_members?select=*&order=created_at.desc&limit=1000";
  } else if (b.table === "tecgpt_chats") {
    tester = true;
    if (b.operation === "select")
      path =
        "tecgpt_chats?" +
        owner +
        "&select=id,title,created_at,updated_at&order=updated_at.desc&limit=100";
    else if (b.operation === "insert") {
      if (
        typeof b.values?.title !== "string" ||
        !b.values.title.trim() ||
        b.values.title.length > 100
      )
        throw new HttpError(400, "Başlıq düzgün deyil.");
      if (b.values.user_id !== userId)
        throw new HttpError(403, "Söhbət başqa hesaba aid ola bilməz.");
      method = "POST";
      path = "tecgpt_chats?select=id,title,created_at,updated_at";
      body = { user_id: userId, title: b.values.title.trim() };
    } else if (b.operation === "update" || b.operation === "delete") {
      chatId = uuid(filters.id);
      path = "tecgpt_chats?id=eq." + chatId + "&" + owner;
      method = b.operation === "update" ? "PATCH" : "DELETE";
      if (method === "PATCH") body = { updated_at: new Date().toISOString() };
    } else throw new HttpError(400, "Əməliyyat düzgün deyil.");
  } else if (b.table === "tecgpt_messages") {
    tester = true;
    chatId = uuid(
      b.operation === "insert" ? b.values?.chat_id : filters.chat_id,
    );
    if (b.operation === "select")
      path =
        "tecgpt_messages?chat_id=eq." +
        chatId +
        "&select=id,role,content,created_at&order=created_at.asc&limit=500";
    else if (b.operation === "insert") {
      if (
        !["user", "assistant"].includes(b.values?.role) ||
        typeof b.values?.content !== "string" ||
        !b.values.content.trim() ||
        b.values.content.length > 4000
      )
        throw new HttpError(400, "Mesaj düzgün deyil.");
      method = "POST";
      path = "tecgpt_messages";
      body = {
        chat_id: chatId,
        role: b.values.role,
        content: b.values.content,
      };
    } else throw new HttpError(400, "Əməliyyat düzgün deyil.");
  } else throw new HttpError(400, "Cədvəl və əməliyyat qəbul edilmir.");
  return { path, method, body, chatId, admin, tester };
}
export function createDataHandler(
  deps = { requireSession, requireRole, db, enforceLimit },
) {
  return async function handler(req: any, res: any) {
    secureResponse(res);
    try {
      if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
      const b = jsonBody(req);
      const s = await deps.requireSession(req);
      await deps.enforceLimit("portal-user", s.user.id);
      const q = planQuery(b, s.user.id);
      if (q.admin) await deps.requireRole(s, ["admin"]);
      if (q.tester) await deps.requireRole(s, ["admin", "tester"]);
      if (q.chatId) {
        const owned = await deps.db(
          s,
          "tecgpt_chats?id=eq." +
            q.chatId +
            "&user_id=eq." +
            encodeURIComponent(s.user.id) +
            "&select=id&limit=1",
        );
        if (!Array.isArray(owned) || owned.length !== 1)
          throw new HttpError(404, "Söhbət tapılmadı.");
      }
      const result = await deps.db(s, q.path, {
        method: q.method,
        headers: {
          Prefer:
            q.method === "POST" ? "return=representation" : "return=minimal",
        },
        ...(q.body ? { body: JSON.stringify(q.body) } : {}),
      });
      return res.status(200).json({ data: result ?? [] });
    } catch (e) {
      if (sendSecurityError(e, res)) return;
      console.error(
        "[portal data]",
        e instanceof Error ? e.name : "UnknownError",
      );
      return res.status(503).json({ error: "Məlumat xidməti hazır deyil." });
    }
  };
}
export default createDataHandler();
