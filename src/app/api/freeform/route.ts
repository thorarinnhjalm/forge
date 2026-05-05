import { NextRequest, NextResponse } from "next/server";
import { generateJson, MODELS } from "@/lib/gemini/client";
import { AgentSandboxClient } from "@/lib/sandbox/client";

const FREEFORM_PROMPT = (description: string) => `
You are Forge AI, a code generation engine. The user wants to build the following:

"${description}"

Generate a COMPLETE, working web application using vanilla HTML, CSS, and JavaScript.

CRITICAL RULES:
- Create an index.html that is the entry point.
- Include all CSS inline in a <style> tag or in a separate style.css file.
- Include all JavaScript inline in a <script> tag or in a separate app.js file.
- The app must be FULLY FUNCTIONAL and look beautiful and modern.
- Use a dark theme with vibrant accent colors.
- Make it responsive and polished.
- Do NOT use any build tools, npm, React, or frameworks.
- Everything must work by simply opening index.html in a browser.
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
- Return the COMPLETE contents of the files you modify (and any new ones). You do not need to return files that haven't changed, but it's safe to return all files if unsure.
- The app must remain FULLY FUNCTIONAL.
- Do NOT use any build tools, npm, React, or frameworks.
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
    const { description, sessionId, sandboxId, currentFiles, history = [] } = await request.json();

    if (!description) {
      return NextResponse.json({ error: "Missing description" }, { status: 400 });
    }

    const isIterative = !!currentFiles && !!sandboxId;

    // 1. Ask Gemini to generate the app
    const prompt = isIterative 
      ? ITERATIVE_PROMPT(description, currentFiles, history)
      : FREEFORM_PROMPT(description);

    const codePayload = await generateJson(prompt, undefined, MODELS.FLASH);

    if (!codePayload?.files?.length) {
      return NextResponse.json({ error: "Gemini did not generate any files" }, { status: 500 });
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
