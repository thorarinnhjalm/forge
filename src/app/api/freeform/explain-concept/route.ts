import { NextRequest, NextResponse } from "next/server";
import { generateText, MODELS } from "@/lib/gemini/client";

const CONCEPT_PROMPT = (concept: string, currentFiles: any[]) => `
You are Forge AI, an educational coding assistant teaching Icelanders to build websites.

The student just built an app and wants to understand the concept: "${concept}"

Their code:
${JSON.stringify(currentFiles, null, 2)}

Write a SHORT explanation (3–5 sentences max) in Icelandic that:
1. Says what "${concept}" is in plain language (no jargon)
2. Points to exactly WHERE in their code it appears (quote the specific line or selector)
3. Explains WHY it was the right choice here
4. Ends with one sentence about when to use it in other projects

Keep it warm, encouraging, and at beginner level. No markdown headers — just flowing text.
`;

export async function POST(request: NextRequest) {
  try {
    const { concept, currentFiles } = await request.json();

    if (!concept || !currentFiles) {
      return NextResponse.json({ error: "Missing concept or currentFiles" }, { status: 400 });
    }

    const explanation = await generateText(
      CONCEPT_PROMPT(concept, currentFiles),
      undefined,
      MODELS.FLASH
    );

    return NextResponse.json({ success: true, explanation });
  } catch (error) {
    console.error("[explain-concept] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
