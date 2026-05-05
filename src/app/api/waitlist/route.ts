import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const waitlistRef = adminDb.collection("forge_waitlist");
    
    // Check if email already exists
    const existing = await waitlistRef.where("email", "==", email).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ success: true, message: "Already on waitlist" });
    }

    await waitlistRef.add({
      email,
      createdAt: new Date().toISOString(),
      status: "pending",
      source: "landing_page",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[waitlist] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
