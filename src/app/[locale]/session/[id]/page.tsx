"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";

const EDUCATIONAL_TIPS = [
  "Búa til 'State' þýðir að appið fær minni til að muna hlutina, rétt eins og þú mannst hvað þú ætlaðir að kaupa.",
  "React 'Components' eru eins og kubbar. Við búum til einn kubb fyrir takkann og notum hann svo alls staðar.",
  "Þegar þú biður appið um að gera eitthvað, bregðast svokallaðir 'Event Listeners' við, eins og afgreiðslufólk sem bíður eftir pöntun.",
  "Gervigreindin er núna að skrifa og setja saman kóðann línur fyrir línu. Það tekur smá stund að byggja góðan grunn!"
];

export default function SessionPage({ params }: { params: Promise<{ locale: string, id: string }> }) {
  const { id: sessionId } = use(params);
  const t = useTranslations("Session");
  
  const [messages, setMessages] = useState<{role: 'system' | 'user', text: string}[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(true); // Start true while loading intro
  const [tipIndex, setTipIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentState, setCurrentState] = useState<string>("idle");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % EDUCATIONAL_TIPS.length);
      }, 5000); // Bytir um útskýringu á 5 sek fresti
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    // Start the step automatically on mount
    const initSession = async () => {
      try {
        const res = await fetch('/api/orchestrator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionId, event: { type: 'START_STEP' } })
        });
        const data = await res.json();
        if (data.response) {
          setMessages([{ role: 'system', text: data.response }]);
        }
        setCurrentState(data.state);
        setIsGenerating(false);
      } catch (e) {
        console.error(e);
        setIsGenerating(false);
      }
    };
    initSession();
  }, [sessionId]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;
    
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setInput("");
    setIsGenerating(true);
    setTipIndex(0);
    
    try {
      const res = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: sessionId, 
          event: { type: 'USER_DECISION', payload: input } 
        })
      });
      const data = await res.json();
      
      // Extract the AI message from whatever format the orchestrator returns
      let aiMessage: string | null = null;
      if (data.response) {
        if (typeof data.response === 'string') {
          aiMessage = data.response;
        } else if (data.response.explanation) {
          aiMessage = data.response.explanation;
        } else if (data.response.message) {
          aiMessage = data.response.message;
        }
      }
      
      if (aiMessage) {
        setMessages(prev => [...prev, { role: 'system', text: aiMessage! }]);
      } else if (data.state === 'error') {
        setMessages(prev => [...prev, { role: 'system', text: "Villa kom upp. Prófaðu aftur." }]);
      } else {
        setMessages(prev => [...prev, { role: 'system', text: `Skref klárað! Staða: ${data.state}` }]);
      }
      
      if (data.previewUrl) {
        setPreviewUrl(data.previewUrl);
      }
      setCurrentState(data.state);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'system', text: "Villa við að tengjast Forge AI." }]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="session-layout">
      {/* Top Bar */}
      <header className="session-header glass-panel">
        <div className="progress-container">
          <span className="step-label">Skref 1 af 5</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: "20%" }}></div>
          </div>
        </div>
        <div className="credits-badge">
          <span>⚡ 450</span>
        </div>
      </header>

      <div className="session-workspace">
        {/* Left Panel: Chat & Teaching */}
        <section className="chat-panel card">
          <div className="messages-scroll">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-bubble">{msg.text}</div>
                {msg.role === 'system' && idx === 0 && (
                  <button className="why-button">Af hverju?</button>
                )}
              </div>
            ))}
            
            {isGenerating && (
              <div className="message system generating-module">
                <div className="message-bubble loading-bubble">
                  <div className="spinner"></div>
                  <div className="educational-content">
                    <h5>Vissir þú?</h5>
                    <p>{EDUCATIONAL_TIPS[tipIndex]}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="chat-input-area">
            <input 
              type="text" 
              placeholder="Spyrðu Forge spurningar..." 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} className="send-btn">Senda</button>
          </div>
        </section>

        {/* Right Panel: Live Preview & Terminal */}
        <section className="preview-panel">
          <div className="browser-frame card">
            <div className="browser-header">
              <div className="dots">
                <span></span><span></span><span></span>
              </div>
              <div className="url-bar">localhost:3000</div>
            </div>
            <div className="browser-content">
              {previewUrl ? (
                <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Preview" />
              ) : (
                <div className="placeholder-preview">
                  <h2>Búðarlisti</h2>
                  <p>Hér mun appið þitt birtast fljótlega nad því er byggt.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="terminal-panel card">
            <div className="terminal-header">Terminal</div>
            <div className="terminal-content">
              <span className="prompt">$</span> npm start<br/>
              <span className="output">Starting server...<br/>Ready on http://localhost:3000</span>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .session-layout {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--color-bg);
          overflow: hidden;
        }
        
        .session-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-2) var(--space-4);
          margin: var(--space-2);
          border-radius: var(--radius-md);
        }
        
        .progress-container {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          flex: 1;
          max-width: 400px;
        }
        
        .step-label {
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        .progress-bar {
          flex: 1;
          height: 6px;
          background: var(--color-surface-raised);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: var(--color-warm);
          border-radius: var(--radius-full);
          transition: width 0.3s ease;
        }
        
        .credits-badge {
          background: var(--color-surface-raised);
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-weight: 500;
          font-size: 0.9rem;
          color: var(--color-warm);
        }
        
        .session-workspace {
          display: flex;
          flex: 1;
          gap: var(--space-3);
          padding: 0 var(--space-2) var(--space-2);
          min-height: 0;
        }
        
        .chat-panel {
          flex: 1;
          max-width: 450px;
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
        }
        
        .messages-scroll {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        
        .message.system {
          align-items: flex-start;
        }
        
        .message.user {
          display: flex;
          justify-content: flex-end;
        }
        
        .message-bubble {
          background: var(--color-surface-raised);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          max-width: 85%;
          line-height: 1.5;
        }
        
        .message.user .message-bubble {
          background: var(--color-accent);
          color: white;
        }
        
        .why-button {
          margin-top: var(--space-2);
          background: none;
          border: 1px solid var(--color-accent);
          color: var(--color-accent);
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          transition: all 0.2s;
        }
        
        .why-button:hover {
          background: var(--color-accent);
          color: white;
        }

        .generating-module {
          animation: fadeIn 0.3s ease;
        }
        
        .loading-bubble {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          border: 1px solid var(--color-accent);
          background: rgba(108, 92, 231, 0.05) !important;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--color-accent);
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-top: 2px;
        }

        .educational-content h5 {
          color: var(--color-accent);
          margin-bottom: 4px;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .educational-content p {
          font-size: 0.95rem;
          line-height: 1.4;
          transition: opacity 0.3s ease;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .chat-input-area {
          padding: var(--space-3);
          border-top: 1px solid var(--color-border);
          display: flex;
          gap: var(--space-2);
        }
        
        .chat-input-area input {
          flex: 1;
          background: #1a1a2e;
          border: 1px solid #333;
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          color: #f0f0f0;
          outline: none;
        }
        
        .chat-input-area input:focus {
          border-color: var(--color-accent);
        }
        
        .send-btn {
          background: var(--color-accent);
          color: white;
          border: none;
          padding: 0 var(--space-4);
          border-radius: var(--radius-md);
          font-weight: 500;
        }
        
        .preview-panel {
          flex: 2;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        
        .browser-frame {
          flex: 3;
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
        }
        
        .browser-header {
          display: flex;
          align-items: center;
          padding: var(--space-2) var(--space-3);
          background: var(--color-surface-raised);
          border-bottom: 1px solid var(--color-border);
        }
        
        .dots {
          display: flex;
          gap: 6px;
          margin-right: var(--space-4);
        }
        
        .dots span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--color-border);
        }
        
        .url-bar {
          background: var(--color-surface);
          padding: 4px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          flex: 1;
          text-align: center;
        }
        
        .browser-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff; /* True white for the app preview */
          color: #000;
        }
        
        .placeholder-preview {
          text-align: center;
          color: #666;
        }
        
        .terminal-panel {
          flex: 1;
          padding: 0;
          display: flex;
          flex-direction: column;
          background: #000;
          border-color: #333;
        }
        
        .terminal-header {
          padding: var(--space-2) var(--space-3);
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          border-bottom: 1px solid #333;
          font-family: var(--font-ui);
        }
        
        .terminal-content {
          padding: var(--space-3);
          font-family: var(--font-code);
          font-size: 0.85rem;
          color: #ddd;
          overflow-y: auto;
        }
        
        .prompt {
          color: var(--color-success);
          margin-right: 8px;
        }
        
        .output {
          color: #888;
        }
      `}</style>
    </div>
  );
}
