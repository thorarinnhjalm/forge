import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/firebaseAdmin';
import { UserProfile } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the session
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    const uid = decodedClaims.uid;

    const body = await request.json();
    const { techLevel, language } = body;

    if (!techLevel || !language) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Fetch user details from Auth
    const userRecord = await adminAuth.getUser(uid);

    // 3. Create the profile in Firestore
    const userProfile: UserProfile = {
      uid,
      email: userRecord.email || '',
      name: userRecord.displayName || '',
      techLevel,
      language,
      plan: 'free',
      createdAt: new Date(),
      credits: {
        balance: 50,
        allocated: 50,
        periodStart: new Date(),
        periodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)), // 1 month from now
      }
    };

    await adminDb.collection('users').doc(uid).set(userProfile);

    return NextResponse.json({ success: true, profile: userProfile }, { status: 201 });
  } catch (error) {
    console.error('Error creating user profile', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
