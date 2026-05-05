"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useParams, usePathname, useRouter } from "next/navigation";
import Logo from "./Logo";

export default function TopBar() {
  const t = useTranslations("Navigation");
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  
  const locale = params?.locale || "is";
  const otherLocale = locale === "is" ? "en" : "is";
  
  const isAppMode = pathname.includes("/dashboard") || pathname.includes("/freeform") || pathname.includes("/admin");
  const isOldBuilder = pathname.includes("/session");

  if (isOldBuilder) return null;

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href={`/${locale}`} className="logo-link">
          <Logo />
        </Link>

        <nav className="nav-links">
          {isAppMode ? (
            <>
              <Link href={`/${locale}/dashboard`}>Mælaborð</Link>
              <Link href={`/${locale}/freeform`}>Nýtt Verkefni</Link>
            </>
          ) : (
            <>
              <Link href={`/${locale}/#features`}>{t("features")}</Link>
              <Link href={`/${locale}/#pricing`}>{t("pricing")}</Link>
              <Link href={`/${locale}/#faq`}>{t("faq")}</Link>
            </>
          )}
        </nav>

        <div className="nav-actions">
          <Link href={`/${otherLocale}${pathname.replace(`/${locale}`, "")}`} className="lang-toggle">
            {otherLocale.toUpperCase()}
          </Link>
          {isAppMode ? (
            <button className="text-btn" onClick={() => router.push(`/${locale}/login`)}>Útskrá</button>
          ) : (
            <>
              <button className="text-btn" onClick={() => router.push(`/${locale}/dashboard`)}>{t("signIn")}</button>
              <button className="cta-button nav-cta" onClick={() => router.push(`/${locale}/onboarding`)}>
                {t("startBuilding")}
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .topbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--color-border);
        }
        .topbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--space-3) var(--space-4);
          height: 72px;
        }
        .logo-link {
          text-decoration: none;
        }
        .nav-links {
          display: flex;
          gap: var(--space-6);
        }
        .nav-links a {
          color: var(--color-text-secondary);
          font-weight: 500;
          font-size: 0.95rem;
          transition: color 0.2s ease;
        }
        .nav-links a:hover {
          color: var(--color-text-primary);
        }
        .nav-actions {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }
        .lang-toggle {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          background: var(--color-surface-raised);
        }
        .text-btn {
          background: none;
          border: none;
          color: var(--color-text-primary);
          font-weight: 500;
          font-size: 0.95rem;
        }
        .text-btn:hover {
          color: var(--color-accent);
        }
        .nav-cta {
          padding: 8px 16px;
          font-size: 0.95rem;
        }

        @media (max-width: 768px) {
          .nav-links {
            display: none;
          }
          .nav-actions .text-btn {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
