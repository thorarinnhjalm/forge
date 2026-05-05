import { NextRequest, NextResponse } from "next/server";
import { generateJson, MODELS } from "@/lib/gemini/client";
import { AgentSandboxClient } from "@/lib/sandbox/client";
import { adminAuth, adminDb } from "@/lib/firebase/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const maxDuration = 60;

const FREEFORM_PROMPT = (description: string, history: any[]) => `
You are Forge AI, a code generation engine. The user wants to build a web application based on this conversation:

Chat History (Requirements):
${history.map(m => `${m.role === 'user' ? 'User' : 'Forge'}: ${m.content}`).join('\n')}

Generate a COMPLETE, working web application using vanilla HTML, CSS, and JavaScript based on the user's latest request and all previously agreed-upon details in the history.

CRITICAL RULES:
- If the user explicitly asks for a backend, API, database, or full-stack application, you MUST generate a Node.js project:
  1. Provide a "package.json" file with a "start" script (e.g. "start": "node server.js").
  2. Provide a "server.js" file that listens on port 3000.
  3. The server MUST serve the static frontend (e.g. index.html) on the root route ('/'). Use 'express' if it makes this easier.
- If the user only asks for a frontend/website, do NOT include a package.json. Return only HTML/CSS/JS files without build tools.
- For the frontend (whether fullstack or frontend-only):
  - Create an index.html that is the entry point.
  - You MUST import Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
  - Use Tailwind CSS classes for ALL styling. Only write custom CSS for specific animations if needed.
  - Import a modern font from Google Fonts (e.g., 'Inter' or 'Outfit') and apply it.
  - Include icons using FontAwesome or Heroicons via CDN if needed.
  - The app must be FULLY FUNCTIONAL and look beautiful and modern.
  - Use a sleek design with premium aesthetics (glassmorphism, subtle shadows, smooth transitions, rounded corners).
  - Make it responsive and polished for all screen sizes.
- NEVER ask the user to provide text copy. Generate realistic placeholder content (e.g. realistic names, descriptions, articles) yourself!

Output STRICT JSON, no comments, no trailing commas, double-quoted strings only:
{
  "files": [
    { "path": "index.html", "content": "..." },
    { "path": "style.css", "content": "..." },
    { "path": "app.js", "content": "..." }
  ],
  "explanation": "Stutt lýsing á því sem var byggt, á íslensku",
  "conceptTags": ["CSS Flexbox", "localStorage", "DOM Events"],
  "learningPoints": [
    {
      "concept": "CSS Flexbox",
      "why": "Notað til að raða kortum í röð sem brotnar á minni skjáum",
      "snippet": "display: flex;\\nflex-wrap: wrap;\\ngap: 1rem;"
    }
  ]
}
`;

const ITERATIVE_PROMPT = (description: string, currentFiles: any[], history: any[]) => `
You are Forge AI, a code generation engine. The user wants to MODIFY an existing application.

User's new request:
"${description}"

Chat History (for context):
${history.map(m => `${m.role === 'user' ? 'User' : 'Forge'}: ${m.content}`).join('\n')}

Current Code Files:
${JSON.stringify(currentFiles, null, 2)}

CRITICAL RULES:
- Understand the user's request and update the necessary files.
- If the current code contains a package.json, it is a Node.js full-stack application. Maintain the backend structure and port 3000.
- Remember that the frontend uses Tailwind CSS via CDN. Continue using Tailwind for all new styling.
- Return the COMPLETE contents of the files you modify (and any new ones). You do not need to return files that haven't changed, but it's safe to return all files if unsure.
- The app must remain FULLY FUNCTIONAL and maintain a premium, modern aesthetic.
- NEVER ask the user to provide text copy. Generate realistic placeholder content yourself!
- The explanation must be in Icelandic and describe briefly what changed.

Output STRICT JSON, no comments, no trailing commas, double-quoted strings only:
{
  "files": [
    { "path": "index.html", "content": "..." }
  ],
  "explanation": "Stutt lýsing á breytingunum, á íslensku",
  "conceptTags": ["CSS Grid", "Event Listener"],
  "learningPoints": [
    {
      "concept": "CSS Grid",
      "why": "Skipt yfir í Grid til að gefa meiri stjórn á dálka-uppbyggingu",
      "snippet": "display: grid;\\ngrid-template-columns: repeat(auto-fill, minmax(280px, 1fr));"
    }
  ]
}
`;

const IMAGE_UPLOAD_SNIPPET = (cloudName: string, uploadPreset: string) => `
IMAGE UPLOAD SYSTEM (Cloudinary + Firestore):
The app needs real image upload. Use this exact architecture:

CLOUDINARY CONFIG:
  cloud_name: "${cloudName}"
  upload_preset: "${uploadPreset}"

FIRESTORE CONFIG:
  Use the Firebase config already present in the app.
  Collection: "forge_gallery"
  Document structure: { url: string, publicId: string, caption: string, uploadedAt: timestamp }

REQUIRED FILES TO GENERATE:
1. index.html — Public portfolio/gallery page
   - On load, fetch all docs from "forge_gallery" collection ordered by uploadedAt desc
   - Render images in a responsive masonry/grid layout
   - Uses Firebase SDK v9 compat via CDN:
     <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
     <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>

2. admin.html — Password-protected upload page (link hidden from public)
   - Simple password check: localStorage.getItem('forge_admin') === 'true', if not set show password prompt
   - Uses Cloudinary Upload Widget via CDN:
     <script src="https://upload-widget.cloudinary.com/global/all.js"></script>
   - On successful upload: save { url, publicId, caption, uploadedAt: new Date() } to Firestore "forge_gallery"
   - Show uploaded images list with delete option (deletes from Firestore only — Cloudinary cleanup is manual)

FIREBASE INITIALIZATION (in every JS file that uses Firestore):
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_FIREBASE_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

Add HTML comments: <!-- Skiptu REPLACE_WITH_YOUR_FIREBASE_* út fyrir þín Firebase gildi frá Firebase Console -->

CLOUDINARY UPLOAD WIDGET USAGE:
const widget = cloudinary.createUploadWidget(
  { cloudName: "${cloudName}", uploadPreset: "${uploadPreset}", multiple: true, maxFiles: 20 },
  (error, result) => {
    if (!error && result.event === "success") {
      const { secure_url, public_id } = result.info;
      // save to Firestore here
    }
  }
);
widget.open();
`;

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let decodedClaims;
    try {
      decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    } catch (authError) {
      console.error("[freeform] Auth error:", authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const uid = decodedClaims.uid;

    const { description, sessionId, sandboxId, currentFiles, history = [], needsBackend = false, needsImageUpload = false, cloudinaryCloudName = "", cloudinaryUploadPreset = "" } = await request.json();

    if (!description) {
      return NextResponse.json({ error: "Missing description" }, { status: 400 });
    }

    const isIterative = !!currentFiles && !!sandboxId;

    // 1. Ask Gemini to generate the app
    const prompt = isIterative 
      ? ITERATIVE_PROMPT(description, currentFiles, history)
      : FREEFORM_PROMPT(description, history) + (needsImageUpload && cloudinaryCloudName
          ? "\n\n" + IMAGE_UPLOAD_SNIPPET(cloudinaryCloudName, cloudinaryUploadPreset)
          : "");

    const { data: codePayload, tokensUsed } = await generateJson(prompt, undefined, MODELS.FLASH);

    if (!codePayload?.files?.length) {
      return NextResponse.json({ error: "Gemini did not generate any files" }, { status: 500 });
    }

    if (tokensUsed > 0) {
      const creditsToDeduct = Math.max(1, Math.ceil(tokensUsed / 1000));
      const userRef = adminDb.collection('forge_users').doc(uid);
      await userRef.update({
        'credits.balance': FieldValue.increment(-creditsToDeduct),
        'totalTokensUsed': FieldValue.increment(tokensUsed)
      }).catch(e => console.error("Failed to update tokens", e));
    }

    // 2. Create or reconnect to a sandbox and write + serve the files
    const sandbox = isIterative 
      ? await AgentSandboxClient.reconnect(sessionId || "freeform", sandboxId)
      : await AgentSandboxClient.create(sessionId || "freeform");

    // Merge old files with new files for the response
    let finalFiles = currentFiles || [];
    if (isIterative) {
      for (const updatedFile of codePayload.files) {
        const index = finalFiles.findIndex((f: any) => f.path === updatedFile.path);
        if (index >= 0) {
          finalFiles[index] = updatedFile;
        } else {
          finalFiles.push(updatedFile);
        }
      }
    } else {
      finalFiles = codePayload.files;
    }

    const result = await sandbox.executeCode(codePayload.files);

    return NextResponse.json({
      success: true,
      explanation: codePayload.explanation,
      conceptTags: codePayload.conceptTags || [],
      learningPoints: codePayload.learningPoints || [],
      previewUrl: result.previewUrl,
      sandboxId: sandbox.sandboxId,
      files: finalFiles,
    });
  } catch (error) {
    console.error("[freeform] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
