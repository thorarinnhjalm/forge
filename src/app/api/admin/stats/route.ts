import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/firebaseAdmin';

const ADMIN_EMAIL = "thorarinnhjalmarsson@gmail.com";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let decodedClaims;
    try {
      decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    } catch (authError) {
      console.error("[admin] Auth error:", authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const uid = decodedClaims.uid;
    const userRecord = await adminAuth.getUser(uid);

    if (userRecord.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    // Auto-sync missing users frá Firebase Auth
    const listUsersResult = await adminAuth.listUsers(1000);
    for (const authUser of listUsersResult.users) {
      const userRef = adminDb.collection('forge_users').doc(authUser.uid);
      const docSnap = await userRef.get();
      if (!docSnap.exists) {
        await userRef.set({
          uid: authUser.uid,
          email: authUser.email || '',
          name: authUser.displayName || '',
          createdAt: new Date(),
          credits: { balance: 500 }
        });
      }
    }

    // Sækja alla notendur
    const usersSnapshot = await adminDb.collection('forge_users').get();
    const users: any[] = [];
    let totalTokens = 0;
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      totalTokens += (data.totalTokensUsed || 0);
      users.push({ id: doc.id, ...data });
    });

    // Sækja öll verkefni (sessions)
    const sessionsSnapshot = await adminDb.collection('forge_freeform_sessions').get();
    const sessions: any[] = [];
    sessionsSnapshot.forEach(doc => {
      const data = doc.data();
      // Við viljum ekki senda allan kóðann og heila sögu ef hún er stór til baka í admin yfirlitið,
      // heldur bara meta gögn.
      const firstMessage = data.messages?.find((m: any) => m.role === "user")?.content || "Ónefnt";
      
      sessions.push({
        id: doc.id,
        userId: data.userId,
        sandboxId: data.sandboxId,
        updatedAt: data.updatedAt,
        title: firstMessage.substring(0, 80) + (firstMessage.length > 80 ? "..." : ""),
        messageCount: data.messages?.length || 0
      });
    });

    // Raða sessions eftir nýjast fyrst
    sessions.sort((a, b) => {
      const timeA = a.updatedAt?._seconds || 0;
      const timeB = b.updatedAt?._seconds || 0;
      return timeB - timeA;
    });

    return NextResponse.json({ 
      success: true, 
      users,
      sessions,
      metrics: {
        totalUsers: users.length,
        totalSessions: sessions.length,
        totalTokens: totalTokens
      }
    });

  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
