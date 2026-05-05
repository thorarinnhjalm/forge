"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Logo from "@/components/shared/Logo";

interface LandingHeroProps {
  title: string;
  description: string;
  ctaText: string;
}

export default function LandingHero({ title, description, ctaText }: LandingHeroProps) {
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "is";
  const tFeatures = useTranslations("Features");
  const tHow = useTranslations("HowItWorks");
  const tPrice = useTranslations("Pricing");
  const tFaq = useTranslations("FAQ");

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail) return;
    
    setWaitlistStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: waitlistEmail }),
      });
      
      if (res.ok) {
        setWaitlistStatus("success");
      } else {
        setWaitlistStatus("error");
      }
    } catch (err) {
      setWaitlistStatus("error");
    }
  };

  return (
    <div className="landing-container">
      {isWaitlistModalOpen && (
        <div className="modal-overlay" onClick={() => setIsWaitlistModalOpen(false)}>
          <div className="card modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setIsWaitlistModalOpen(false)}>×</button>
            <h2>{locale === 'is' ? 'Skráðu þig á biðlistann' : 'Join the waitlist'}</h2>
            <p>{locale === 'is' ? 'Fáðu aðgang um leið og Forge fer í loftið.' : 'Get access as soon as Forge launches.'}</p>
            
            {waitlistStatus === "success" ? (
              <div className="success-msg">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <h3>{locale === 'is' ? 'Takk fyrir skráninguna!' : 'Thanks for joining!'}</h3>
                <button className="cta-button outline-btn" onClick={() => setIsWaitlistModalOpen(false)} style={{marginTop: '1rem', width: '100%'}}>Loka</button>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="waitlist-form">
                <input 
                  type="email" 
                  placeholder={locale === 'is' ? 'Netfangið þitt' : 'Your email address'} 
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  required 
                  className="email-input"
                />
                {waitlistStatus === "error" && (
                  <p className="error-msg">{locale === 'is' ? 'Eitthvað fór úrskeiðis. Reyndu aftur.' : 'Something went wrong. Please try again.'}</p>
                )}
                <button type="submit" className="cta-button" disabled={waitlistStatus === "loading"}>
                  {waitlistStatus === "loading" ? "..." : (locale === 'is' ? 'Skrá mig' : 'Join Now')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      <div className="hero animate-slide-up">
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="hero-actions">
          <button 
            className="cta-button" 
            onClick={() => router.push(`/${locale}/freeform`)}
          >
            {ctaText}
          </button>
        </div>
      </div>

      <div className="features-grid animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <div className="feature-card card">
          <div className="feature-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          </div>
          <h3>{tFeatures("feature1_title")}</h3>
          <p>{tFeatures("feature1_desc")}</p>
        </div>
        <div className="feature-card card">
          <div className="feature-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <h3>{tFeatures("feature2_title")}</h3>
          <p>{tFeatures("feature2_desc")}</p>
        </div>
        <div className="feature-card card">
          <div className="feature-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
          </div>
          <h3>{tFeatures("feature3_title")}</h3>
          <p>{tFeatures("feature3_desc")}</p>
        </div>
      </div>

      <div id="features" className="how-it-works animate-fade-in" style={{ animationDelay: "0.4s" }}>
        <h2>{tHow("title")}</h2>
        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">1</div>
            <h4>{tHow("step1_title")}</h4>
            <p>{tHow("step1_desc")}</p>
          </div>
          <div className="step-connector"></div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h4>{tHow("step2_title")}</h4>
            <p>{tHow("step2_desc")}</p>
          </div>
          <div className="step-connector"></div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h4>{tHow("step3_title")}</h4>
            <p>{tHow("step3_desc")}</p>
          </div>
        </div>
      </div>

      <div id="pricing" className="pricing-section animate-fade-in" style={{ animationDelay: "0.6s" }}>
        <h2>{tPrice("title")}</h2>
        <p className="subtitle">{tPrice("subtitle")}</p>
        
        <div className="pricing-cards">
          <div className="pricing-card card">
            <h3>{tPrice("free_title")}</h3>
            <div className="price">{tPrice("free_price")}</div>
            <ul className="features-list">
              <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> {tPrice("free_feature1")}</li>
              <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> {tPrice("free_feature2")}</li>
              <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> {tPrice("free_feature3")}</li>
            </ul>
            <button className="cta-button outline-btn" onClick={() => router.push(`/${locale}/freeform`)}>
              {tPrice("free_cta")}
            </button>
          </div>

          <div className="pricing-card card pro-card">
            <div className="popular-badge">{tPrice("recommended")}</div>
            <h3>{tPrice("pro_title")}</h3>
            <div className="price">
              {tPrice("pro_price")}<span className="period">{tPrice("pro_period")}</span>
            </div>
            <ul className="features-list">
              <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> {tPrice("pro_feature1")}</li>
              <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> {tPrice("pro_feature2")}</li>
              <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> {tPrice("pro_feature3")}</li>
            </ul>
            <button className="cta-button" onClick={() => router.push(`/${locale}/freeform`)}>
              {tPrice("pro_cta")}
            </button>
          </div>
        </div>
      </div>

      <div id="faq" className="faq-section animate-fade-in" style={{ animationDelay: "0.8s" }}>
        <h2>{tFaq("title")}</h2>
        <div className="faq-grid">
          <div className="faq-item">
            <h4>{tFaq("q1")}</h4>
            <p>{tFaq("a1")}</p>
          </div>
          <div className="faq-item">
            <h4>{tFaq("q2")}</h4>
            <p>{tFaq("a2")}</p>
          </div>
          <div className="faq-item">
            <h4>{tFaq("q3")}</h4>
            <p>{tFaq("a3")}</p>
          </div>
          <div className="faq-item">
            <h4>{tFaq("q4")}</h4>
            <p>{tFaq("a4")}</p>
          </div>
          <div className="faq-item">
            <h4>{tFaq("q5")}</h4>
            <p>{tFaq("a5")}</p>
          </div>
          <div className="faq-item">
            <h4>{tFaq("q6")}</h4>
            <p>{tFaq("a6")}</p>
          </div>
        </div>
      </div>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Logo />
            <p>{title}</p>
          </div>
          <div className="footer-links">
            <a href="#features">Eiginleikar</a>
            <a href="#pricing">Verðskrá</a>
            <a href="#faq">Spurningar</a>
            <a href="#" onClick={(e) => { e.preventDefault(); router.push(`/${locale}/freeform`); }}>{ctaText}</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Forge AI er skráð vörumerki.</p>
          <p className="company-details">
            Rekstraraðili: Neðri Hóll Hugmyndahús ehf. (Kt. 470126-2480) | VSK nr. 159950<br/>
            Álfhólsvegi 97, 200 Kópavogur
          </p>
        </div>
      </footer>

      <style jsx>{`
        .landing-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }
        .hero {
          margin-bottom: var(--space-12);
        }
        .hero-actions {
          margin-top: var(--space-6);
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--space-4);
          width: 100%;
        }
        .feature-card {
          text-align: left;
          padding: var(--space-5);
        }
        .feature-icon {
          font-size: 2.5rem;
          margin-bottom: var(--space-3);
          background: var(--color-bg);
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          color: var(--color-accent);
        }
        .feature-card h3 {
          margin-bottom: var(--space-2);
          font-size: 1.2rem;
        }

        .how-it-works {
          margin-top: var(--space-12);
          width: 100%;
          text-align: center;
          padding-top: var(--space-8);
          border-top: 1px solid var(--color-border);
        }
        .how-it-works h2 {
          margin-bottom: var(--space-8);
          font-size: 2rem;
        }
        .steps-container {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-4);
          max-width: 1000px;
          margin: 0 auto;
        }
        .step-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .step-number {
          width: 48px;
          height: 48px;
          background: var(--color-bg);
          border: 2px solid var(--color-accent);
          color: var(--color-accent);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: var(--space-4);
        }
        .step-card h4 {
          margin-bottom: var(--space-2);
          font-size: 1.1rem;
        }
        .step-connector {
          flex: 0.2;
          height: 2px;
          background: var(--color-border);
          margin-top: 24px; /* Aligns with middle of step-number */
        }

        @media (max-width: 768px) {
          .steps-container {
            flex-direction: column;
            align-items: center;
            gap: var(--space-8);
          }
          .step-connector {
            display: none;
          }
          .step-card {
            max-width: 400px;
          }
        }

        .pricing-section {
          margin-top: var(--space-12);
          width: 100%;
          text-align: center;
          padding: var(--space-8) 0;
          border-top: 1px solid var(--color-border);
        }
        .pricing-section h2 {
          font-size: 2rem;
          margin-bottom: var(--space-2);
        }
        .subtitle {
          margin-bottom: var(--space-8);
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        .pricing-cards {
          display: flex;
          justify-content: center;
          gap: var(--space-6);
          max-width: 800px;
          margin: 0 auto;
        }
        .pricing-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: var(--space-6);
          text-align: left;
          position: relative;
        }
        .pro-card {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 1px var(--color-accent), var(--shadow-md);
        }
        .popular-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--color-accent);
          color: white;
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: bold;
        }
        .price {
          font-size: 2.5rem;
          font-weight: 700;
          margin: var(--space-4) 0;
          color: var(--color-text-primary);
        }
        .period {
          font-size: 1rem;
          color: var(--color-text-secondary);
          font-weight: normal;
        }
        .features-list {
          list-style: none;
          margin-bottom: var(--space-6);
          flex: 1;
        }
        .features-list li {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: var(--space-3);
          color: var(--color-text-secondary);
        }
        .features-list svg {
          color: var(--color-success);
          flex-shrink: 0;
        }
        .outline-btn {
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
          box-shadow: none;
        }
        .outline-btn:hover {
          background: var(--color-surface-raised);
          border-color: var(--color-text-primary);
        }

        .faq-section {
          margin-top: var(--space-12);
          width: 100%;
          text-align: left;
          padding: var(--space-8) 0;
          border-top: 1px solid var(--color-border);
        }
        .faq-section h2 {
          text-align: center;
          font-size: 2rem;
          margin-bottom: var(--space-8);
        }
        .faq-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--space-6);
          max-width: 900px;
          margin: 0 auto;
        }
        .faq-item h4 {
          font-size: 1.1rem;
          margin-bottom: var(--space-2);
          color: var(--color-text-primary);
        }
        .faq-item p {
          color: var(--color-text-secondary);
          line-height: 1.6;
        }

        .landing-footer {
          margin-top: var(--space-12);
          width: 100%;
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          padding: var(--space-8) var(--space-4) var(--space-4);
          text-align: center;
        }
        .footer-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-6);
          margin-bottom: var(--space-8);
        }
        .footer-brand {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
        }
        .footer-brand p {
          color: var(--color-text-secondary);
          font-size: 0.9rem;
          max-width: 300px;
          margin-top: var(--space-2);
        }
        .footer-links {
          display: flex;
          gap: var(--space-4);
          flex-wrap: wrap;
          justify-content: center;
        }
        .footer-links a {
          color: var(--color-text-primary);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }
        .footer-links a:hover {
          color: var(--color-accent);
        }
        .footer-bottom {
          border-top: 1px solid var(--color-border);
          padding-top: var(--space-4);
          color: var(--color-text-secondary);
          font-size: 0.8rem;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .company-details {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          opacity: 0.8;
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .pricing-cards {
            flex-direction: column;
          }
        }
        
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
        .waitlist-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .email-input {
          padding: 12px 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          background: var(--color-bg);
          color: var(--color-text-primary);
          font-size: 1rem;
        }
        .email-input:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 2px rgba(var(--color-accent-rgb), 0.2);
        }
        .success-msg {
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        .error-msg {
          color: var(--color-danger);
          font-size: 0.85rem;
          text-align: left;
        }
      `}</style>
    </div>
  );
}
