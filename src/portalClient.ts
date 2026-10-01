// Tokens never enter this module. Authentication is an opaque HttpOnly cookie.
type Result = { data: any; error: { message: string } | null };
async function call(url: string, body?: unknown): Promise<Result> {
  try {
    const r = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...(body === undefined
        ? {}
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
    const result = await r.json();
    if (!r.ok)
      return {
        data: null,
        error: { message: result.error || "Sorğu tamamlanmadı." },
      };
    return { data: result, error: null };
  } catch {
    return { data: null, error: { message: "Serverə çatmaq mümkün olmadı." } };
  }
}
// Remove only legacy authentication keys; preserve guest chat history.
try {
  for (const key of Object.keys(localStorage)) {
    if (/^sb-.*-auth-token(?:-code-verifier)?$/.test(key))
      localStorage.removeItem(key);
  }
} catch {}
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());
class Query implements PromiseLike<Result> {
  private operation = "select";
  private values: unknown;
  private filters: Record<string, unknown> = {};
  private singleRow = false;
  constructor(private table: string) {}
  select(_fields?: string) {
    return this;
  }
  eq(k: string, v: unknown) {
    this.filters[k] = v;
    return this;
  }
  in(k: string, v: unknown[]) {
    this.filters[k] = v;
    return this;
  }
  order(_k: string, _v: unknown) {
    return this;
  }
  insert(v: unknown) {
    this.operation = "insert";
    this.values = v;
    return this;
  }
  update(v: unknown) {
    this.operation = "update";
    this.values = v;
    return this;
  }
  delete() {
    this.operation = "delete";
    return this;
  }
  single() {
    this.singleRow = true;
    return this;
  }
  maybeSingle() {
    this.singleRow = true;
    return this;
  }
  async execute() {
    const r = await call("/api/data", {
      table: this.table,
      operation: this.operation,
      filters: this.filters,
      values: this.values,
    });
    return {
      data: r.error
        ? null
        : this.singleRow
          ? (r.data?.data?.[0] ?? null)
          : (r.data?.data ?? []),
      error: r.error,
    };
  }
  then<T = Result, U = never>(
    ok?: ((value: Result) => T | PromiseLike<T>) | null,
    bad?: ((reason: any) => U | PromiseLike<U>) | null,
  ): PromiseLike<T | U> {
    return this.execute().then(ok, bad);
  }
}
export const portal = {
  from: (table: string) => new Query(table),
  auth: {
    async getUser() {
      const r = await call("/api/auth");
      return { data: { user: r.data?.user ?? null }, error: r.error };
    },
    async getSession() {
      const r = await call("/api/auth");
      return {
        data: { session: r.data?.user ? { user: r.data.user } : null },
        error: r.error,
      };
    },
    async signInWithPassword(credentials: { email: string; password: string }) {
      const r = await call("/api/auth", { action: "login", ...credentials });
      if (!r.error) notify();
      return r;
    },
    async signOut() {
      const r = await call("/api/auth", { action: "logout" });
      if (!r.error) notify();
      return r;
    },
    onAuthStateChange(fn: () => void) {
      listeners.add(fn);
      return {
        data: {
          subscription: {
            unsubscribe() {
              listeners.delete(fn);
            },
          },
        },
      };
    },
  },
};
export async function registerMember(record: unknown) {
  return call("/api/register", record);
}
