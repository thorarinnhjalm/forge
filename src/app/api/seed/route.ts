import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/firebaseAdmin";
import { StarterProject } from "@/types";

export async function GET() {
  try {
    const project: StarterProject = {
      id: "shopping-list",
      title: { is: "Búðarlisti", en: "Shopping List" },
      description: { is: "Einfalt smáforrit með React state.", en: "Simple app with React state." },
      difficulty: "easy",
      tags: ["frontend", "state", "react"],
      steps: [
        {
          id: "step1",
          title: { is: "Uppsetning viðmóts", en: "UI Setup" },
          status: "pending",
          concepts: ["components"],
          geminiPrompt: "Create a basic shopping list UI component in pages/index.tsx. It should have an input field for adding items, a button to add, and a list to display items. Just the UI structure, no state logic yet.",
          expectedFiles: ["pages/index.tsx"],
          validationCriteria: "Should render an input, a button, and a list."
        },
        {
          id: "step2",
          title: { is: "Bæta við State", en: "Adding State" },
          status: "pending",
          concepts: ["state", "hooks"],
          geminiPrompt: "Update pages/index.tsx to use useState hook to manage the list of items. When the add button is clicked, append the input value to the list. Clear the input field after adding.",
          expectedFiles: ["pages/index.tsx"],
          validationCriteria: "Should be able to add items to the list dynamically."
        }
      ]
    };

    await adminDb.collection("forge_projects").doc(project.id).set(project);

    return NextResponse.json({ success: true, message: "Database seeded successfully!" });
  } catch (error) {
    console.error("[seed] Error seeding database", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
