import { StarterProject } from "@/types";

export const STARTER_PROJECTS: Record<string, StarterProject> = {
  "shopping-list": {
    id: "shopping-list",
    title: { is: "Búðarlisti", en: "Shopping List" },
    description: { 
      is: "Einfalt smáforrit til að halda utan um innkaupin. Gott byrjendaverkefni.", 
      en: "A simple app to keep track of groceries. Great for beginners." 
    },
    difficulty: "easy",
    tags: ["frontend", "state", "components"],
    steps: [
      {
        id: "step_1",
        title: { is: "Uppsetning viðmóts", en: "UI Setup" },
        status: "pending",
        concepts: ["components"],
        geminiPrompt: "Create a basic shopping list UI component with an input field and an 'Add' button.",
        expectedFiles: ["src/app/page.tsx", "src/components/ShoppingList.tsx"],
        validationCriteria: "Should render an input and a button."
      },
      {
        id: "step_2",
        title: { is: "Bæta við hlutum", en: "Adding Items" },
        status: "pending",
        concepts: ["state"],
        geminiPrompt: "Add React useState to the ShoppingList to manage the list of items. Make the Add button work.",
        expectedFiles: ["src/components/ShoppingList.tsx"],
        validationCriteria: "Should be able to add an item to the list."
      },
      {
        id: "step_3",
        title: { is: "Eyða hlutum", en: "Deleting Items" },
        status: "pending",
        concepts: ["state", "events"],
        geminiPrompt: "Add a delete button to each item in the shopping list to remove it from the state.",
        expectedFiles: ["src/components/ShoppingList.tsx"],
        validationCriteria: "Should be able to delete an item."
      }
    ]
  },
  "booking-form": {
    id: "booking-form",
    title: { is: "Bókunarform", en: "Booking Form" },
    description: { 
      is: "Samskiptaform með staðfestingu í tölvupósti.", 
      en: "Contact form with email confirmation." 
    },
    difficulty: "medium",
    tags: ["frontend", "backend", "forms"],
    steps: [
      {
        id: "step_1",
        title: { is: "Hanna formið", en: "Design the Form" },
        status: "pending",
        concepts: ["forms", "components"],
        geminiPrompt: "Create a booking form with Name, Date, and Email fields.",
        expectedFiles: ["src/components/BookingForm.tsx"],
        validationCriteria: "Form fields should exist."
      },
      {
        id: "step_2",
        title: { is: "API Tenging", en: "API Route" },
        status: "pending",
        concepts: ["api", "backend"],
        geminiPrompt: "Create a Next.js API route to receive the form data and mock sending an email.",
        expectedFiles: ["src/app/api/book/route.ts", "src/components/BookingForm.tsx"],
        validationCriteria: "Form should submit to the API route without refreshing."
      }
    ]
  },
  "event-page": {
    id: "event-page",
    title: { is: "Atburðasíða", en: "Event Page" },
    description: { 
      is: "Lendingarsíða fyrir viðburð með skráningu gesta.", 
      en: "Event landing page with attendee registration." 
    },
    difficulty: "medium",
    tags: ["frontend", "database", "routing"],
    steps: [
      {
        id: "step_1",
        title: { is: "Lendingarsíða", en: "Landing Page" },
        status: "pending",
        concepts: ["components", "styling"],
        geminiPrompt: "Create a beautiful hero section for an upcoming event with a 'Register Now' CTA.",
        expectedFiles: ["src/app/page.tsx"],
        validationCriteria: "Hero section and CTA button present."
      },
      {
        id: "step_2",
        title: { is: "Skráningargagnagrunnur", en: "Registration Database" },
        status: "pending",
        concepts: ["database", "api"],
        geminiPrompt: "Create an API route that accepts a registration (name, email) and saves it to a mock database array.",
        expectedFiles: ["src/app/api/register/route.ts"],
        validationCriteria: "API route successfully stores mock registration."
      }
    ]
  }
};
