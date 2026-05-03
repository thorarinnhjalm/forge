import * as admin from 'firebase-admin';

// Initialize only if we have the required env variables (e.g. at runtime)
if (!admin.apps.length) {
  if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Provide a dummy app for build time
    admin.initializeApp({ projectId: 'demo-project' });
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
