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
