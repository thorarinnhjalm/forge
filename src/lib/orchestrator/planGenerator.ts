import { StarterProject, ProjectStep } from "@/types";

// In a real app, these would be fetched from Firestore.
// For now, we mock the starter projects.
export const getStarterProject = async (projectId: string): Promise<StarterProject | null> => {
  // Placeholder implementation
  if (projectId === "shopping-list") {
    return {
      id: "shopping-list",
      title: { is: "Búðarlisti", en: "Shopping List" },
      description: { is: "Einfalt smáforrit.", en: "Simple app." },
      difficulty: "easy",
      tags: ["frontend", "state"],
      steps: [
        {
          id: "step_1",
          title: { is: "Uppsetning viðmóts", en: "UI Setup" },
          status: "pending",
          concepts: ["components"],
          geminiPrompt: "Create a basic shopping list UI component.",
          expectedFiles: ["components/ShoppingList.tsx"],
          validationCriteria: "Should render an input and a list."
        }
      ]
    };
  }
  return null;
};
