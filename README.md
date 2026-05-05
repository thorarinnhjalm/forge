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

## Vercel Deployment & Production Setup

Þegar þú setur appið upp á Vercel þarftu að passa upp á nokkra mikilvæga hluti til að allt virki (E2B sandkassar, Firebase Auth og GitHub Export).

### 1. Umhverfisbreytur (Environment Variables)
Farðu í **Settings > Environment Variables** í Vercel og settu inn eftirfarandi:

**Core:**
- `GEMINI_API_KEY`
- `E2B_API_KEY`

**Firebase Admin (fyrir gagnagrunn):**
> ⚠️ **MIKILVÆGT:** Ekki uploada `.json` skránni á Vercel eða GitHub. Vercel á bara að fá innihaldið úr henni í gegnum þessar breytur:
- `FIREBASE_PROJECT_ID` (t.d. spark-15dfd)
- `FIREBASE_CLIENT_EMAIL` (t.d. firebase-adminsdk-fbsvc@spark-15dfd.iam.gserviceaccount.com)
- `FIREBASE_PRIVATE_KEY` (Líma allan lykilinn nákvæmlega eins og hann er í skránni, byrjar á `-----BEGIN PRIVATE KEY-----` og endar á `\n-----END PRIVATE KEY-----\n`)

**GitHub Export (til að "Ýta á GitHub" takkinn virki):**
1. Búðu til **OAuth App** á GitHub (Developer Settings -> OAuth Apps -> New).
2. Setja "Homepage URL" sem `https://tryforge.tech`.
3. Setja "Authorization callback URL" sem `https://spark-15dfd.firebaseapp.com/__/auth/handler`.
4. Afrita Client ID og Client Secret og setja inn í bæði Firebase Auth (Sign-in providers -> GitHub) OG í Vercel umhverfisbreytur:
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

### 2. Cron Job fyrir Sandkassa (Valfrjálst en mælt með)
Til að drepa sandkassa sem gleyma að loka sér, geturðu notað Vercel Cron Jobs. Búðu til `vercel.json` í rótinni með:
```json
{
  "crons": [{
    "path": "/api/cron/cleanup",
    "schedule": "0 * * * *"
  }]
}
```
Mundu þá að setja `CRON_SECRET` í umhverfisbreytur líka.
