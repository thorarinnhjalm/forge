import { NextRequest, NextResponse } from "next/server";
import { generateJson, MODELS } from "@/lib/gemini/client";

const PROBING_PROMPT = (history: any[]) => `
You are Forge AI, an educational code builder. 
Your job right now is NOT to build the app, but to ASSESS if you have enough information to build a high-quality, fully functional app based on the user's request.

Chat History:
${history.map(m => `${m.role === 'user' ? 'User' : 'Forge'}: ${m.content}`).join('\n')}

INSTRUCTIONS:
1. Assess your confidence (0-100) that you understand exactly what to build.
2. If the user's request is very simple (e.g. "a calculator"), you might have enough context.
3. If confidence is < 90%, you MUST ask a clarifying question.
4. Instead of just a question, if there is a clear TECHNICAL CHOICE (e.g. CSS Grid vs Flexbox, or LocalStorage vs no storage), you can provide "options". 
5. If confidence >= 90%, set readyToBuild to true.

Output format: Return JSON exactly matching this schema:
{
  "confidence": number,
  "readyToBuild": boolean,
  "question": "The question to ask the user, in Icelandic. Only required if readyToBuild is false.",
  "options": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "pros": ["string"],
      "cons": ["string"]
    }
  ] // This field is optional. Use it ONLY if presenting a choice. Maximum 3 options.
}
`;

export async function POST(request: NextRequest) {
  try {
    const { history } = await request.json();

    if (!history || !Array.isArray(history) || history.length === 0) {
      return NextResponse.json({ error: "Missing or invalid history" }, { status: 400 });
    }

    const payload = await generateJson(PROBING_PROMPT(history), undefined, MODELS.FLASH);

    if (!payload) {
      return NextResponse.json({ error: "Failed to generate probing response" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      confidence: payload.confidence,
      readyToBuild: payload.readyToBuild,
      question: payload.question,
      options: payload.options || null,
    });
  } catch (error) {
    console.error("[probing] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
