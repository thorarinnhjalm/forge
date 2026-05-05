"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const router = useRouter();

  // Mock data
  const projects = [
    { id: "1", name: "Búðarlisti", status: "deployed", progress: 100, url: "https://budarlisti.forge.app" },
    { id: "2", name: "Bókunarform", status: "building", progress: 60, url: null }
  ];

  return (
    <div className="dashboard-layout">
      <aside className="sidebar glass-panel">
        <div className="logo">Forge</div>
        <nav>
          <Link href="/dashboard" className="active">{t("myProjects")}</Link>
          <Link href="/settings">{t("settings")}</Link>
        </nav>
        
        <div className="credits-widget">
          <h4>{t("creditsRemaining")}</h4>
          <div className="gauge">
            <div className="gauge-fill" style={{ width: "85%" }}></div>
          </div>
          <p>425 / 500</p>
        </div>
      </aside>

      <main className="dashboard-content">
        <header className="dash-header">
          <h1>{t("welcome")}</h1>
          <button 
            className="cta-button"
            onClick={async () => {
              const res = await fetch('/api/sessions', { 
                method: 'POST', 
                body: JSON.stringify({ projectId: 'shopping-list', userId: 'test-user-123' }),
                headers: { 'Content-Type': 'application/json' }
              });
              const data = await res.json();
              if (data.sessionId) {
                router.push(`/en/session/${data.sessionId}`);
              }
            }}
          >
            Byrja Búðarlista (Test)
          </button>
        </header>

        <section className="projects-grid">
          {projects.map(p => (
            <div key={p.id} className="card project-card">
              <div className="status-badge" data-status={p.status}>
                {t(`status_${p.status}`)}
              </div>
              <h3>{p.name}</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${p.progress}%` }}></div>
              </div>
              {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer">{t("viewLive")}</a>}
              {!p.url && <Link href={`/session/${p.id}`} className="continue-link">{t("continueBuilding")}</Link>}
            </div>
          ))}
        </section>
      </main>

      <style jsx>{`
        .dashboard-layout {
          display: flex;
          height: 100vh;
        }
        .sidebar {
          width: 250px;
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--color-border);
        }
        .logo {
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--color-accent);
          margin-bottom: var(--space-6);
        }
        nav {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          flex: 1;
        }
        nav a {
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
        }
        nav a.active {
          background: rgba(108, 92, 231, 0.1);
          color: var(--color-accent);
          font-weight: 500;
        }
        .credits-widget {
          margin-top: auto;
          background: var(--color-surface);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }
        .gauge {
          height: 6px;
          background: var(--color-surface-raised);
          border-radius: var(--radius-full);
          margin: var(--space-2) 0;
          overflow: hidden;
        }
        .gauge-fill {
          height: 100%;
          background: var(--color-warm);
        }
        .dashboard-content {
          flex: 1;
          padding: var(--space-6);
          overflow-y: auto;
        }
        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-6);
        }
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: var(--space-4);
        }
        .project-card {
          position: relative;
        }
        .status-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }
        .status-badge[data-status="deployed"] {
          background: rgba(46, 213, 115, 0.2);
          color: var(--color-success);
        }
        .status-badge[data-status="building"] {
          background: rgba(255, 165, 2, 0.2);
          color: var(--color-warm);
        }
        .progress-bar {
          height: 4px;
          background: var(--color-surface-raised);
          border-radius: var(--radius-full);
          margin: var(--space-3) 0;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: var(--color-accent);
        }
      `}</style>
    </div>
  );
}
