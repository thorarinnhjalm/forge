import * as admin from 'firebase-admin';

// Initialize only if we have the required env variables (e.g. at runtime)
if (!admin.apps.length) {
  let serviceAccountParsed = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      // Remove surrounding quotes if Vercel added them accidentally
      let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (raw.startsWith('"') && raw.endsWith('"')) {
        raw = raw.slice(1, -1);
      }
      serviceAccountParsed = JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT, falling back...", e);
    }
  }

  if (serviceAccountParsed) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountParsed),
    });
  } else if (process.env.FIREBASE_PROJECT_ID) {
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
