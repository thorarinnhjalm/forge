import { NextRequest, NextResponse } from "next/server";
import { generateJson, MODELS } from "@/lib/gemini/client";
import { adminAuth, adminDb } from "@/lib/firebase/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

const PROBING_PROMPT = (history: any[]) => `
You are Forge AI, an educational code builder. 
Your job right now is NOT to build the app, but to ASSESS if you have enough information to build a high-quality, fully functional app based on the user's request.

Chat History:
${history.map(m => `${m.role === 'user' ? 'User' : 'Forge'}: ${m.content}`).join('\n')}

12. Assess your confidence (0-100) that you have enough to build a working prototype.
13. BE FORGIVING AND MAKE REASONABLE ASSUMPTIONS. If the user asks for "a calculator" or "a weather app", just assume a standard layout and features. Do not demand perfection.
14. NEVER ask the user to write the copy/text for the website. Always generate realistic placeholder text yourself!
15. If confidence is < 50%, or if there is an EXCELLENT educational opportunity to teach the user a technical trade-off (e.g., LocalStorage vs Database, CSS Grid vs Flexbox), you should ask a clarifying question or provide options.
15. If providing options, limit them to 2-3 maximum.
16. If confidence >= 50% and no major educational choice is needed, set readyToBuild to true and DO NOT ask questions.

IMAGE UPLOAD DETECTION — set needsImageUpload: true if the user needs to:
- Upload their own photos or images to the site
- Show a personal portfolio, gallery, or showcase of their own work
- Allow visitors to upload images
Do NOT set this for apps that just display static placeholder images.

If needsImageUpload is true AND readyToBuild is false, ask for their Cloudinary credentials:
"Til að myndir þínar virki á netinu þarftu fríjan Cloudinary aðgang. Farðu á cloudinary.com, búðu til fríjan aðgang, og sendu mér: (1) Cloud Name og (2) Upload Preset nafn (unsigned). Ef þú ert ekki með þetta ennþá getum við byrjað með placeholder myndir."

Output format: Return JSON exactly matching this schema:
{
  "confidence": 85,
  "readyToBuild": false,
  "needsImageUpload": false,
  "question": "Spurning á íslensku.",
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
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let decodedClaims;
    try {
      decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    } catch (authError) {
      console.error("[probing] Auth error:", authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const uid = decodedClaims.uid;

    const { history } = await request.json();

    if (!history || !Array.isArray(history) || history.length === 0) {
      return NextResponse.json({ error: "Missing or invalid history" }, { status: 400 });
    }

    const { data: payload, tokensUsed } = await generateJson(PROBING_PROMPT(history), undefined, MODELS.FLASH);

    if (!payload) {
      return NextResponse.json({ error: "Failed to generate probing response" }, { status: 500 });
    }

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
      confidence: payload.confidence,
      readyToBuild: payload.readyToBuild,
      needsBackend: payload.needsBackend ?? false,
      needsImageUpload: payload.needsImageUpload ?? false,
      question: payload.question,
      options: payload.options || null,
    });
  } catch (error) {
    console.error("[probing] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
