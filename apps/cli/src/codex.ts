import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { createInterface as createPrompt } from "node:readline/promises";
import { codexLaunchEnvironment, launchFromEnvironment, resolveCodexLaunch, type CodexLaunch } from "./codex-launch.js";
import type { AgentMode } from "./config.js";

type RpcResult = { id?: number; result?: unknown; error?: { message?: string }; method?: string; params?: Record<string, unknown> };
type CodexTurn = { id?: string; status?: string; error?: { message?: string } };
type CodexHarnessOptions = {
  turnPollIntervalMs?: number;
  turnTimeoutMs?: number;
  turnReadFailureLimit?: number;
  onObservationError?: (error: Error, consecutiveFailures: number, failureLimit: number) => void;
};

function terminalTurnError(turn: CodexTurn) {
  if (turn.status === "failed") return new Error(turn.error?.message ?? "Codex turn failed");
  if (turn.status === "interrupted") return new Error(turn.error?.message ?? "Codex turn was interrupted");
  if (turn.status === "cancelled") return new Error(turn.error?.message ?? "Codex turn was cancelled");
  return undefined;
}

export function codexPolicy(mode: AgentMode) {
  if (mode === "yolo") return { approvalPolicy: "never", sandboxPolicy: { type: "dangerFullAccess" } } as const;
  if (mode === "workspace") return { approvalPolicy: "never", sandboxPolicy: { type: "workspaceWrite", networkAccess: true } } as const;
  return { approvalPolicy: "onRequest", sandboxPolicy: { type: "workspaceWrite", networkAccess: true } } as const;
}

export class CodexHarness {
  private process?: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();
  private listeners = new Set<(event: RpcResult) => void>();
  private exitListeners = new Set<(error: Error) => void>();
  private completedTurns = new Map<string, { status?: string; error?: { message?: string } }>();
  private activeMode: AgentMode = "yolo";

  constructor(
    private readonly configuredLaunch?: CodexLaunch,
    private readonly options: CodexHarnessOptions = {}
  ) {}

  async start() {
    if (this.process) return;
    const launch = this.configuredLaunch ?? launchFromEnvironment() ?? await resolveCodexLaunch();
    const child = spawn(launch.executable, ["app-server", "--listen", "stdio://"], {
      env: codexLaunchEnvironment(launch), stdio: ["pipe", "pipe", "pipe"]
    });
    this.process = child;
    createInterface({ input: child.stdout }).on("line", (line) => {
      let message: RpcResult;
      try { message = JSON.parse(line) as RpcResult; } catch { return; }
      if (typeof message.id === "number") {
        const waiter = this.pending.get(message.id);
        if (waiter) {
          this.pending.delete(message.id);
          clearTimeout(waiter.timer);
          if (message.error) waiter.reject(new Error(message.error.message ?? "Codex App Server request failed"));
          else waiter.resolve(message.result);
        } else if (message.method) {
          void this.handleServerRequest(message);
        }
      }
      if (message.method === "turn/completed") {
        const turn = message.params?.turn as { id?: string; status?: string; error?: { message?: string } } | undefined;
        if (turn?.id) this.completedTurns.set(turn.id, turn);
      }
      if (message.method) for (const listener of this.listeners) listener(message);
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr = `${stderr}${String(chunk)}`.slice(-8_000); });
    const failProcess = (error: Error) => {
      if (this.process !== child) return;
      this.process = undefined;
      for (const waiter of this.pending.values()) { clearTimeout(waiter.timer); waiter.reject(error); }
      for (const listener of this.exitListeners) listener(error);
      this.pending.clear(); this.listeners.clear(); this.exitListeners.clear();
    };
    child.stdin.on("error", (error) => {
      failProcess(new Error(`Codex App Server closed its input: ${error.message}`));
    });
    child.on("error", (error) => failProcess(new Error(`Codex App Server failed to start: ${error.message}`)));
    child.on("exit", (code) => {
      const error = new Error(`Codex App Server exited (${code ?? "signal"})${stderr ? `: ${stderr.trim()}` : ""}`);
      failProcess(error);
    });
    await this.request("initialize", { clientInfo: { name: "pinhere", title: "Pinhere", version: "0.2.5" } }, 10_000);
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

  private request<T>(method: string, params: unknown, timeoutMs = 30_000): Promise<T> {
    if (!this.process) return Promise.reject(new Error("Codex App Server is not running"));
    const child = this.process;
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex App Server ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      timer.unref();
      this.pending.set(id, { resolve, reject, timer });
      child.stdin.write(`${JSON.stringify({ method, id, params })}\n`, (error) => {
        if (!error) return;
        const waiter = this.pending.get(id);
        if (!waiter) return;
        this.pending.delete(id);
        clearTimeout(waiter.timer);
        waiter.reject(new Error(`Codex App Server closed its input while sending ${method}: ${error.message}`));
      });
    });
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
    const alreadyCompleted = this.completedTurns.get(turnId);
    if (alreadyCompleted) {
      this.completedTurns.delete(turnId);
      const error = terminalTurnError(alreadyCompleted);
      if (error) throw error;
      return;
    }
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let pollInFlight = false;
      let consecutiveReadFailures = 0;
      const readFailureLimit = Math.max(1, this.options.turnReadFailureLimit ?? 3);
      const recordObservationFailure = (cause: unknown) => {
        const error = cause instanceof Error ? cause : new Error(String(cause));
        consecutiveReadFailures += 1;
        this.options.onObservationError?.(error, consecutiveReadFailures, readFailureLimit);
        if (consecutiveReadFailures >= readFailureLimit) {
          finish(new Error(`Codex App Server thread/read failed ${consecutiveReadFailures} consecutive times: ${error.message}`));
        }
      };
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearInterval(pollTimer);
        clearTimeout(timeoutTimer);
        this.listeners.delete(listener);
        this.exitListeners.delete(onExit);
        if (error) reject(error); else resolve();
      };
      const observe = (turn: CodexTurn | undefined) => {
        if (!turn || turn.id !== turnId || !["completed", "interrupted", "failed", "cancelled"].includes(turn.status ?? "")) return;
        finish(terminalTurnError(turn));
      };
      const listener = (event: RpcResult) => {
        if (event.method !== "turn/completed") return;
        observe(event.params?.turn as CodexTurn | undefined);
      };
      const onExit = (error: Error) => finish(error);
      const pollTimer = setInterval(() => {
        if (pollInFlight || settled) return;
        pollInFlight = true;
        void this.request<{ thread?: { turns?: CodexTurn[] } }>(
          "thread/read",
          { threadId, includeTurns: true },
          10_000
        ).then((read) => {
          const turn = read.thread?.turns?.find((candidate) => candidate.id === turnId);
          if (!turn) {
            recordObservationFailure(new Error(`turn ${turnId} was missing from thread ${threadId}`));
            return;
          }
          consecutiveReadFailures = 0;
          observe(turn);
        })
          .catch(recordObservationFailure)
          .finally(() => { pollInFlight = false; });
      }, this.options.turnPollIntervalMs ?? 5_000);
      pollTimer.unref();
      const timeoutMs = this.options.turnTimeoutMs ?? 2 * 60 * 60_000;
      const timeoutTimer = setTimeout(() => finish(new Error(`Codex turn timed out after ${Math.round(timeoutMs / 60_000)} minutes`)), timeoutMs);
      timeoutTimer.unref();
      this.listeners.add(listener);
      this.exitListeners.add(onExit);
    });
  }

  close() {
    const child = this.process;
    this.process = undefined;
    child?.kill();
    for (const waiter of this.pending.values()) { clearTimeout(waiter.timer); waiter.reject(new Error("Codex App Server closed")); }
    this.pending.clear(); this.listeners.clear(); this.exitListeners.clear(); this.completedTurns.clear();
  }
}
