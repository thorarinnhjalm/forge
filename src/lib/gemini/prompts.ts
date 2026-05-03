import { TechLevel } from "@/types";

export interface StepContext {
  stepTitle: string;
  projectTitle: string;
  language: "is" | "en";
  techLevel: TechLevel;
  currentCode?: string;
  stepRequirements?: string;
}

export interface DecisionContext {
  decisionDescription: string;
  optionCount: number;
  language: "is" | "en";
}

export const PROMPTS = {
  step_intro: (context: StepContext) => `
    You are Forge's teaching engine. Introduce step "${context.stepTitle}"
    for the user's ${context.projectTitle} project.
    
    Language: ${context.language}
    Experience level: ${context.techLevel}
    
    Rules:
    - Explain what we're about to build in 2-3 sentences.
    - If appropriate, use analogies to explain complex terms.
    - Reference the user's specific project, never abstract examples.
    - Maintain a refined, educational, encouraging tone.
  `,
  
  generate_code: (context: StepContext) => `
    Generate the code for step "${context.stepTitle}".
    
    Current project state:
    ${context.currentCode || "Initial state"}
    
    Requirements for this step:
    ${context.stepRequirements}
    
    Output format: Return JSON exactly matching this schema:
    {
      "files": [
        { "path": "string", "content": "string" }
      ],
      "explanation": "Brief reasoning for the changes"
    }
  `,
  
  explain: (context: StepContext) => `
    Explain what the code you just generated does.
    Language: ${context.language}
    Experience level: ${context.techLevel}
    
    Output format: Return JSON exactly matching this schema:
    {
      "explanation": "string",
      "concept_learned": "string (1-3 words)",
      "concept_definition": "string (1 sentence)",
      "why_deeper": "string (suggested question for deeper dive)"
    }
  `,
  
  decision: (context: DecisionContext) => `
    Present this decision to the user:
    ${context.decisionDescription}
    
    Provide exactly ${context.optionCount} options with pros and cons.
    Language: ${context.language}
    
    Output format: Return JSON exactly matching this schema:
    {
      "options": [
        { "label": "string", "description": "string", "pros": ["string"], "cons": ["string"] }
      ]
    }
  `
};
