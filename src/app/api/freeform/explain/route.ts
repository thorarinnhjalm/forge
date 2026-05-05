import { NextRequest, NextResponse } from "next/server";
import { generateText, MODELS } from "@/lib/gemini/client";
import { adminAuth, adminDb } from "@/lib/firebase/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

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
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let decodedClaims;
    try {
      decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    } catch (authError) {
      console.error("[explain] Auth error:", authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const uid = decodedClaims.uid;

    const { history, currentFiles } = await request.json();

    if (!history || !currentFiles) {
      return NextResponse.json({ error: "Missing history or currentFiles" }, { status: 400 });
    }

    const { text: explanation, tokensUsed } = await generateText(EXPLAIN_PROMPT(history, currentFiles), undefined, MODELS.FLASH);

    if (tokensUsed > 0) {
      const creditsToDeduct = Math.max(1, Math.ceil(tokensUsed / 1000));
      const userRef = adminDb.collection('forge_users').doc(uid);
      await userRef.update({
        'credits.balance': FieldValue.increment(-creditsToDeduct),
        'totalTokensUsed': FieldValue.increment(tokensUsed)
      }).catch(e => console.error("Failed to update tokens", e));
    }

    return NextResponse.json({
      success: true,
      explanation
    });
  } catch (error) {
    console.error("[explain] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
