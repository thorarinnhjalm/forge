export default function Logo() {
  return (
    <div className="logo-container">
      <svg 
        width="32" 
        height="32" 
        viewBox="0 0 40 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="8" fill="var(--color-accent)"/>
        <path d="M12 28V12L28 20L12 28Z" fill="white"/>
        <path d="M16 25V15L24 20L16 25Z" fill="var(--color-accent)"/>
        <circle cx="28" cy="20" r="3" fill="var(--color-warm)"/>
      </svg>
      <span className="logo-text">Forge</span>

      <style jsx>{`
        .logo-container {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: 700;
          font-size: 1.25rem;
          color: var(--color-text-primary);
          letter-spacing: -0.03em;
        }
        .logo-text {
          background: linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div>
  );
}
