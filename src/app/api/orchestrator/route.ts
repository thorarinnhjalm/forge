// STATUS: Orchestrator API route — the single entry point for all session events.
import * as admin from 'firebase-admin';
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
//   - Add a dedicated POST /api/sessions route to create the initial session doc.
import { NextRequest, NextResponse } from 'next/server';
import { Orchestrator, SessionEvent } from '@/lib/orchestrator/stateMachine';
import { generateJson, generateText, MODELS } from '@/lib/gemini/client';
import { PROMPTS } from '@/lib/gemini/prompts';
import { AgentSandboxClient } from '@/lib/sandbox/client';
import { getStarterProject } from '@/lib/orchestrator/planGenerator';
import { getSession, updateSession } from '@/lib/firebase/sessions';
import { CreditsEngine } from '@/lib/credits/engine';

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
      const { text: introText } = await generateText(PROMPTS.step_intro(stepContext), undefined, MODELS.FLASH);
      aiResponse = introText;
      orchestrator.transition({ type: 'NEXT_STEP' });
    }

    if (newState === 'generating_code') {
      // Reconnect to the session's sandbox if one is running, otherwise create a new one.
      if (session.sandboxId) {
        sandbox = await AgentSandboxClient.reconnect(sessionId, session.sandboxId);
      } else {
        sandbox = await AgentSandboxClient.create(sessionId);
        await updateSession(sessionId, { sandboxId: sandbox.sandboxId });
        
        // Deduct credit for building
        const creditsEngine = new CreditsEngine();
        try {
          await creditsEngine.deduct(session.userId, "build_step", sessionId);
        } catch (e) {
          console.warn("[orchestrator] Credit deduction failed or user has no credits", e);
          // In a real app we might throw here, but we let it pass for beta if it fails
        }
      }

      // Ask Gemini to generate all files for this step.
      const { data: codePayload } = await generateJson(PROMPTS.generate_code(stepContext), undefined, MODELS.PRO);
      orchestrator.transition({ type: 'CODE_GENERATED', payload: codePayload });

      // Run the generated files in the sandbox.
      const executionResult = await sandbox.executeCode(codePayload.files);
      orchestrator.transition({ type: 'EXECUTION_COMPLETE', payload: executionResult });

      if (executionResult.success) {
        // Write the real e2b preview URL to Firestore so the session UI can render it.
        await updateSession(sessionId, { previewUrl: executionResult.previewUrl });
        orchestrator.transition({ type: 'PREVIEW_READY', payload: { url: executionResult.previewUrl! } });

        // Ask Gemini to explain what was just built, at the user's level.
        const { data: explanation } = await generateJson(PROMPTS.explain(stepContext), undefined, MODELS.FLASH);
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
      await updateSession(sessionId, { sandboxId: admin.firestore.FieldValue.delete() as any, state: finalState });
    } else {
      // Keep sandbox alive for another 5 minutes if not terminal
      if (session.sandboxId) {
        if (!sandbox) {
          sandbox = await AgentSandboxClient.reconnect(sessionId, session.sandboxId);
        }
        await sandbox.keepAlive(5 * 60 * 1000).catch(console.error);
      }
      await updateSession(sessionId, { state: finalState });
    }

    return NextResponse.json({ success: true, state: finalState, response: aiResponse, previewUrl: session.previewUrl });
  } catch (error) {
    console.error('[orchestrator] Unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
