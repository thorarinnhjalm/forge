import { NextRequest, NextResponse } from "next/server";
import { generateText, MODELS } from "@/lib/gemini/client";

const EXPLAIN_PROMPT = (history: any[], currentFiles: any[]) => `
You are Forge AI, an educational coding assistant. 
The user is asking for an explanation of the code you just built or modified.

Chat History:
${history.map(m => `${m.role === 'user' ? 'User' : 'Forge'}: ${m.content}`).join('\n')}

Current Code Files:
${JSON.stringify(currentFiles, null, 2)}

INSTRUCTIONS:
Explain the code clearly in Icelandic. Break down the technical decisions you made (e.g. why you used CSS Grid, why you added a specific event listener). 
Keep it encouraging, educational, and at a level suitable for the user based on the conversation.
Format the explanation nicely in Markdown.
`;

export async function POST(request: NextRequest) {
  try {
    const { history, currentFiles } = await request.json();

    if (!history || !currentFiles) {
      return NextResponse.json({ error: "Missing history or currentFiles" }, { status: 400 });
    }

    const explanation = await generateText(EXPLAIN_PROMPT(history, currentFiles), undefined, MODELS.FLASH);

    return NextResponse.json({
      success: true,
      explanation
    });
  } catch (error) {
    console.error("[explain] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
