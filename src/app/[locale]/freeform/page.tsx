"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { setupAuthListener } from "@/lib/firebase/auth";
import { User, GithubAuthProvider, signInWithPopup, linkWithPopup } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/firebaseConfig";
import { useSearchParams, useRouter } from "next/navigation";

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
  conceptTags?: string[];
};

export default function FreeformPage() {
  return (
    <Suspense fallback={<div className="freeform-layout"><div className="spinner" /></div>}>
      <FreeformContent />
    </Suspense>
  );
}

function FreeformContent() {
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");

  const [description, setDescription] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentFiles, setCurrentFiles] = useState<any[] | null>(null);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  
  const [activeView, setActiveView] = useState<"preview" | "code">("preview");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);

  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>("");
  const router = useRouter();

  // Github Export State
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [githubRepoName, setGithubRepoName] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [githubExportSuccess, setGithubExportSuccess] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionParam) {
      setSessionId(sessionParam);
      // Fetch session from Firestore
      const loadSession = async () => {
        try {
          const docRef = doc(db, "forge_freeform_sessions", sessionParam);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.messages) setMessages(data.messages);
            if (data.currentFiles) setCurrentFiles(data.currentFiles);
            if (data.sandboxId) {
              setSandboxId(data.sandboxId);
              // Construct the preview URL assuming the standard e2b format
              setPreviewUrl(`https://${data.sandboxId}-8000.e2b.dev`);
            }
          }
        } catch (e) {
          console.error("Failed to load session:", e);
        }
      };
      loadSession();
    } else {
      setSessionId(Date.now().toString(36) + Math.random().toString(36).substring(2));
    }

    const unsubscribe = setupAuthListener((u) => {
      setUser(u);
      setIsAuthLoading(false);
      if (!u) {
        // Ef notandi er ekki innskráður, skutla honum á login
        router.push("/is/login");
      }
    });
    return () => unsubscribe();
  }, [sessionParam, router]);

  // Færum auth checks alveg niður fyrir öll React Hooks til að forðast villur!

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
          setMessages((prev) => [
            ...prev, 
            { 
              role: "forge", 
              content: data.explanation,
              conceptTags: data.conceptTags 
            }
          ]);
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

  const handleConnectGithub = async () => {
    try {
      const provider = new GithubAuthProvider();
      provider.addScope('repo'); // Nauðsynlegt til að búa til og ýta í repository
      
      let result;
      // Tengja við núverandi account ef user er innskráður annars bara popup login
      if (user) {
        result = await linkWithPopup(user, provider).catch(async (error) => {
          // Ef fólk hefur áður skráð sig inn með GitHub beint, getur linkWithPopup failað
          // (t.d. "credential-already-in-use"). Þá gerum við bara signInWithPopup.
          if (error.code === 'auth/credential-already-in-use') {
            return await signInWithPopup(auth, provider);
          }
          throw error;
        });
      } else {
        result = await signInWithPopup(auth, provider);
      }
      
      const credential = GithubAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGithubToken(credential.accessToken);
      } else {
        setError("Fékk engan token frá GitHub.");
      }
    } catch (error: any) {
      console.error("Github auth error", error);
      // Ef notandinn lokar glugganum áður en hann klárar ignorum við það
      if (error.code !== 'auth/popup-closed-by-user') {
        setError("Gat ekki tengst GitHub: " + error.message);
      }
    }
  };

  const handleGithubExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken || !githubRepoName || !currentFiles) return;

    setIsExporting(true);
    setGithubExportSuccess(null);
    setError(null);

    try {
      const res = await fetch("/api/export/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubToken,
          repoName: githubRepoName,
          files: currentFiles,
          description: messages.find(m => m.role === 'user')?.content
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGithubExportSuccess(data.url);
      } else {
        setError(data.error || "Gat ekki deilt á GitHub");
      }
    } catch (err) {
      setError("Villa kom upp við að tengjast GitHub");
    } finally {
      setIsExporting(false);
    }
  };

  const isBusy = isBuilding || isProbing;

  if (isAuthLoading) {
    return (
      <div className="freeform-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return null;

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

                  {/* Concept Tags */}
                  {msg.conceptTags && msg.conceptTags.length > 0 && (
                    <div className="concept-tags">
                      {msg.conceptTags.map(tag => (
                        <span key={tag} className="concept-tag">{tag}</span>
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
          <div className="panel-tabs">
            <div style={{ display: 'flex' }}>
              <button 
                className={activeView === "preview" ? "active" : ""} 
                onClick={() => setActiveView("preview")}
              >
                👀 Forsýning
              </button>
              <button 
                className={activeView === "code" ? "active" : ""} 
                onClick={() => setActiveView("code")}
              >
                💻 Kóði
              </button>
            </div>
            {sandboxId && currentFiles && (
              <button 
                className="github-btn"
                onClick={() => setShowGithubModal(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                Birta appið
              </button>
            )}
          </div>

          {activeView === "preview" ? (
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
          ) : (
            <div className="code-frame">
              {currentFiles && currentFiles.length > 0 ? (
                <>
                  <div className="file-tabs">
                    {currentFiles.map(f => (
                      <button 
                        key={f.path}
                        className={selectedFile === f.path || (!selectedFile && f.path === currentFiles[0].path) ? "active" : ""}
                        onClick={() => setSelectedFile(f.path)}
                      >
                        {f.path}
                      </button>
                    ))}
                  </div>
                  <div className="code-content">
                    <pre>
                      <code>
                        {currentFiles.find(f => f.path === (selectedFile || currentFiles[0].path))?.content || ""}
                      </code>
                    </pre>
                  </div>
                </>
              ) : (
                <div className="placeholder">
                  <div className="placeholder-icon">💻</div>
                  <p>Enginn kóði hefur verið smíðaður ennþá</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Publish / GitHub Export Modal */}
      {showGithubModal && (
        <div className="modal-overlay" onClick={() => setShowGithubModal(false)}>
          <div className="modal-content card" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowGithubModal(false)}>×</button>
            <h2>Birta appið á netinu</h2>
            
            {githubExportSuccess ? (
              <div className="success-content">
                <p>Verkefnið er komið á GitHub!</p>
                <a href={githubExportSuccess} target="_blank" rel="noreferrer" className="cta-button">Skoða Repository</a>
                <div style={{ marginTop: '1.5rem', background: 'rgba(108, 92, 231, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(108, 92, 231, 0.3)'}}>
                  <h4 style={{ color: '#a29bfe', marginBottom: '0.5rem' }}>Næsta skref: Vercel 🚀</h4>
                  <p style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.5' }}>
                    Til að fá alvöru vefslóð (.com) sem allir geta skoðað:<br/><br/>
                    1. Farðu inn á <a href="https://vercel.com" target="_blank" rel="noreferrer" style={{color: '#a29bfe'}}>Vercel.com</a><br/>
                    2. Skráðu þig inn með GitHub aðganginum þínum.<br/>
                    3. Ýttu á <strong>"Add New Project"</strong>.<br/>
                    4. Veldu repo-ið sem þú varst að búa til og ýttu á <strong>"Deploy"</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGithubExport} className="github-form">
                <p style={{ lineHeight: '1.5', color: '#ccc' }}>Til að setja appið þitt frítt á netið notum við tvö frábær tól: <strong>GitHub</strong> (geymir kóðann) og <strong>Vercel</strong> (birtir kóðann).</p>
                
                {githubToken ? (
                  <>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                      <label>Skref 1: Vista kóðann á GitHub</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Nafn á vefnum (t.d. mitt-fyrsta-app)"
                        value={githubRepoName}
                        onChange={e => setGithubRepoName(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="cta-button" disabled={isExporting}>
                      {isExporting ? "Ert að ýta..." : "Búa til Repo á GitHub"}
                    </button>
                  </>
                ) : (
                  <div className="github-connect" style={{ marginTop: '1.5rem', background: '#1a1a2e', padding: '1.5rem', borderRadius: '8px', border: '1px solid #333' }}>
                    <p style={{fontSize: "0.95rem", color: "#eee", marginBottom: "1rem"}}>Tengdu GitHub aðganginn þinn til að byrja.</p>
                    <button type="button" className="cta-button" onClick={handleConnectGithub} style={{ width: '100%' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: "8px"}}><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                      Tengjast við GitHub
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .freeform-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--color-bg);
          color: var(--color-text-primary);
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
          color: var(--color-text-secondary);
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
          background: var(--color-surface);
          border-radius: 16px;
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-sm);
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

        .concept-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.8rem;
          padding-top: 0.8rem;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .concept-tag {
          background: rgba(108, 92, 231, 0.2);
          color: #a29bfe;
          padding: 0.2rem 0.6rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-family: monospace;
          border: 1px solid rgba(108, 92, 231, 0.4);
        }

        .empty-chat {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: var(--color-text-secondary);
          gap: 0.5rem;
        }
        .empty-icon {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .empty-sub {
          font-size: 0.85rem;
          color: var(--color-text-secondary);
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
          background: linear-gradient(135deg, var(--color-accent), var(--color-accent-hover));
          color: white;
          border-bottom-right-radius: 2px;
          box-shadow: 0 2px 4px rgba(108, 92, 231, 0.2);
        }
        .chat-message.user .message-content p {
          color: white;
        }
        .chat-message.forge .message-content {
          background: var(--color-surface-raised);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          border-bottom-left-radius: 2px;
        }
        .chat-message.forge .message-content p {
          color: var(--color-text-primary);
        }

        .options-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
          margin-top: 1rem;
        }

        .option-card {
          background: var(--color-surface-raised);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .option-card h4 {
          margin: 0;
          color: var(--color-accent);
          font-size: 1rem;
        }
        .opt-desc {
          margin: 0;
          font-size: 0.85rem;
          color: var(--color-text-secondary);
        }

        .opt-lists {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          font-size: 0.8rem;
          background: var(--color-surface);
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
          background: var(--color-surface-raised);
          border: 1px solid var(--color-border);
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
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        textarea {
          width: 100%;
          background: var(--color-surface-raised);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 0.8rem 1rem;
          color: var(--color-text-primary);
          font-size: 0.95rem;
          resize: none;
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        textarea:focus {
          border-color: var(--color-accent);
          background: var(--color-surface);
          box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
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
          flex-direction: column;
          background: var(--color-surface);
          border-radius: 12px;
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }

        .panel-tabs {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--color-surface-raised);
          border-bottom: 1px solid var(--color-border);
          padding: 0.5rem 1rem 0;
        }
        .panel-tabs button {
          background: transparent;
          border: none;
          color: var(--color-text-secondary);
          padding: 0.8rem 1.5rem;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }
        .panel-tabs button:hover {
          color: var(--color-text-primary);
        }
        .panel-tabs button.active {
          color: var(--color-accent);
          border-bottom-color: var(--color-accent);
        }

        .github-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #24292e !important;
          color: white !important;
          border: 1px solid #1b1f23 !important;
          border-radius: 6px;
          padding: 0.4rem 0.8rem !important;
          font-size: 0.85rem !important;
          margin-bottom: 0.5rem;
        }
        .github-btn:hover {
          background: #2f363d !important;
        }

        .browser-frame, .code-frame {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .browser-header {
          display: flex;
          align-items: center;
          padding: 0.5rem 1rem;
          background: var(--color-surface-raised);
          border-bottom: 1px solid var(--color-border);
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
          background: #ccc;
        }
        .dots span:first-child { background: #ff5f57; }
        .dots span:nth-child(2) { background: #ffbd2e; }
        .dots span:last-child { background: #28c840; }

        .url-bar {
          flex: 1;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .browser-content {
          flex: 1;
          background: #fff;
        }

        /* Code Window CSS */
        .file-tabs {
          display: flex;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
          overflow-x: auto;
        }
        .file-tabs button {
          background: transparent;
          border: none;
          color: var(--color-text-secondary);
          padding: 0.6rem 1.2rem;
          font-family: monospace;
          font-size: 0.85rem;
          cursor: pointer;
          border-right: 1px solid var(--color-border);
          transition: all 0.2s;
        }
        .file-tabs button:hover {
          background: var(--color-surface-raised);
          color: var(--color-text-primary);
        }
        .file-tabs button.active {
          background: var(--color-surface);
          color: var(--color-accent);
          border-top: 2px solid var(--color-accent);
        }

        .code-content {
          flex: 1;
          background: var(--color-surface-raised);
          overflow: auto;
          padding: 1.5rem;
        }
        .code-content pre {
          margin: 0;
          font-family: 'Fira Code', 'Courier New', Courier, monospace;
          font-size: 0.9rem;
          line-height: 1.5;
          color: var(--color-text-primary);
          white-space: pre-wrap;
        }

        .placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--color-text-secondary);
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

        @media (max-width: 1024px) {
          .freeform-workspace {
            flex-direction: column;
            max-height: none;
            height: auto;
          }
          .chat-panel {
            width: 100%;
            height: 50vh;
            flex: none;
          }
          .preview-panel {
            width: 100%;
            height: 60vh;
            flex: none;
          }
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          position: relative;
          width: 90%;
          max-width: 400px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 2rem;
          text-align: left;
        }
        .close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--color-text-secondary);
          cursor: pointer;
        }
        .github-form {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          margin-top: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-group label {
          font-size: 0.9rem;
          color: var(--color-text-primary);
        }
        .form-group input {
          background: var(--color-surface-raised);
          border: 1px solid var(--color-border);
          padding: 0.8rem;
          border-radius: 6px;
          color: var(--color-text-primary);
          font-family: monospace;
        }
        .form-group small {
          color: var(--color-text-secondary);
          font-size: 0.75rem;
        }
        .success-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
}
