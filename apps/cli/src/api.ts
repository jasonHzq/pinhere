import type { Config } from "./config.js";

export type ApiEnvelope<T> = { data: T; meta?: { nextCursor?: string | null } };

export class PinhereApi {
  constructor(private readonly config: Config) {}

  async request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
    if (auth) {
      if (!this.config.token) throw new Error("Pinhere CLI is not paired. Run: pinhere auth login");
      headers.set("authorization", `Bearer ${this.config.token}`);
    }
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/api/v1${path}`, { ...init, headers });
    const payload = await response.json().catch(() => null) as { data?: T; error?: { code?: string; message?: string } } | null;
    if (!response.ok) {
      const error = new Error(payload?.error?.message ?? `Pinhere API returned ${response.status}`) as Error & { status?: number; code?: string };
      error.status = response.status; error.code = payload?.error?.code;
      throw error;
    }
    return payload?.data as T;
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body: unknown, auth = true) { return this.request<T>(path, { method: "POST", body: JSON.stringify(body), headers: { "Idempotency-Key": crypto.randomUUID() } }, auth); }
  patch<T>(path: string, body: unknown) { return this.request<T>(path, { method: "PATCH", body: JSON.stringify(body), headers: { "Idempotency-Key": crypto.randomUUID() } }); }

  async download(path: string) {
    if (!this.config.token) throw new Error("Pinhere CLI is not paired. Run: pinhere auth login");
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/api/v1${path}`, { headers: { authorization: `Bearer ${this.config.token}` } });
    if (!response.ok) throw new Error(`Screenshot download failed (${response.status})`);
    return { bytes: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get("content-type") ?? "application/octet-stream" };
  }
}

