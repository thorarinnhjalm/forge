"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { TechLevel } from "@/types";

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const [techLevel, setTechLevel] = useState<TechLevel>("beginner");
  
  return (
    <div className="settings-layout">
      <aside className="sidebar glass-panel">
        <div className="logo">Forge</div>
        <nav>
          <Link href="/dashboard">{t("myProjects")}</Link>
          <Link href="/settings" className="active">{t("settings")}</Link>
        </nav>
      </aside>

      <main className="settings-content">
        <h1>{t("settings")}</h1>

        <section className="settings-section card">
          <h2>{t("preferences")}</h2>
          
          <div className="setting-group">
            <label>{t("language")}</label>
            <select defaultValue="is" className="styled-select">
              <option value="is">Íslenska</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="setting-group">
            <label>{t("techLevel")}</label>
            <div className="level-buttons">
              {(["beginner", "intermediate", "comfortable"] as TechLevel[]).map(level => (
                <button 
                  key={level}
                  className={`level-btn ${techLevel === level ? "active" : ""}`}
                  onClick={() => setTechLevel(level)}
                >
                  {t(`level_${level}`)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="settings-section card">
          <h2>{t("account")}</h2>
          <p>Email: thorarinn@antigravity.is</p>
          <button className="danger-btn">{t("signOut")}</button>
        </section>
      </main>

      <style jsx>{`
        .settings-layout {
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
        .settings-content {
          flex: 1;
          padding: var(--space-6);
          max-width: 800px;
        }
        h1 {
          margin-bottom: var(--space-6);
        }
        .settings-section {
          margin-bottom: var(--space-4);
        }
        h2 {
          margin-bottom: var(--space-4);
          font-size: 1.2rem;
        }
        .setting-group {
          margin-bottom: var(--space-4);
        }
        label {
          display: block;
          margin-bottom: var(--space-2);
          color: var(--color-text-secondary);
        }
        .styled-select {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          width: 100%;
          max-width: 300px;
        }
        .level-buttons {
          display: flex;
          gap: var(--space-2);
        }
        .level-btn {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-md);
        }
        .level-btn.active {
          border-color: var(--color-accent);
          background: rgba(108, 92, 231, 0.1);
        }
        .danger-btn {
          background: transparent;
          border: 1px solid var(--color-error);
          color: var(--color-error);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-md);
          margin-top: var(--space-4);
        }
      `}</style>
    </div>
  );
}
