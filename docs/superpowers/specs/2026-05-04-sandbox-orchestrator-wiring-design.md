# Sandbox ↔ Orchestrator Wiring Design

**Date:** 2026-05-04  
**Status:** Approved

## Problem

The orchestrator API route creates a new `AgentSandboxClient` on every POST request.
This means:
- No sandbox survives across steps — each step starts from a blank VM
- The preview URL is hardcoded (`https://preview-${sessionId}.forge.is`) instead of using the real e2b URL
- Sandboxes are never killed — they leak until e2b times them out

## Solution: Firestore-persisted sandbox ID (Approach A)

Store `sandboxId` on the Firestore session document. On each orchestrator request, reconnect to the running sandbox instead of creating a new one.

---

## Architecture

### Firestore session document

Add an optional `sandboxId` field to the session doc:

```
sessions/{sessionId}
  state: SessionState
  projectId: string
  currentStepId: string
  sandboxId?: string        ← new
  previewUrl?: string       ← new
```

### `AgentSandboxClient` (src/lib/sandbox/client.ts)

Add a static `reconnect(sandboxId)` factory that calls `Sandbox.connect()`.
Keep all e2b imports inside this file — the orchestrator route should not import from e2b directly.

New public surface:
- `AgentSandboxClient.create(sessionId)` — creates a fresh sandbox, same as current constructor
- `AgentSandboxClient.reconnect(sessionId, sandboxId)` — connects to an existing sandbox
- `client.executeCode(files, command)` → `SandboxExecutionResult` (unchanged, now includes real `previewUrl`)
- `client.sandboxId` — exposes the e2b sandbox ID for Firestore storage
- `client.close()` — kills the sandbox (unchanged)

### Orchestrator route (src/app/api/orchestrator/route.ts)

On every POST:
1. Read the session doc from Firestore to get current `state`, `sandboxId`, and user profile
2. Transition the state machine with the incoming event
3. On `generating_code`:
   - If `sandboxId` exists → `AgentSandboxClient.reconnect(sessionId, sandboxId)`
   - If not → `AgentSandboxClient.create(sessionId)`, write new `sandboxId` to Firestore
   - Run `executeCode()`, write real `previewUrl` to Firestore
4. On `session_complete` or `error`:
   - Call `client.close()` to kill the sandbox
   - Clear `sandboxId` from the Firestore session doc
5. Write updated state back to Firestore before returning

---

## Data flow

```
POST /api/orchestrator
  │
  ├─ Read session doc (Firestore)
  │    └─ has sandboxId? ─── yes ──► Sandbox.connect(sandboxId)
  │                      └─ no  ──► Sandbox.create() → write sandboxId
  │
  ├─ Transition state machine
  │
  ├─ generating_code
  │    ├─ Gemini: generate files
  │    ├─ sandbox.executeCode(files)
  │    │    └─ returns { success, output, previewUrl }
  │    └─ Write previewUrl to Firestore
  │
  ├─ session_complete / error
  │    ├─ sandbox.close()
  │    └─ Clear sandboxId from Firestore
  │
  └─ Write new state to Firestore → return response
```

---

## What is NOT changing

- State machine logic (`stateMachine.ts`) — untouched
- Gemini client and prompts — untouched
- Starter projects — untouched
- Auth flow — untouched

---

## Process notes convention

Each file will have a `// STATUS:` block at the top describing:
- What this file currently does
- What was changed and why
- What still needs to be done

---

## Open questions (next steps after this)

- Firestore session document schema needs a TypeScript type (`SessionDoc`)
- Credit deduction on sandbox creation is not yet wired
- Sandbox timeout handling (e2b kills after 5 min — need to extend or recreate)
