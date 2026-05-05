import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    const uid = decodedClaims.uid;
    const userRecord = await adminAuth.getUser(uid);

    const userRef = adminDb.collection('forge_users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        uid,
        email: userRecord.email || '',
        name: userRecord.displayName || '',
        createdAt: new Date(),
        credits: { balance: 500 }
      });
      return NextResponse.json({ success: true, isNew: true, credits: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      isNew: false, 
      credits: userDoc.data()?.credits?.balance || 0 
    });
  } catch (error) {
    console.error('Init user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
