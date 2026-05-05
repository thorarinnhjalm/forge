# Forge AI

Forge is an educational, conversational AI builder designed to help users learn to code by building real, functioning applications in a safe sandbox environment.

Unlike standard code generators that just output a finished product, Forge asks clarifying questions, presents technical decision points with pros and cons, and explains *why* the code was written a certain way.

## Architecture

- **Frontend:** Next.js (App Router), React, Tailwind CSS / Custom CSS.
- **AI Engine:** Google Gemini (via `@google/genai` SDK).
- **Sandbox Environment:** E2B (e2b.dev) for secure, isolated cloud sandboxes to run user code instantly.
- **Database & Auth:** Firebase (Firestore, Auth, Storage) for tracking user sessions, progress, and learning logs.

## Setup Instructions

To run Forge locally, you need the following environment variables in a `.env.local` file:

```env
# Gemini (Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key

# E2B (Sandboxes)
E2B_API_KEY=your_e2b_api_key

# Firebase Client config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=spark-15dfd
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin config (for backend routes)
FIREBASE_PROJECT_ID=spark-15dfd
FIREBASE_CLIENT_EMAIL=your_firebase_admin_client_email
FIREBASE_PRIVATE_KEY="your_private_key_with_newlines"
```

### Running Locally

```bash
npm install
npm run dev
```
Open `http://localhost:3000/is/freeform` to start building!

## Vercel Deployment

When deploying to Vercel, ensure you add all the environment variables listed above in the Vercel Dashboard under **Settings > Environment Variables**.

**Note:** Do NOT upload the Firebase Service Account JSON file. Instead, strictly rely on `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` for Admin initialization.
