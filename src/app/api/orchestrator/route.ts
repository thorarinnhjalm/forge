import { NextRequest, NextResponse } from 'next/server';
import { Orchestrator, SessionEvent } from '@/lib/orchestrator/stateMachine';
import { generateJson, generateText, MODELS } from '@/lib/gemini/client';
import { PROMPTS } from '@/lib/gemini/prompts';
import { AgentSandboxClient } from '@/lib/sandbox/client';
import { getStarterProject } from '@/lib/orchestrator/planGenerator';

// In a real app, you would retrieve the state from Firestore.
// We'll use a simple transient orchestrator here for the MVP skeleton.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, event, projectId, currentStepId, currentState } = body as { 
      sessionId: string, 
      event: SessionEvent, 
      projectId: string,
      currentStepId: string,
      currentState: any
    };

    if (!sessionId || !event) {
      return NextResponse.json({ error: 'Missing sessionId or event' }, { status: 400 });
    }

    const orchestrator = new Orchestrator(currentState || 'idle');
    const newState = orchestrator.transition(event);
    
    // Process side-effects based on new state
    let aiResponse = null;
    const project = await getStarterProject(projectId);
    const stepContext = {
      stepTitle: project?.steps.find(s => s.id === currentStepId)?.title.en || 'Step',
      projectTitle: project?.title.en || 'Project',
      language: 'is' as 'is' | 'en', // Should come from user profile
      techLevel: 'beginner' as 'beginner', // Should come from user profile
      stepRequirements: project?.steps.find(s => s.id === currentStepId)?.geminiPrompt
    };

    if (newState === 'step_intro') {
      const prompt = PROMPTS.step_intro(stepContext);
      aiResponse = await generateText(prompt, undefined, MODELS.FLASH);
      // Immediately transition to next state if no decision
      orchestrator.transition({ type: "NEXT_STEP" });
    } 
    else if (newState === 'generating_code') {
      const prompt = PROMPTS.generate_code(stepContext);
      aiResponse = await generateJson(prompt, undefined, MODELS.PRO); // {"files": [...], "explanation": "..."}
      
      // We automatically fire the CODE_GENERATED event to transition
      orchestrator.transition({ type: "CODE_GENERATED", payload: aiResponse });
      
      // Execute in sandbox
      const sandbox = new AgentSandboxClient(sessionId);
      const executionResult = await sandbox.executeCode(aiResponse.files);
      
      orchestrator.transition({ type: "EXECUTION_COMPLETE", payload: executionResult });
      
      if (executionResult.success) {
        orchestrator.transition({ type: "PREVIEW_READY", payload: { url: `https://preview-${sessionId}.forge.is` } });
        
        // Now explain
        const explainPrompt = PROMPTS.explain(stepContext);
        const explanation = await generateJson(explainPrompt, undefined, MODELS.FLASH);
        aiResponse = { ...aiResponse, ...explanation };
        
        orchestrator.transition({ type: "EXPLANATION_DONE" });
      } else {
        orchestrator.transition({ type: "ERROR", payload: executionResult.output });
      }
    }

    return NextResponse.json({ 
      success: true, 
      state: orchestrator.getState(),
      response: aiResponse 
    }, { status: 200 });

  } catch (error) {
    console.error('Orchestrator error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
