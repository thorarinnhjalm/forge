import { NextRequest, NextResponse } from "next/server";
import { generateText, MODELS } from "@/lib/gemini/client";
import { adminAuth, adminDb } from "@/lib/firebase/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

const EXPLAIN_PROMPT = (history: any[], currentFiles: any[]) => `
You are Forge AI, a patient coding teacher for Icelandic beginners.
The student clicked "Af hverju er þetta gert svona?" — they want to understand the choices behind their code.

Chat History:
${history.map(m => `${m.role === 'user' ? 'User' : 'Forge'}: ${m.content}`).join('\n')}

Code:
${JSON.stringify(currentFiles, null, 2)}

Write a SHORT, structured explanation in Icelandic. Format exactly like this (use these exact emoji headers):

🏗️ **Uppbygging** (1–2 sentences: what are the files and what does each do)

🎨 **Útlit** (1–2 sentences: one specific CSS decision and why — quote the actual property)

⚡ **Virkni** (1–2 sentences: one specific JavaScript decision and why — quote the actual function or event)

💡 **Þú lærðir** (1 sentence: the single most important concept in this build, explained simply)

Keep every section to 1–2 sentences maximum. Avoid jargon — if you must use a technical term, define it in plain Icelandic immediately after.
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
