import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { createInterface as createPrompt } from "node:readline/promises";
import type { AgentMode } from "./config.js";

type RpcResult = { id?: number; result?: unknown; error?: { message?: string }; method?: string; params?: Record<string, unknown> };

export function codexPolicy(mode: AgentMode) {
  if (mode === "yolo") return { approvalPolicy: "never", sandboxPolicy: { type: "dangerFullAccess" } } as const;
  if (mode === "workspace") return { approvalPolicy: "never", sandboxPolicy: { type: "workspaceWrite", networkAccess: true } } as const;
  return { approvalPolicy: "onRequest", sandboxPolicy: { type: "workspaceWrite", networkAccess: true } } as const;
}

export class CodexHarness {
  private process?: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  private listeners = new Set<(event: RpcResult) => void>();
  private exitListeners = new Set<(error: Error) => void>();
  private activeMode: AgentMode = "yolo";

  async start() {
    if (this.process) return;
    const child = spawn(process.env.PINHERE_CODEX_BIN ?? "codex", ["app-server"], { stdio: ["pipe", "pipe", "pipe"] });
    this.process = child;
    createInterface({ input: child.stdout }).on("line", (line) => {
      let message: RpcResult;
      try { message = JSON.parse(line) as RpcResult; } catch { return; }
      if (typeof message.id === "number") {
        const waiter = this.pending.get(message.id);
        if (waiter) {
          this.pending.delete(message.id);
          if (message.error) waiter.reject(new Error(message.error.message ?? "Codex App Server request failed"));
          else waiter.resolve(message.result);
        } else if (message.method) {
          void this.handleServerRequest(message);
        }
      }
      if (message.method) for (const listener of this.listeners) listener(message);
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr = `${stderr}${String(chunk)}`.slice(-8_000); });
    child.on("exit", (code) => {
      const error = new Error(`Codex App Server exited (${code ?? "signal"})${stderr ? `: ${stderr.trim()}` : ""}`);
      for (const waiter of this.pending.values()) waiter.reject(error);
      for (const listener of this.exitListeners) listener(error);
      this.pending.clear(); this.listeners.clear(); this.exitListeners.clear(); this.process = undefined;
    });
    await this.request("initialize", { clientInfo: { name: "pinhere", title: "Pinhere", version: "0.1.0" } });
    this.notify("initialized", {});
  }

  private async handleServerRequest(message: RpcResult) {
    if (!this.process || typeof message.id !== "number" || !message.method) return;
    const approval = message.method === "item/commandExecution/requestApproval" || message.method === "item/fileChange/requestApproval";
    if (!approval) {
      this.process.stdin.write(`${JSON.stringify({ id: message.id, error: { code: -32601, message: `Unsupported client request: ${message.method}` } })}\n`);
      return;
    }
    let decision = "decline";
    if (this.activeMode === "confirm" && process.stdin.isTTY) {
      const detail = String(message.params?.reason ?? message.params?.command ?? message.method);
      const terminal = createPrompt({ input: process.stdin, output: process.stderr });
      try {
        const answer = await terminal.question(`\nCodex requests approval: ${detail}\nApprove? [y/N] `);
        if (/^y(es)?$/i.test(answer.trim())) decision = "accept";
      } finally {
        terminal.close();
      }
    }
    this.process?.stdin.write(`${JSON.stringify({ id: message.id, result: { decision } })}\n`);
  }

  private notify(method: string, params: unknown) {
    this.process?.stdin.write(`${JSON.stringify({ method, params })}\n`);
  }

  private request<T>(method: string, params: unknown): Promise<T> {
    if (!this.process) return Promise.reject(new Error("Codex App Server is not running"));
    const id = this.nextId++;
    this.process.stdin.write(`${JSON.stringify({ method, id, params })}\n`);
    return new Promise<T>((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  async createThread(cwd: string) {
    await this.start();
    const result = await this.request<{ thread: { id: string } }>("thread/start", { cwd, serviceName: "pinhere" });
    return result.thread.id;
  }

  async runTurn(threadId: string, cwd: string, prompt: string, mode: AgentMode) {
    this.activeMode = mode;
    const result = await this.request<{ turn: { id: string } }>("turn/start", {
      threadId, cwd, input: [{ type: "text", text: prompt }], ...codexPolicy(mode)
    });
    const turnId = result.turn.id;
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.listeners.delete(listener);
        this.exitListeners.delete(onExit);
        if (error) reject(error); else resolve();
      };
      const listener = (event: RpcResult) => {
        if (event.method !== "turn/completed") return;
        const turn = event.params?.turn as { id?: string; status?: string; error?: { message?: string } } | undefined;
        if (turn?.id !== turnId) return;
        if (turn.error || turn.status === "failed") finish(new Error(turn.error?.message ?? "Codex turn failed"));
        else finish();
      };
      const onExit = (error: Error) => finish(error);
      const timeout = setTimeout(() => finish(new Error("Codex turn timed out after 2 hours")), 2 * 60 * 60_000);
      timeout.unref();
      this.listeners.add(listener);
      this.exitListeners.add(onExit);
    });
  }

  close() { this.process?.kill(); this.process = undefined; }
}
