import { StarterProject, ProjectStep } from "@/types";

import { adminDb } from '@/lib/firebase/firebaseAdmin';

export const getStarterProject = async (projectId: string): Promise<StarterProject | null> => {
  try {
    const doc = await adminDb.collection('forge_projects').doc(projectId).get();
    if (!doc.exists) return null;
    return doc.data() as StarterProject;
  } catch (error) {
    console.error("[planGenerator] Error fetching project", error);
    return null;
  }
};
