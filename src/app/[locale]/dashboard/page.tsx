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
      <aside className="sidebar glass-panel">
        <div className="logo">Forge</div>
        <nav>
          <Link href="/is/dashboard" className="active">Mín Verkefni</Link>
        </nav>
        
        <div className="credits-widget">
          <h4>Inneign (Credits)</h4>
          <div className="gauge">
            <div className="gauge-fill" style={{ width: credits ? Math.min(100, (credits/500)*100) + '%' : '0%' }}></div>
          </div>
          <p>{credits !== null ? credits : "..."} / 500</p>
        </div>

        <button className="logout-btn" onClick={handleSignOut}>Útskrá</button>
      </aside>

      <main className="dash-main">
        <header className="dash-header">
          <h1>Velkomin(n), {user?.email}</h1>
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
                    <span style={{ fontSize: '0.8rem', color: '#888' }}>🗓️ {dateStr}</span>
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
          height: 100vh;
          background: var(--color-bg);
          color: var(--color-text-primary);
          font-family: 'Inter', sans-serif;
        }
        .sidebar {
          width: 250px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--color-border);
          background: var(--color-surface);
        }
        .logo {
          font-size: 1.5rem;
          font-weight: bold;
          background: linear-gradient(135deg, #6c5ce7, #a29bfe);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 3rem;
        }
        nav {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          flex: 1;
        }
        nav a {
          padding: 0.8rem 1rem;
          border-radius: 8px;
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: all 0.2s;
        }
        nav a:hover {
          background: rgba(108, 92, 231, 0.05);
          color: var(--color-text-primary);
        }
        nav a.active {
          background: rgba(108, 92, 231, 0.1);
          color: #a29bfe;
          font-weight: 500;
        }
        .credits-widget {
          margin-top: auto;
          background: var(--color-surface-raised);
          padding: 1.2rem;
          border-radius: 12px;
          border: 1px solid var(--color-border);
          margin-bottom: 1rem;
        }
        .credits-widget h4 {
          margin: 0 0 0.5rem 0;
          font-size: 0.9rem;
          color: #a29bfe;
        }
        .gauge {
          height: 6px;
          background: var(--color-surface);
          border-radius: 10px;
          margin: 0.8rem 0;
          overflow: hidden;
        }
        .gauge-fill {
          height: 100%;
          background: #6c5ce7;
          transition: width 0.5s ease;
        }
        .credits-widget p {
          margin: 0;
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }
        .logout-btn {
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
          padding: 0.8rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 600;
        }
        .logout-btn:hover {
          background: #ff4757;
          color: white;
          border-color: #ff4757;
        }

        .dash-main {
          flex: 1;
          padding: 3rem;
          overflow-y: auto;
        }
        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3rem;
        }
        .dash-header h1 {
          font-size: 1.8rem;
          margin: 0;
        }
        .cta-button {
          background: #6c5ce7;
          color: white;
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .cta-button:hover {
          transform: translateY(-2px);
          background: #5f27cd;
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
