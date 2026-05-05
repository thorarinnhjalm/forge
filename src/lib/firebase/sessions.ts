// STATUS: Firestore session doc helpers — read/write for orchestrator route.
// NEXT: add createSession() once the session creation flow (POST /api/sessions) is built.
import { adminDb } from '@/lib/firebase/firebaseAdmin';
import type { SessionDoc } from '@/types';

const SESSIONS = 'forge_sessions';

/** Returns the session doc, or null if it does not exist. */
export async function getSession(sessionId: string): Promise<SessionDoc | null> {
  const snap = await adminDb.collection(SESSIONS).doc(sessionId).get();
  if (!snap.exists) return null;
  return snap.data() as SessionDoc;
}

/**
 * Merges the given fields into the session doc.
 * Safe to call with partial data — does not overwrite unspecified fields.
 */
export async function updateSession(
  sessionId: string,
  fields: Partial<SessionDoc>
): Promise<void> {
  await adminDb.collection(SESSIONS).doc(sessionId).update(fields);
}
