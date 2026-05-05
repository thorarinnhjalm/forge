// STATUS: shared domain types for Forge. SessionDoc added for Firestore session persistence.
// NEXT: add ProjectSession type once session creation flow is built.

import type { SessionState } from '@/lib/orchestrator/stateMachine';

export type TechLevel = "beginner" | "intermediate" | "comfortable";

export type UserPlan = "free" | "pro";

export interface UserCredits {
  balance: number;
  allocated: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  techLevel: TechLevel;
  language: "is" | "en";
  plan: UserPlan;
  createdAt: Date;
  credits: UserCredits;
}

export interface StarterProject {
  id: string;
  title: { is: string; en: string };
  description: { is: string; en: string };
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  steps: ProjectStep[];
}

export interface ProjectStep {
  id: string;
  title: { is: string; en: string };
  status: "pending" | "in_progress" | "completed";
  concepts: string[];
  decision?: {
    question: { is: string; en: string };
    options: { label: string; description: string }[];
  };
  geminiPrompt: string;
  expectedFiles: string[];
  validationCriteria: string;
}

export interface SessionDoc {
  state: SessionState;
  projectId: string;
  currentStepId: string;
  userId: string;
  language: "is" | "en";
  techLevel: TechLevel;
  // Set when a sandbox is created; cleared on session_complete or error.
  sandboxId?: string;
  // Set after executeCode succeeds; used by the session UI to render the preview iframe.
  previewUrl?: string;
}
