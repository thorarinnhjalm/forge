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

Output format: Return JSON exactly matching this schema:
{
  "files": [
    { "path": "string", "content": "string" }
  ],
  "explanation": "Brief description of what was built, in Icelandic",
  "conceptTags": ["Tag 1", "Tag 2", "Tag 3"]
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

Output format: Return JSON exactly matching this schema:
{
  "files": [
    { "path": "string", "content": "string" }
  ],
  "explanation": "Brief description of what changed, in Icelandic",
  "conceptTags": ["Tag 1", "Tag 2", "Tag 3"]
}
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

    const { description, sessionId, sandboxId, currentFiles, history = [] } = await request.json();

    if (!description) {
      return NextResponse.json({ error: "Missing description" }, { status: 400 });
    }

    const isIterative = !!currentFiles && !!sandboxId;

    // 1. Ask Gemini to generate the app
    const prompt = isIterative 
      ? ITERATIVE_PROMPT(description, currentFiles, history)
      : FREEFORM_PROMPT(description, history);

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
      previewUrl: result.previewUrl,
      sandboxId: sandbox.sandboxId,
      files: finalFiles,
    });
  } catch (error) {
    console.error("[freeform] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
