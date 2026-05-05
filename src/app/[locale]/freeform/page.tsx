"use client";

import { useState, useRef, useEffect } from "react";
import { setupAuthListener } from "@/lib/firebase/auth";
import { User } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";

const TIPS = [
  "Gervigreindin er að skrifa HTML, CSS og JavaScript kóðann...",
  "Hún hugsar um útlit, litaval og virkni á sama tíma.",
  "Kóðinn er keyrður í öruggum sandkassa í skýinu.",
  "Eftir smá stund birtist appið þitt lifandi hér!",
];

type Option = {
  id: string;
  title: string;
  description: string;
  pros: string[];
  cons: string[];
};

type Message = {
  role: "user" | "forge";
  content: string;
  options?: Option[];
};

export default function FreeformPage() {
  const [description, setDescription] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentFiles, setCurrentFiles] = useState<any[] | null>(null);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);

  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string>("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSessionId(Date.now().toString(36) + Math.random().toString(36).substring(2));
    const unsubscribe = setupAuthListener((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !sessionId || messages.length === 0) return;
    const saveSession = async () => {
      try {
        await setDoc(doc(db, "forge_freeform_sessions", sessionId), {
          userId: user.uid,
          messages,
          sandboxId: sandboxId || null,
          currentFiles: currentFiles || null,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error("Failed to save session:", err);
      }
    };
    saveSession();
  }, [messages, sandboxId, currentFiles, user, sessionId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBuilding, isProbing]);

  const processUserInput = async (text: string) => {
    if (!text.trim() || isBuilding || isProbing) return;

    const userPrompt = text.trim();
    setDescription("");
    
    // Add user message to chat
    const updatedMessages: Message[] = [...messages, { role: "user", content: userPrompt }];
    setMessages(updatedMessages);
    setError(null);

    // If sandboxId exists, we are iterating an existing app. Bypass probing.
    if (sandboxId) {
      if (userPrompt.startsWith("🤔 Útskýrðu")) {
        await explainCode(userPrompt, updatedMessages);
      } else {
        await buildApp(userPrompt, updatedMessages);
      }
      return;
    }

    // Otherwise, we are in the probing phase.
    setIsProbing(true);

    try {
      const probeRes = await fetch("/api/freeform/probing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: updatedMessages }),
      });
      const probeData = await probeRes.json();

      if (probeData.success) {
        if (!probeData.readyToBuild) {
          // Not ready to build, ask the question
          setMessages((prev) => [
            ...prev,
            { role: "forge", content: probeData.question, options: probeData.options },
          ]);
          setIsProbing(false);
        } else {
          // Ready to build!
          setMessages((prev) => [
            ...prev,
            { role: "forge", content: "Allt skýrt! Ég byrja að smíða..." },
          ]);
          setIsProbing(false);
          await buildApp(userPrompt, updatedMessages); // Start the build
        }
      } else {
        setError(probeData.error || "Villa við greiningu.");
        setIsProbing(false);
      }
    } catch (e) {
      setError("Gat ekki tengst greiningarvél.");
      setIsProbing(false);
    }
  };

  const explainCode = async (prompt: string, historyToUse: Message[]) => {
    setIsProbing(true);
    try {
      const res = await fetch("/api/freeform/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: historyToUse, currentFiles }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessages((prev) => [...prev, { role: "forge", content: data.explanation }]);
      } else {
        setError(data.error || "Gat ekki útskýrt kóðann.");
      }
    } catch (e) {
      setError("Gat ekki tengst útskýringarvél.");
    } finally {
      setIsProbing(false);
    }
  };

  const buildApp = async (latestPrompt: string, historyToUse: Message[]) => {
    setIsBuilding(true);
    setTipIndex(0);

    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 4000);

    try {
      const res = await fetch("/api/freeform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          description: latestPrompt, // Used for the FREEFORM_PROMPT if it's the first time
          sandboxId,
          currentFiles,
          history: historyToUse
        }),
      });
      const data = await res.json();

      if (data.success) {
        // Append ?t= timestamp to force iframe reload
        const newPreviewUrl = `${data.previewUrl}?t=${Date.now()}`;
        setPreviewUrl(newPreviewUrl);
        setSandboxId(data.sandboxId);
        setCurrentFiles(data.files);
        
        // Add Forge's explanation to chat
        if (data.explanation) {
          setMessages((prev) => [...prev, { role: "forge", content: data.explanation }]);
        }
      } else {
        setError(data.error || "Villa við að búa til appið.");
      }
    } catch (e) {
      setError("Gat ekki tengst Forge AI.");
    } finally {
      setIsBuilding(false);
      clearInterval(tipInterval);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      processUserInput(description);
    }
  };

  const isBusy = isBuilding || isProbing;

  return (
    <div className="freeform-layout">
      <header className="freeform-header">
        <h1>⚡ Forge Freeform</h1>
        <p>Lýstu appinu sem þú vilt búa til eða breyta og Forge smíðar það fyrir þig.</p>
      </header>

      <div className="freeform-workspace">
        {/* Left: Chat Panel */}
        <section className="chat-panel">
          <div className="chat-history">
            {messages.length === 0 && !isBusy && (
              <div className="empty-chat">
                <div className="empty-icon">💡</div>
                <p>Hvað langar þig að byggja í dag?</p>
                <p className="empty-sub">Þú getur sagt: "Búðu til to-do lista með dökkum bakgrunni"</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                <div className="message-content">
                  <p>{msg.content}</p>
                  
                  {/* Options (Decision Points) */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="options-grid">
                      {msg.options.map((opt) => (
                        <div key={opt.id} className="option-card">
                          <h4>{opt.title}</h4>
                          <p className="opt-desc">{opt.description}</p>
                          
                          {(opt.pros.length > 0 || opt.cons.length > 0) && (
                            <div className="opt-lists">
                              {opt.pros.length > 0 && (
                                <ul className="pros">
                                  {opt.pros.map((p, i) => <li key={i}>✅ {p}</li>)}
                                </ul>
                              )}
                              {opt.cons.length > 0 && (
                                <ul className="cons">
                                  {opt.cons.map((c, i) => <li key={i}>⚠️ {c}</li>)}
                                </ul>
                              )}
                            </div>
                          )}
                          
                          <button 
                            className="select-btn"
                            onClick={() => processUserInput(`Ég vel: ${opt.title}`)}
                            disabled={isBusy || (idx !== messages.length - 1)} // only allow selecting if it's the latest message
                          >
                            Velja þetta
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Why button for forge messages */}
                  {idx === messages.length - 1 && msg.role === "forge" && !isBusy && sandboxId && !msg.options && (
                    <button 
                      className="select-btn"
                      style={{ marginTop: '1rem', borderStyle: 'dashed' }}
                      onClick={() => processUserInput("🤔 Útskýrðu í smáatriðum og á mannamáli hvaða tækni þú notaðir og hvers vegna, svo ég geti lært.")}
                    >
                      🤔 Af hverju er þetta gert svona?
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {isProbing && (
              <div className="typing-indicator">
                <span>.</span><span>.</span><span>.</span>
              </div>
            )}

            {isBuilding && (
              <div className="building-status">
                <div className="spinner" />
                <p>{TIPS[tipIndex]}</p>
              </div>
            )}
            
            {error && (
              <div className="error-box">
                <p>⚠️ {error}</p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input-area">
            <textarea
              placeholder={sandboxId ? "Hvað viltu breyta næst?..." : "Lýstu appinu hér..."}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isBusy}
              rows={3}
            />
            <button
              className="build-btn"
              onClick={() => processUserInput(description)}
              disabled={isBusy || !description.trim()}
            >
              {isBusy ? "..." : (sandboxId ? "✨ Uppfæra" : "Senda")}
            </button>
          </div>
        </section>

        {/* Right: Preview Panel */}
        <section className="preview-panel">
          <div className="browser-frame">
            <div className="browser-header">
              <div className="dots">
                <span /><span /><span />
              </div>
              <div className="url-bar">
                {previewUrl ? previewUrl.split('?')[0] : "appið þitt birtist hér"}
              </div>
            </div>
            <div className="browser-content">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  title="App Preview"
                />
              ) : (
                <div className="placeholder">
                  <div className="placeholder-icon">🚀</div>
                  <p>Skrifaðu lýsingu og ýttu á senda til að byrja</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .freeform-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #0a0a1a;
          color: #e0e0e0;
          font-family: 'Inter', sans-serif;
        }

        .freeform-header {
          text-align: center;
          padding: 2rem 1rem 1rem;
        }
        .freeform-header h1 {
          font-size: 2rem;
          background: linear-gradient(135deg, #6c5ce7, #a29bfe);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
        }
        .freeform-header p {
          color: #888;
          font-size: 1rem;
        }

        .freeform-workspace {
          display: flex;
          flex: 1;
          gap: 1.5rem;
          padding: 1.5rem;
          min-height: 0;
          max-height: calc(100vh - 120px);
        }

        .chat-panel {
          width: 480px;
          display: flex;
          flex-direction: column;
          background: #111122;
          border-radius: 16px;
          border: 1px solid #222;
          overflow: hidden;
        }

        .chat-history {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .empty-chat {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: #888;
          gap: 0.5rem;
        }
        .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .empty-sub {
          font-size: 0.85rem;
          color: #555;
        }

        .chat-message {
          display: flex;
          max-width: 90%;
        }
        .chat-message.user {
          align-self: flex-end;
        }
        .chat-message.forge {
          align-self: flex-start;
          width: 100%;
        }

        .message-content {
          padding: 0.8rem 1rem;
          border-radius: 12px;
          font-size: 0.95rem;
          line-height: 1.4;
          width: 100%;
        }
        .chat-message.user .message-content {
          background: linear-gradient(135deg, #6c5ce7, #5f27cd);
          color: white;
          border-bottom-right-radius: 2px;
        }
        .chat-message.forge .message-content {
          background: #1a1a2e;
          color: #e0e0e0;
          border: 1px solid #333;
          border-bottom-left-radius: 2px;
        }

        .options-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
          margin-top: 1rem;
        }

        .option-card {
          background: #111122;
          border: 1px solid #444;
          border-radius: 10px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .option-card h4 {
          margin: 0;
          color: #a29bfe;
          font-size: 1rem;
        }
        .opt-desc {
          margin: 0;
          font-size: 0.85rem;
          color: #aaa;
        }

        .opt-lists {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          font-size: 0.8rem;
          background: #0a0a1a;
          padding: 0.5rem;
          border-radius: 6px;
        }
        .opt-lists ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .opt-lists li {
          margin-bottom: 0.25rem;
        }

        .select-btn {
          margin-top: 0.5rem;
          background: transparent;
          border: 1px solid #6c5ce7;
          color: #6c5ce7;
          border-radius: 6px;
          padding: 0.5rem;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .select-btn:hover:not(:disabled) {
          background: #6c5ce7;
          color: white;
        }
        .select-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          border-color: #444;
          color: #888;
        }

        .typing-indicator {
          align-self: flex-start;
          background: #1a1a2e;
          border: 1px solid #333;
          padding: 0.8rem 1rem;
          border-radius: 12px;
          border-bottom-left-radius: 2px;
          display: flex;
          gap: 2px;
        }
        .typing-indicator span {
          animation: blink 1.4s infinite both;
          font-size: 1.5rem;
          line-height: 0.5;
        }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes blink {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }

        .chat-input-area {
          padding: 1rem;
          background: #0d0d1a;
          border-top: 1px solid #222;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        textarea {
          width: 100%;
          background: #1a1a2e;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 0.8rem 1rem;
          color: #f0f0f0;
          font-size: 0.95rem;
          resize: none;
          outline: none;
          font-family: inherit;
        }
        textarea:focus {
          border-color: #6c5ce7;
        }

        .build-btn {
          align-self: flex-end;
          background: linear-gradient(135deg, #6c5ce7, #a29bfe);
          color: white;
          border: none;
          padding: 0.6rem 1.5rem;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, opacity 0.2s;
        }
        .build-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }
        .build-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .building-status {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(108, 92, 231, 0.1);
          border: 1px solid rgba(108, 92, 231, 0.3);
          border-radius: 12px;
          align-self: flex-start;
          animation: fadeIn 0.3s ease;
          max-width: 90%;
        }
        .building-status p {
          font-size: 0.85rem;
          color: #a29bfe;
          margin: 0;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #6c5ce7;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          flex-shrink: 0;
        }

        .error-box {
          padding: 1rem;
          background: rgba(255, 71, 87, 0.1);
          border: 1px solid rgba(255, 71, 87, 0.3);
          border-radius: 12px;
          color: #ff4757;
          align-self: flex-start;
          font-size: 0.9rem;
        }

        .preview-panel {
          flex: 1;
          display: flex;
        }

        .browser-frame {
          flex: 1;
          display: flex;
          flex-direction: column;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #333;
          background: #111;
        }

        .browser-header {
          display: flex;
          align-items: center;
          padding: 0.5rem 1rem;
          background: #1a1a2e;
          border-bottom: 1px solid #333;
          gap: 1rem;
        }
        .dots {
          display: flex;
          gap: 6px;
        }
        .dots span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #333;
        }
        .dots span:first-child { background: #ff5f57; }
        .dots span:nth-child(2) { background: #ffbd2e; }
        .dots span:last-child { background: #28c840; }

        .url-bar {
          flex: 1;
          background: #0a0a1a;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          color: #666;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .browser-content {
          flex: 1;
          background: #fff;
        }

        .placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #999;
          gap: 1rem;
        }
        .placeholder-icon {
          font-size: 3rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
