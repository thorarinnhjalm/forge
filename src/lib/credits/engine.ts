import { adminDb } from '@/lib/firebase/firebaseAdmin';

export type CreditAction = "build_step" | "why_click" | "plan_gen";

const ACTION_COSTS: Record<CreditAction, number> = {
  build_step: 10,
  why_click: 2,
  plan_gen: 5,
};

export class CreditsEngine {
  async checkBalance(userId: string) {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) throw new Error("User not found");
    
    const data = userDoc.data();
    return data?.credits?.balance || 0;
  }

  async canAfford(userId: string, action: CreditAction): Promise<boolean> {
    const balance = await this.checkBalance(userId);
    return balance >= ACTION_COSTS[action];
  }

  async deduct(userId: string, action: CreditAction, sessionId: string) {
    const cost = ACTION_COSTS[action];
    
    // In reality, use a Firestore transaction here to prevent race conditions
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const currentBalance = userDoc.data()?.credits?.balance || 0;
    
    if (currentBalance < cost) {
      throw new Error("Insufficient credits");
    }

    await userRef.update({
      "credits.balance": currentBalance - cost
    });

    // Log usage
    await userRef.collection('usageLog').add({
      action,
      creditsUsed: cost,
      sessionId,
      timestamp: new Date(),
    });

    return { success: true, remaining: currentBalance - cost };
  }
}
