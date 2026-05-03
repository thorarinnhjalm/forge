"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { TechLevel } from "@/types";

const STARTER_PROJECTS = [
  {
    id: "shopping-list",
    title: { is: "Búðarlisti", en: "Shopping List" },
    description: { is: "Einfalt smáforrit til að halda utan um innkaupin. Gott byrjendaverkefni.", en: "A simple app to keep track of groceries. Great for beginners." },
    difficulty: "easy"
  },
  {
    id: "booking-form",
    title: { is: "Bókunarform", en: "Booking Form" },
    description: { is: "Samskiptaform með staðfestingu í tölvupósti.", en: "Contact form with email confirmation." },
    difficulty: "medium"
  },
  {
    id: "event-page",
    title: { is: "Atburðasíða", en: "Event Page" },
    description: { is: "Lendingarsíða fyrir viðburð með skráningu gesta.", en: "Event landing page with attendee registration." },
    difficulty: "medium"
  }
];

export default function OnboardingPage() {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as "is" | "en") || "is";
  
  const [step, setStep] = useState(1);
  const [techLevel, setTechLevel] = useState<TechLevel | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // SKIP FIREBASE API FOR TESTING
      /*
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ techLevel, language: locale })
      });
      */
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 800));

      router.push(`/${locale}/session/${selectedProject}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="onboarding-main">
      <div className="card onboarding-card">
        {/* Step 1: Tech Level */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h2>{t("techLevelTitle")}</h2>
            <p className="subtitle">{t("techLevelDesc")}</p>
            
            <div className="options-grid">
              {(["beginner", "intermediate", "comfortable"] as TechLevel[]).map((level) => (
                <button 
                  key={level}
                  className={`option-card ${techLevel === level ? "selected" : ""}`}
                  onClick={() => {
                    setTechLevel(level);
                    setTimeout(() => setStep(2), 300);
                  }}
                >
                  <h3>{t(`level_${level}`)}</h3>
                  <p>{t(`level_${level}_desc`)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Project Selection */}
        {step === 2 && (
          <div className="animate-fade-in">
            <button className="back-btn" onClick={() => setStep(1)}>← {t("back")}</button>
            <h2>{t("projectTitle")}</h2>
            <p className="subtitle">{t("projectDesc")}</p>
            
            <div className="projects-grid">
              {STARTER_PROJECTS.map((project) => (
                <div 
                  key={project.id}
                  className={`project-card card ${selectedProject === project.id ? "selected" : ""}`}
                  onClick={() => setSelectedProject(project.id)}
                >
                  <div className="difficulty-badge">{t(`diff_${project.difficulty}`)}</div>
                  <h3>{project.title[locale]}</h3>
                  <p>{project.description[locale]}</p>
                </div>
              ))}
            </div>

            <button 
              className="cta-button continue-btn"
              disabled={!selectedProject || isSubmitting}
              onClick={handleComplete}
            >
              {isSubmitting ? t("loading") : t("startBuilding")}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .onboarding-main {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
        }
        .onboarding-card {
          width: 100%;
          max-width: 800px;
          min-height: 500px;
          display: flex;
          flex-direction: column;
        }
        h2 {
          font-size: 2rem;
          margin-bottom: var(--space-2);
        }
        .subtitle {
          margin-bottom: var(--space-6);
        }
        .back-btn {
          background: none;
          border: none;
          color: var(--color-text-secondary);
          margin-bottom: var(--space-4);
          padding: 0;
        }
        .back-btn:hover {
          color: var(--color-accent);
        }
        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-4);
        }
        .option-card {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          text-align: left;
          color: var(--color-text-primary);
          transition: all 0.2s ease;
        }
        .option-card:hover {
          border-color: var(--color-accent);
          transform: translateY(-2px);
        }
        .option-card.selected {
          border-color: var(--color-accent);
          background: rgba(108, 92, 231, 0.1);
        }
        .option-card h3 {
          margin-bottom: var(--space-2);
          font-size: 1.25rem;
        }
        .option-card p {
          font-size: 0.9rem;
        }
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }
        .project-card {
          cursor: pointer;
          position: relative;
        }
        .project-card.selected {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 1px var(--color-accent);
        }
        .difficulty-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          font-size: 0.75rem;
          background: var(--color-bg);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          color: var(--color-text-secondary);
        }
        .continue-btn {
          width: 100%;
        }
        .continue-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </main>
  );
}
