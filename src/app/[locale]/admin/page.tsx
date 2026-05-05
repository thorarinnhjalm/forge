"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setupAuthListener } from "@/lib/firebase/auth";
import Link from "next/link";

type AdminStats = {
  users: any[];
  sessions: any[];
  metrics: {
    totalUsers: number;
    totalSessions: number;
    totalTokens: number;
  }
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = setupAuthListener(async (user) => {
      if (!user) {
        router.push("/is/login");
        return;
      }
      
      try {
        const res = await fetch("/api/admin/stats");
        if (res.status === 403) {
          setError("Aðgangi hafnað. Þú hefur ekki stjórnendaréttindi.");
          setIsLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error("Villa við að sækja stjórnendagögn");
        }
        
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
        setError("Gat ekki sótt stjórnendagögn");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <div className="admin-layout flex-center">
        <div className="spinner" />
        <style jsx>{`
          .admin-layout { min-height: 100vh; background: #0a0a1a; }
          .flex-center { display: flex; align-items: center; justify-content: center; }
          .spinner { width: 40px; height: 40px; border: 4px solid #ff4757; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-layout flex-center" style={{ flexDirection: 'column', color: '#ff4757' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛔</h1>
        <h2>{error}</h2>
        <Link href="/is/dashboard" style={{ marginTop: '2rem', color: '#a29bfe' }}>Fara á venjulegt mælaborð</Link>
        <style jsx>{`
          .admin-layout { min-height: 100vh; background: #0a0a1a; }
          .flex-center { display: flex; align-items: center; justify-content: center; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <h1>Forge Stjórnborð</h1>
        <Link href="/is/dashboard" className="back-link">← Aftur á Mælaborð</Link>
      </header>

      <main className="admin-main">
        <section className="metrics-cards">
          <div className="metric-card">
            <h3>Heildarfjöldi Notenda</h3>
            <div className="number">{stats?.metrics.totalUsers}</div>
          </div>
          <div className="metric-card">
            <h3>Heildarfjöldi Verkefna</h3>
            <div className="number">{stats?.metrics.totalSessions}</div>
          </div>
          <div className="metric-card">
            <h3>Heildar Tokens Notuð</h3>
            <div className="number" style={{ color: "var(--color-accent)" }}>{stats?.metrics.totalTokens || 0}</div>
          </div>
        </section>

        <div className="tables-grid">
          <section className="admin-section">
            <h2>Alfa Prófarar (Notendur)</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Netfang</th>
                    <th>Skráð(ur)</th>
                    <th>Tokens Notuð</th>
                    <th>Inneign (Credits)</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.users.map(u => (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>{u.createdAt?._seconds ? new Date(u.createdAt._seconds * 1000).toLocaleDateString() : 'Óþekkt'}</td>
                      <td>{u.totalTokensUsed || 0}</td>
                      <td><span className="credit-badge">{u.credits?.balance ?? 0}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-section">
            <h2>Nýjustu Verkefni (Sessions)</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Lýsing (Fyrsta Spurning)</th>
                    <th>Notandi (ID)</th>
                    <th>Sandbox</th>
                    <th>Fj. Skilaboða</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.sessions.map(s => (
                    <tr key={s.id}>
                      <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.title}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#888' }}>{s.userId.substring(0,8)}...</td>
                      <td>
                        {s.sandboxId ? (
                          <a href={`https://${s.sandboxId}-8000.e2b.dev`} target="_blank" rel="noreferrer" style={{ color: '#27c93f' }}>
                            Skoða
                          </a>
                        ) : 'Ekkert'}
                      </td>
                      <td>{s.messageCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      <style jsx>{`
        .admin-layout {
          min-height: 100vh;
          background: var(--color-bg);
          color: var(--color-text-primary);
          font-family: 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 3rem;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
        }
        .admin-header h1 {
          margin: 0;
          color: #ff4757;
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .admin-header h1::before {
          content: '👑';
        }
        .back-link {
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: color 0.2s;
        }
        .back-link:hover {
          color: var(--color-accent);
        }

        .admin-main {
          padding: 3rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3rem;
        }

        .metrics-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        .metric-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
        }
        .metric-card h3 {
          margin: 0 0 1rem 0;
          color: var(--color-text-secondary);
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .metric-card .number {
          font-size: 3.5rem;
          font-weight: bold;
          color: #ff4757;
          line-height: 1;
        }

        .tables-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
        @media (max-width: 1024px) {
          .tables-grid {
            grid-template-columns: 1fr;
          }
        }

        .admin-section h2 {
          font-size: 1.2rem;
          margin-bottom: 1rem;
          color: var(--color-text-primary);
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 0.5rem;
        }

        .table-container {
          background: var(--color-surface);
          border-radius: 12px;
          border: 1px solid var(--color-border);
          overflow: hidden;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        th, td {
          padding: 1rem;
          border-bottom: 1px solid var(--color-border);
        }
        th {
          background: var(--color-surface-raised);
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          text-transform: uppercase;
        }
        tr:last-child td {
          border-bottom: none;
        }
        tr:hover {
          background: rgba(0, 0, 0, 0.02);
        }

        .credit-badge {
          background: rgba(108, 92, 231, 0.2);
          color: #a29bfe;
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
