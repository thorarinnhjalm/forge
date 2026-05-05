"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, setupAuthListener } from "@/lib/firebase/auth";
import { User } from "firebase/auth";

export default function LoginPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = setupAuthListener((u) => {
      setUser(u);
      setIsLoading(false);
      if (u) {
        // Redirect to freeform upon successful login
        router.push("/is/freeform");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      // Auth listener will handle the redirect
    } catch (error) {
      console.error("Login failed:", error);
      alert("Innskráning mistókst. Reyndu aftur.");
    }
  };

  if (isLoading) {
    return (
      <div className="login-layout">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="login-layout">
      <div className="login-card">
        <h1>Alpha Innskráning</h1>
        <p>Vinsamlegast skráðu þig inn til að prófa Forge Alpha.</p>
        
        <button className="google-btn" onClick={handleGoogleLogin}>
          <span>G</span> Skrá inn með Google
        </button>
      </div>

      <style jsx>{`
        .login-layout {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a1a;
          color: #e0e0e0;
          font-family: 'Inter', sans-serif;
        }

        .login-card {
          background: #111122;
          padding: 3rem;
          border-radius: 16px;
          border: 1px solid #222;
          text-align: center;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        h1 {
          font-size: 2rem;
          background: linear-gradient(135deg, #6c5ce7, #a29bfe);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 1rem;
        }

        p {
          color: #888;
          margin-bottom: 2rem;
          line-height: 1.5;
        }

        .google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          width: 100%;
          padding: 1rem;
          background: white;
          color: #333;
          border: none;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }

        .google-btn span {
          font-weight: 800;
          font-size: 1.3rem;
        }

        .google-btn:hover {
          transform: translateY(-2px);
          background: #f0f0f0;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #6c5ce7;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
