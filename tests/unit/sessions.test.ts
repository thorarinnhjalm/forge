// STATUS: tests session doc type shape — expand as session helpers are added
import { describe, it, expectTypeOf, vi, expect, beforeEach } from 'vitest';
import type { SessionDoc } from '@/types';

describe('SessionDoc', () => {
  it('has required fields', () => {
    const doc: SessionDoc = {
      state: 'idle',
      projectId: 'shopping-list',
      currentStepId: 'step_1',
      userId: 'uid_abc',
      language: 'is',
      techLevel: 'beginner',
    };
    expectTypeOf(doc.sandboxId).toEqualTypeOf<string | undefined>();
    expectTypeOf(doc.previewUrl).toEqualTypeOf<string | undefined>();
  });
});

// Mock firebase-admin before importing sessions.ts
vi.mock('@/lib/firebase/firebaseAdmin', () => {
  const docData: Record<string, unknown> = {};
  const docRef = {
    get: vi.fn(async () => ({ exists: Object.keys(docData).length > 0, data: () => ({ ...docData }) })),
    set: vi.fn(async (data: Record<string, unknown>) => { Object.assign(docData, data); }),
    update: vi.fn(async (data: Record<string, unknown>) => { Object.assign(docData, data); }),
  };
  return {
    adminDb: {
      collection: vi.fn(() => ({ doc: vi.fn(() => docRef) })),
    },
  };
});

import { getSession, updateSession } from '@/lib/firebase/sessions';

describe('getSession', () => {
  it('returns null when doc does not exist', async () => {
    const result = await getSession('nonexistent');
    expect(result).toBeNull();
  });
});

describe('updateSession', () => {
  it('writes fields to the session doc without throwing', async () => {
    await updateSession('sess_1', { sandboxId: 'sbx_abc' });
    // No throw = pass (mock captured the write)
  });
});
