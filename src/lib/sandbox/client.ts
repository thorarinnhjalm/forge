// STATUS: e2b sandbox wrapper. Replaces the old constructor-based approach.
// Static factories (create/reconnect) are used so the caller never imports e2b directly.
// NEXT: add a cleanup cron for orphaned sandboxes.
import { Sandbox } from 'e2b';

export interface SandboxExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  filesChanged?: Array<{ path: string; content: string }>;
  previewUrl?: string;
}

export class AgentSandboxClient {
  private constructor(
    private readonly sessionId: string,
    private readonly sandbox: Sandbox
  ) {}

  /** Spin up a brand-new e2b sandbox for this session. */
  static async create(sessionId: string): Promise<AgentSandboxClient> {
    const sandbox = await Sandbox.create({
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: 5 * 60 * 1000,
      metadata: { sessionId },
    });
    return new AgentSandboxClient(sessionId, sandbox);
  }

  /** Reconnect to a sandbox that is already running (ID stored in Firestore). */
  static async reconnect(sessionId: string, sandboxId: string): Promise<AgentSandboxClient> {
    const sandbox = await Sandbox.connect(sandboxId, {
      apiKey: process.env.E2B_API_KEY,
    });
    return new AgentSandboxClient(sessionId, sandbox);
  }

  /** The e2b sandbox ID — store this in Firestore after create(). */
  get sandboxId(): string {
    return this.sandbox.sandboxId;
  }

  /** Extend the sandbox timeout to prevent it from shutting down. */
  async keepAlive(timeoutMs: number = 5 * 60 * 1000): Promise<void> {
    await this.sandbox.setTimeout(timeoutMs);
  }

  /** Write files into the sandbox and run a shell command. Returns stdout and a live preview URL. */
  async executeCode(
    codeFiles: Array<{ path: string; content: string }>,
  ): Promise<SandboxExecutionResult> {
    try {
      // Write all generated files
      await this.sandbox.files.writeFiles(
        codeFiles.map((f) => ({ path: f.path, data: f.content }))
      );

      // Check if it's a Node.js project
      const hasPackageJson = codeFiles.some((f) => f.path === 'package.json');

      if (hasPackageJson) {
        console.log(`[sandbox:${this.sessionId}] Detected package.json. Installing dependencies...`);
        const installProcess = await this.sandbox.commands.run('npm install');
        if (installProcess.error || installProcess.exitCode !== 0) {
          console.error(`[sandbox:${this.sessionId}] npm install failed:`, installProcess.stderr);
          // We will continue anyway to see if it still runs
        }

        console.log(`[sandbox:${this.sessionId}] Starting Node server...`);
        this.sandbox.commands.run('npm start', {
          timeoutMs: 300_000, // 5 min max
          onStdout: (data) => console.log(`[sandbox:${this.sessionId}]`, data),
          onStderr: (data) => console.error(`[sandbox:${this.sessionId}]`, data),
        }).catch(() => {}); // Fire and forget
      } else {
        console.log(`[sandbox:${this.sessionId}] Starting static python server...`);
        // Start simple python HTTP server in background (don't await - it runs forever)
        this.sandbox.commands.run('python3 -m http.server 3000', {
          timeoutMs: 300_000, // 5 min max
          onStdout: (data) => console.log(`[sandbox:${this.sessionId}]`, data),
          onStderr: (data) => console.error(`[sandbox:${this.sessionId}]`, data),
        }).catch(() => {}); // Fire and forget
      }

      // Give the server a moment to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const previewUrl = `https://${this.sandbox.getHost(3000)}`;
      console.log(`[sandbox:${this.sessionId}] Preview URL: ${previewUrl}`);

      return {
        success: true,
        output: 'Server started',
        previewUrl,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, output: '', error: message };
    }
  }

  /** Kill the sandbox. Call this on session_complete or error. */
  async close(): Promise<void> {
    await this.sandbox.kill();
  }
}
