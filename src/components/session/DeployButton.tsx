"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function DeployButton({ projectId }: { projectId: string }) {
  const t = useTranslations("Deploy");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);

  const handleDeploy = async () => {
    setIsDeploying(true);
    // Mock API call to trigger final deployment
    setTimeout(() => {
      setDeployUrl(`https://${projectId}.forge.app`);
      setIsDeploying(false);
    }, 4000);
  };

  return (
    <div className="deploy-container">
      {!deployUrl ? (
        <button 
          className="cta-button" 
          onClick={handleDeploy} 
          disabled={isDeploying}
        >
          {isDeploying ? t("deploying") : t("deployNow")}
        </button>
      ) : (
        <div className="deploy-success">
          <p>{t("success")}</p>
          <a href={deployUrl} target="_blank" rel="noopener noreferrer" className="live-link">
            {deployUrl}
          </a>
        </div>
      )}
      
      <style jsx>{`
        .deploy-container {
          margin-top: var(--space-4);
          text-align: center;
        }
        .deploy-success {
          background: rgba(46, 213, 115, 0.1);
          border: 1px solid var(--color-success);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          animation: fadeIn 0.5s ease;
        }
        .live-link {
          font-weight: bold;
          display: inline-block;
          margin-top: var(--space-2);
        }
      `}</style>
    </div>
  );
}
