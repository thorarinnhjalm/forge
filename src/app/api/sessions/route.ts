import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/firebaseAdmin";
import { SessionDoc } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, userId, language = "is", techLevel = "beginner" } = body;

    if (!projectId || !userId) {
      return NextResponse.json({ error: "Missing projectId or userId" }, { status: 400 });
    }

    const sessionsRef = adminDb.collection("forge_sessions");
    
    // We assume the first step is step1 or we can fetch the project to get the first step.
    // For now, we will set currentStepId to "step1" as a default starter
    const sessionData: SessionDoc = {
      state: "idle",
      projectId,
      currentStepId: "step1", // Ideally this should be resolved dynamically
      userId,
      language,
      techLevel,
    };

    const docRef = await sessionsRef.add(sessionData);

    return NextResponse.json({ success: true, sessionId: docRef.id });
  } catch (error) {
    console.error("[sessions] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
