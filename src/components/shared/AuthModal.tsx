"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("Auth");

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // SKIP FIREBASE AUTH FOR TESTING
      // await signInWithGoogle();
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 800));

      router.push("/is/onboarding");
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        <h2>{t("signIn")}</h2>
        <p>{t("signInDesc")}</p>
        
        <button 
          className="cta-button google-btn" 
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          {isLoading ? t("loading") : t("continueWithGoogle")}
        </button>
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease forwards;
        }
        .modal-content {
          position: relative;
          width: 90%;
          max-width: 400px;
          text-align: center;
          animation: slideUp 0.3s ease forwards;
        }
        .close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--color-text-secondary);
        }
        .close-btn:hover {
          color: var(--color-text-primary);
        }
        h2 {
          margin-bottom: var(--space-2);
        }
        p {
          margin-bottom: var(--space-6);
        }
        .google-btn {
          width: 100%;
          background: var(--color-surface-raised);
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
        }
        .google-btn:hover {
          background: var(--color-border);
        }
      `}</style>
    </div>
  );
}
