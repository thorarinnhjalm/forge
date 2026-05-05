"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setupAuthListener, signOut } from "@/lib/firebase/auth";
import { User } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import Link from "next/link";

type SessionDoc = {
  id: string;
  messages: any[];
  sandboxId?: string;
  updatedAt?: any;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = setupAuthListener(async (u) => {
      if (!u) {
        router.push("/is/login");
        return;
      }
      setUser(u);

      try {
        // Init user and get credits
        const res = await fetch("/api/users/init", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          setCredits(data.credits);
        }

        // Fetch sessions
        const q = query(
          collection(db, "forge_freeform_sessions"),
          where("userId", "==", u.uid)
        );
        const querySnapshot = await getDocs(q);
        const fetchedSessions: SessionDoc[] = [];
        querySnapshot.forEach((doc) => {
          fetchedSessions.push({ id: doc.id, ...doc.data() } as SessionDoc);
        });

        // Sort by updatedAt descending
        fetchedSessions.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis?.() || 0;
          const timeB = b.updatedAt?.toMillis?.() || 0;
          return timeB - timeA;
        });

        setSessions(fetchedSessions);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/is/login");
  };

  if (isLoading) {
    return (
      <div className="dashboard-layout">
        <div className="spinner" />
        <style jsx>{`
          .dashboard-layout { min-height: 100vh; background: #0a0a1a; display: flex; align-items: center; justify-content: center; }
          .spinner { width: 40px; height: 40px; border: 4px solid #6c5ce7; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <main className="dash-main">
        <header className="dash-header">
          <div>
            <h1>Velkomin(n), {user?.email}</h1>
            <div className="credits-widget">
              <span>Inneign (Credits): </span>
              <div className="gauge">
                <div className="gauge-fill" style={{ width: credits ? Math.min(100, (credits/500)*100) + '%' : '0%' }}></div>
              </div>
              <span>{credits !== null ? credits : "..."} / 500</span>
            </div>
          </div>
          <Link href="/is/freeform" className="cta-button" style={{ textDecoration: 'none' }}>
            + Nýtt Verkefni
          </Link>
        </header>

        {sessions.length === 0 ? (
          <div className="empty-state">
            <p>Engin verkefni fundust. Smelltu á "Nýtt Verkefni" til að byrja!</p>
          </div>
        ) : (
          <section className="projects-grid">
            {sessions.map((session) => {
              const firstUserMsg = session.messages?.find((m) => m.role === "user");
              let title = firstUserMsg?.content || "Ónefnt verkefni";
              if (title.length > 50) title = title.substring(0, 50) + "...";
              
              const dateStr = session.updatedAt?.toDate?.().toLocaleDateString("is-IS", {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
              }) || "Nýlega";

              return (
                <div key={session.id} className="card project-card">
                  <h3>{title}</h3>
                  <div className="card-footer" style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>🗓️ {dateStr}</span>
                    <Link href={`/is/freeform?session=${session.id}`} className="continue-link">
                      Halda áfram
                    </Link>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>

      <style jsx>{`
        .dashboard-layout {
          display: flex;
          min-height: calc(100vh - 72px);
          background: var(--color-bg);
          color: var(--color-text-primary);
          font-family: 'Inter', sans-serif;
        }
        .dash-main {
          flex: 1;
          padding: 3rem 1rem;
          max-width: 1000px;
          margin: 0 auto;
          width: 100%;
        }
        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3rem;
          background: var(--color-surface);
          padding: 2rem;
          border-radius: 12px;
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-sm);
        }
        .dash-header h1 {
          font-size: 1.5rem;
          margin: 0 0 0.5rem 0;
        }
        .credits-widget {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.85rem;
          color: var(--color-text-secondary);
        }
        .gauge {
          width: 150px;
          height: 6px;
          background: var(--color-surface-raised);
          border-radius: 10px;
          overflow: hidden;
        }
        .gauge-fill {
          height: 100%;
          background: var(--color-accent);
          transition: width 0.5s ease;
        }
        .cta-button {
          background: var(--color-accent);
          color: white;
          padding: 0.8rem 1.5rem;
          border-radius: var(--radius-full);
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, background-color 0.2s;
        }
        .cta-button:hover {
          transform: translateY(-2px);
          background: var(--color-accent-hover);
        }

        .empty-state {
          text-align: center;
          padding: 5rem;
          background: var(--color-surface);
          border-radius: 16px;
          border: 1px dashed var(--color-border);
          color: var(--color-text-secondary);
        }
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }
        .project-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          min-height: 150px;
          transition: border-color 0.2s, transform 0.2s;
        }
        .project-card:hover {
          border-color: #6c5ce7;
          transform: translateY(-2px);
        }
        .project-card h3 {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
          line-height: 1.4;
        }
        .continue-link {
          background: rgba(108, 92, 231, 0.1);
          color: #a29bfe;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 600;
          transition: background 0.2s;
        }
        .continue-link:hover {
          background: rgba(108, 92, 231, 0.3);
        }
      `}</style>
    </div>
  );
}
