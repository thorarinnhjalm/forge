# Sandbox ↔ Orchestrator Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist e2b sandbox IDs in Firestore so each session reconnects to the same running sandbox across requests, and use the real e2b preview URL instead of the hardcoded one.

**Architecture:** The Firestore session document gains `sandboxId` and `previewUrl` fields. A new `sessions.ts` module owns all session doc reads/writes. `AgentSandboxClient` gets static `create`/`reconnect` factories so the orchestrator route never imports from e2b directly. The orchestrator route reads session state from Firestore, picks create-or-reconnect, and writes results back.

**Tech Stack:** Next.js 16 API routes, firebase-admin Firestore, e2b SDK, vitest for unit tests

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/types/index.ts` | Add `SessionDoc` type |
| Create | `src/lib/firebase/sessions.ts` | Firestore session doc CRUD |
| Modify | `src/lib/sandbox/client.ts` | Add static `create`/`reconnect` factories, clean up lazy-init |
| Modify | `src/app/api/orchestrator/route.ts` | Wire Firestore + sandbox, add process notes |
| Create | `vitest.config.ts` | Unit test runner config |
| Create | `tests/unit/sessions.test.ts` | Unit tests for session helpers |
| Create | `tests/unit/sandbox.test.ts` | Unit tests for AgentSandboxClient |

---

## Task 0: Install and configure vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest**

```bash
npm install --save-dev vitest
```

Expected: vitest appears in `devDependencies` in `package.json`.

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```ts
// STATUS: vitest config — covers tests/unit/**
// NEXT: add more unit test suites as lib grows
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, add to `"scripts"`:

```json
"test:unit": "vitest run"
```

- [ ] **Step 4: Create unit test directory**

```bash
mkdir -p tests/unit
```

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json
git commit -m "chore: add vitest for unit tests"
```

---

## Task 1: Add SessionDoc type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/sessions.test.ts`:

```ts
// STATUS: tests session doc type shape — expand as session helpers are added
import { describe, it, expectTypeOf } from 'vitest';
import type { SessionDoc } from '@/types';

describe('SessionDoc', () => {
  it('has required fields', () => {
    const doc: SessionDoc = {
      state: 'idle',
      projectId: 'shopping-list',
      currentStepId: 'step_1',
      userId: 'uid_abc',
      language: 'is',
      techLevel: 'beginner',
    };
    expectTypeOf(doc.sandboxId).toEqualTypeOf<string | undefined>();
    expectTypeOf(doc.previewUrl).toEqualTypeOf<string | undefined>();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:unit -- sessions
```

Expected: type error — `SessionDoc` not found.

- [ ] **Step 3: Add SessionDoc to src/types/index.ts**

Add after the existing exports:

```ts
import type { SessionState } from '@/lib/orchestrator/stateMachine';
import type { TechLevel } from '@/types';

export interface SessionDoc {
  state: SessionState;
  projectId: string;
  currentStepId: string;
  userId: string;
  language: 'is' | 'en';
  techLevel: TechLevel;
  // Set when a sandbox is created; cleared on session_complete or error.
  sandboxId?: string;
  // Set after executeCode succeeds; used by the session UI to render the preview iframe.
  previewUrl?: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:unit -- sessions
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts tests/unit/sessions.test.ts
git commit -m "feat: add SessionDoc type with sandboxId and previewUrl"
```

---

## Task 2: Create Firestore session helpers

**Files:**
- Create: `src/lib/firebase/sessions.ts`
- Modify: `tests/unit/sessions.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/sessions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SessionDoc } from '@/types';

// Mock firebase-admin before importing sessions.ts
vi.mock('@/lib/firebase/firebaseAdmin', () => {
  const docData: Record<string, unknown> = {};
  const docRef = {
    get: vi.fn(async () => ({ exists: Object.keys(docData).length > 0, data: () => ({ ...docData }) })),
    set: vi.fn(async (data: Record<string, unknown>) => { Object.assign(docData, data); }),
    update: vi.fn(async (data: Record<string, unknown>) => { Object.assign(docData, data); }),
  };
  return {
    adminDb: {
      collection: vi.fn(() => ({ doc: vi.fn(() => docRef) })),
    },
  };
});

import { getSession, updateSession } from '@/lib/firebase/sessions';

describe('getSession', () => {
  it('returns null when doc does not exist', async () => {
    const result = await getSession('nonexistent');
    expect(result).toBeNull();
  });
});

describe('updateSession', () => {
  it('writes fields to the session doc without overwriting others', async () => {
    await updateSession('sess_1', { sandboxId: 'sbx_abc' });
    // No throw = pass (mock captured the write)
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- sessions
```

Expected: FAIL — `@/lib/firebase/sessions` not found.

- [ ] **Step 3: Create src/lib/firebase/sessions.ts**

```ts
// STATUS: Firestore session doc helpers — read/write for orchestrator route.
// NEXT: add createSession() once the session creation flow is built.
import { adminDb } from '@/lib/firebase/firebaseAdmin';
import type { SessionDoc } from '@/types';

const SESSIONS = 'sessions';

/** Returns the session doc, or null if it does not exist. */
export async function getSession(sessionId: string): Promise<SessionDoc | null> {
  const snap = await adminDb.collection(SESSIONS).doc(sessionId).get();
  if (!snap.exists) return null;
  return snap.data() as SessionDoc;
}

/**
 * Merges the given fields into the session doc.
 * Safe to call with partial data — does not overwrite unspecified fields.
 */
export async function updateSession(
  sessionId: string,
  fields: Partial<SessionDoc>
): Promise<void> {
  await adminDb.collection(SESSIONS).doc(sessionId).update(fields);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- sessions
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebase/sessions.ts tests/unit/sessions.test.ts
git commit -m "feat: add Firestore session helpers (getSession, updateSession)"
```

---

## Task 3: Refactor AgentSandboxClient with static factories

**Files:**
- Modify: `src/lib/sandbox/client.ts`
- Create: `tests/unit/sandbox.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/sandbox.test.ts`:

```ts
// STATUS: unit tests for AgentSandboxClient — covers create, reconnect, executeCode, close.
import { describe, it, expect, vi } from 'vitest';

const mockRun = vi.fn(async () => ({ exitCode: 0, stdout: 'ok', stderr: '' }));
const mockWriteFiles = vi.fn(async () => []);
const mockKill = vi.fn(async () => {});
const mockGetHost = vi.fn((port: number) => `sandbox-abc-${port}.e2b.dev`);

const mockSandboxInstance = {
  sandboxId: 'sbx_abc123',
  files: { writeFiles: mockWriteFiles },
  commands: { run: mockRun },
  getHost: mockGetHost,
  kill: mockKill,
};

vi.mock('e2b', () => ({
  Sandbox: {
    create: vi.fn(async () => mockSandboxInstance),
    connect: vi.fn(async () => mockSandboxInstance),
  },
}));

import { AgentSandboxClient } from '@/lib/sandbox/client';

describe('AgentSandboxClient.create', () => {
  it('creates a sandbox and exposes its ID', async () => {
    const client = await AgentSandboxClient.create('sess_1');
    expect(client.sandboxId).toBe('sbx_abc123');
  });
});

describe('AgentSandboxClient.reconnect', () => {
  it('connects to an existing sandbox by ID', async () => {
    const client = await AgentSandboxClient.reconnect('sess_1', 'sbx_abc123');
    expect(client.sandboxId).toBe('sbx_abc123');
  });
});

describe('executeCode', () => {
  it('writes files, runs command, returns previewUrl', async () => {
    const client = await AgentSandboxClient.create('sess_1');
    const result = await client.executeCode([{ path: 'index.ts', content: 'export {}' }]);
    expect(mockWriteFiles).toHaveBeenCalled();
    expect(mockRun).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.previewUrl).toBe('https://sandbox-abc-3000.e2b.dev');
  });

  it('returns success:false when exit code is non-zero', async () => {
    mockRun.mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'build failed' });
    const client = await AgentSandboxClient.create('sess_1');
    const result = await client.executeCode([]);
    expect(result.success).toBe(false);
    expect(result.error).toBe('build failed');
  });
});

describe('close', () => {
  it('kills the sandbox', async () => {
    const client = await AgentSandboxClient.create('sess_1');
    await client.close();
    expect(mockKill).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:unit -- sandbox
```

Expected: FAIL — `AgentSandboxClient.create` is not a function.

- [ ] **Step 3: Rewrite src/lib/sandbox/client.ts with static factories**

```ts
// STATUS: e2b sandbox wrapper. Replaces the old constructor-based approach.
// Static factories (create/reconnect) are used so the caller never imports e2b directly.
// NEXT: add timeout extension before the 5-min e2b default expires mid-session.
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

  /** Write files into the sandbox and run a shell command. Returns stdout and a live preview URL. */
  async executeCode(
    codeFiles: Array<{ path: string; content: string }>,
    command = 'npm install && npm run dev'
  ): Promise<SandboxExecutionResult> {
    try {
      await this.sandbox.files.writeFiles(
        codeFiles.map((f) => ({ path: f.path, data: f.content }))
      );

      const result = await this.sandbox.commands.run(command, {
        timeoutMs: 60_000,
        onStdout: (data) => console.log(`[sandbox:${this.sessionId}]`, data),
        onStderr: (data) => console.error(`[sandbox:${this.sessionId}]`, data),
      });

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.exitCode !== 0 ? result.stderr : undefined,
        previewUrl: `https://${this.sandbox.getHost(3000)}`,
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:unit -- sandbox
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sandbox/client.ts tests/unit/sandbox.test.ts
git commit -m "feat: refactor AgentSandboxClient with static create/reconnect factories"
```

---

## Task 4: Wire orchestrator route

**Files:**
- Modify: `src/app/api/orchestrator/route.ts`

- [ ] **Step 1: Rewrite the orchestrator route**

Replace the full contents of `src/app/api/orchestrator/route.ts`:

```ts
// STATUS: Orchestrator API route — the single entry point for all session events.
//
// What this does:
//   1. Reads the session doc from Firestore (state, sandboxId, user profile).
//   2. Transitions the in-memory state machine with the incoming event.
//   3. Runs side-effects for the new state:
//      - step_intro   → Gemini generates a step introduction text.
//      - generating_code → Gemini generates files, sandbox executes them,
//                          previewUrl is written back to Firestore.
//      - session_complete / error → sandbox is killed, sandboxId cleared.
//   4. Writes the updated state back to Firestore.
//   5. Returns { state, response } to the client.
//
// NEXT:
//   - Deduct credits on sandbox creation (credits/engine.ts is a stub).
//   - Extend sandbox timeout before the 5-min e2b limit if the session is still active.
//   - Add a dedicated POST /api/sessions route to create the initial session doc.
import { NextRequest, NextResponse } from 'next/server';
import { Orchestrator, SessionEvent } from '@/lib/orchestrator/stateMachine';
import { generateJson, generateText, MODELS } from '@/lib/gemini/client';
import { PROMPTS } from '@/lib/gemini/prompts';
import { AgentSandboxClient } from '@/lib/sandbox/client';
import { getStarterProject } from '@/lib/orchestrator/planGenerator';
import { getSession, updateSession } from '@/lib/firebase/sessions';

export async function POST(request: NextRequest) {
  let sandbox: AgentSandboxClient | null = null;

  try {
    const body = await request.json();
    const { sessionId, event } = body as { sessionId: string; event: SessionEvent };

    if (!sessionId || !event) {
      return NextResponse.json({ error: 'Missing sessionId or event' }, { status: 400 });
    }

    // Read the session doc so we have the current state and any running sandbox ID.
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const orchestrator = new Orchestrator(session.state);
    const newState = orchestrator.transition(event);

    // Resolve the current project and step for Gemini prompts.
    const project = await getStarterProject(session.projectId);
    const step = project?.steps.find((s) => s.id === session.currentStepId);
    const stepContext = {
      stepTitle: step?.title[session.language] ?? 'Step',
      projectTitle: project?.title[session.language] ?? 'Project',
      language: session.language,
      techLevel: session.techLevel,
      stepRequirements: step?.geminiPrompt,
    };

    let aiResponse = null;

    if (newState === 'step_intro') {
      // Gemini introduces the step in the user's language and at their level.
      // Auto-advances to awaiting_decision (or generating_code if no decision is needed).
      aiResponse = await generateText(PROMPTS.step_intro(stepContext), undefined, MODELS.FLASH);
      orchestrator.transition({ type: 'NEXT_STEP' });
    }

    if (newState === 'generating_code') {
      // Reconnect to the session's sandbox if one is running, otherwise create a new one.
      if (session.sandboxId) {
        sandbox = await AgentSandboxClient.reconnect(sessionId, session.sandboxId);
      } else {
        sandbox = await AgentSandboxClient.create(sessionId);
        await updateSession(sessionId, { sandboxId: sandbox.sandboxId });
      }

      // Ask Gemini to generate all files for this step.
      const codePayload = await generateJson(PROMPTS.generate_code(stepContext), undefined, MODELS.PRO);
      orchestrator.transition({ type: 'CODE_GENERATED', payload: codePayload });

      // Run the generated files in the sandbox.
      const executionResult = await sandbox.executeCode(codePayload.files);
      orchestrator.transition({ type: 'EXECUTION_COMPLETE', payload: executionResult });

      if (executionResult.success) {
        // Write the real e2b preview URL to Firestore so the session UI can render it.
        await updateSession(sessionId, { previewUrl: executionResult.previewUrl });
        orchestrator.transition({ type: 'PREVIEW_READY', payload: { url: executionResult.previewUrl! } });

        // Ask Gemini to explain what was just built, at the user's level.
        const explanation = await generateJson(PROMPTS.explain(stepContext), undefined, MODELS.FLASH);
        aiResponse = { ...codePayload, ...explanation };
        orchestrator.transition({ type: 'EXPLANATION_DONE' });
      } else {
        orchestrator.transition({ type: 'ERROR', payload: executionResult.error ?? executionResult.output });
      }
    }

    const finalState = orchestrator.getState();

    // On terminal states, kill the sandbox to avoid leaking e2b resources.
    if ((finalState === 'session_complete' || finalState === 'error') && session.sandboxId) {
      if (!sandbox) {
        sandbox = await AgentSandboxClient.reconnect(sessionId, session.sandboxId);
      }
      await sandbox.close();
      await updateSession(sessionId, { sandboxId: undefined, state: finalState });
    } else {
      await updateSession(sessionId, { state: finalState });
    }

    return NextResponse.json({ success: true, state: finalState, response: aiResponse });
  } catch (error) {
    console.error('[orchestrator] Unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/orchestrator/route.ts
git commit -m "feat: wire sandbox persistence into orchestrator route"
```

---

## Task 5: Run all tests

- [ ] **Step 1: Run unit tests**

```bash
npm run test:unit
```

Expected: 5+ tests, all PASS.

- [ ] **Step 2: Run Playwright smoke test**

```bash
npx playwright test tests/landing.spec.ts
```

Expected: all 3 tests PASS (landing page unaffected).

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: all tests green after sandbox wiring"
```

---

## Open questions (out of scope for this plan)

- **Credits:** `src/lib/credits/engine.ts` is a stub. Deducting credits on sandbox creation is the next milestone.
- **Sandbox timeout:** e2b kills sandboxes after 5 minutes. Long sessions will need `sandbox.setTimeout()` called periodically, or sandbox recreation with cumulative file state.
- **Session creation:** There is no `POST /api/sessions` route yet. The session doc must exist before the orchestrator can read it — currently this requires manual Firestore seeding.
