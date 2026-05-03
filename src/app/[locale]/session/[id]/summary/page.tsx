"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { auth } from "@/lib/firebase/firebaseConfig";
import { linkWithGithub } from "@/lib/firebase/auth";

export default function SessionSummaryPage({ params }: { params: { locale: string, id: string } }) {
  const t = useTranslations("Summary");

  // Mock concepts
  const concepts = [
    { title: "Components", desc: "Endurnýtanlegir kubbar sem mynda viðmótið þitt." },
    { title: "State", desc: "Hvernig forritið man upplýsingar meðan á notkun stendur." }
  ];

  const [isDeploying, setIsDeploying] = useState(false);
  const [vercelUrl, setVercelUrl] = useState<string | null>(null);

  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");

      // 1. Link GitHub and get token
      const { token } = await linkWithGithub(user);
      if (!token) throw new Error("No GitHub token received");

      // 2. Fetch the generated files (Mocked for MVP)
      const mockFiles = [
        { path: 'package.json', content: '{"name": "forge-app", "scripts": {"dev": "next dev", "build": "next build", "start": "next start"}, "dependencies": {"next": "latest", "react": "latest", "react-dom": "latest"}}' },
        { path: 'src/app/page.tsx', content: 'export default function Home() { return <div><h1>Built with Forge</h1></div>; }' }
      ];

      // 3. Call Deploy API
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubToken: token,
          projectName: `app-${params.id}`,
          files: mockFiles
        })
      });

      const data = await res.json();
      if (data.success) {
        setVercelUrl(data.vercelDeployUrl);
      } else {
        alert("Deploy failed: " + data.error);
      }
    } catch (e: any) {
      console.error(e);
      alert("Error linking GitHub or deploying: " + e.message);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <main className="summary-main">
      <div className="card summary-card animate-slide-up">
        <div className="success-icon">✓</div>
        <h1>{t("title")}</h1>
        <p className="subtitle">{t("subtitle")}</p>

        <section className="concepts-section">
          <h3>{t("conceptsLearned")}</h3>
          <div className="concepts-grid">
            {concepts.map((c, i) => (
              <div key={i} className="concept-card">
                <h4>{c.title}</h4>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="actions">
          <Link href={`/dashboard`} className="cta-button secondary">{t("toDashboard")}</Link>
          <Link href={`/session/${params.id}`} className="cta-button secondary">{t("continueProject")}</Link>
          
          {!vercelUrl ? (
            <button className="cta-button" onClick={handleDeploy} disabled={isDeploying}>
              {isDeploying ? "Tengir..." : "Gefa út (Publish)"}
            </button>
          ) : (
            <a href={vercelUrl} target="_blank" rel="noopener noreferrer" className="cta-button" style={{ background: '#000' }}>
              ▲ Deploy to Vercel
            </a>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .summary-main {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
        }
        .summary-card {
          width: 100%;
          max-width: 600px;
          text-align: center;
          padding: var(--space-6);
        }
        .success-icon {
          width: 64px;
          height: 64px;
          background: rgba(46, 213, 115, 0.1);
          color: var(--color-success);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin: 0 auto var(--space-4);
        }
        h1 {
          margin-bottom: var(--space-2);
        }
        .subtitle {
          margin-bottom: var(--space-6);
        }
        .concepts-section {
          text-align: left;
          margin-bottom: var(--space-6);
        }
        .concepts-section h3 {
          margin-bottom: var(--space-3);
          font-size: 1.1rem;
        }
        .concepts-grid {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .concept-card {
          background: var(--color-bg);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }
        .concept-card h4 {
          color: var(--color-accent);
          margin-bottom: 4px;
        }
        .actions {
          display: flex;
          gap: var(--space-3);
          justify-content: center;
        }
        .secondary {
          background: var(--color-surface-raised);
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
        }
      `}</style>
    </main>
  );
}
