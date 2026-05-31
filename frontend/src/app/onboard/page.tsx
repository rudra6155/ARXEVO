"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { extractTextFromFile } from "@/lib/api";
import Footer from "@/components/Footer";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Tab = "PASTE" | "UPLOAD" | "WRITE";

// ─── Agent progress definitions ────────────────────────────────
interface Agent {
  label: string;
  description: string;
  durationMs: number; // how long the bar takes to fill
}

const AGENTS: Agent[] = [
  { label: "Agent 1", description: "Reading patterns...",      durationMs: 4000 },
  { label: "Agent 2", description: "Analyzing behavior...",   durationMs: 4000 },
  { label: "Agent 3", description: "Mapping values...",       durationMs: 4000 },
  { label: "Supervisor", description: "Reconciling findings...", durationMs: 5000 },
];

// Count words in a string
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function Onboard() {
  const [activeTab, setActiveTab] = useState<Tab>("PASTE");
  const [essay, setEssay] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File upload states
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractingFileName, setExtractingFileName] = useState<string | null>(null);
  const [extractionPhase, setExtractionPhase] = useState<"idle" | "extracting" | "combining">("idle");
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; wordCount: number }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Agent progress bars state (only used while loading)
  const [agentProgress, setAgentProgress] = useState<number[]>([0, 0, 0, 0]);
  const [agentDone, setAgentDone] = useState<boolean[]>([false, false, false, false]);
  const agentTimersRef = useRef<NodeJS.Timeout[]>([]);

  const router = useRouter();

  const charCount = essay.length;
  const wordCount = countWords(essay);

  // ─── Start agent progress animation ────────────────────────
  const startAgentProgress = useCallback(() => {
    // Reset
    setAgentProgress([0, 0, 0, 0]);
    setAgentDone([false, false, false, false]);

    const timers: NodeJS.Timeout[] = [];
    let cumulativeDelay = 0;

    AGENTS.forEach((agent, i) => {
      // Start filling this agent after previous agents complete
      const startDelay = cumulativeDelay;
      cumulativeDelay += agent.durationMs;

      // Begin fill
      const startTimer = setTimeout(() => {
        setAgentProgress(prev => {
          const next = [...prev];
          next[i] = 1; // signals "start filling"
          return next;
        });
      }, startDelay);

      // Mark done
      const doneTimer = setTimeout(() => {
        setAgentDone(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, cumulativeDelay);

      timers.push(startTimer, doneTimer);
    });

    agentTimersRef.current = timers;
  }, []);

  // Clean up timers on unmount or when loading ends
  useEffect(() => {
    if (!loading) {
      agentTimersRef.current.forEach(clearTimeout);
      agentTimersRef.current = [];
    }
  }, [loading]);

  useEffect(() => {
    if (loading) {
      startAgentProgress();
    }
  }, [loading, startAgentProgress]);

  // ─── Validation ──────────────────────────────────────────────
  const validateInput = () => {
    if (charCount < 50) {
      setError("The system needs more to work with. Write at least a paragraph about yourself.");
      return false;
    }
    const words = essay.toLowerCase().match(/\b\w+\b/g);
    if (words && words.length > 10) {
      const uniqueWords = new Set(words).size;
      if (uniqueWords / words.length < 0.2) {
        setError("We can see you. Write from the heart.");
        return false;
      }
    }
    return true;
  };

  const isValid = charCount >= 50;

  // ─── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInput() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/analyze-essay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ essay_text: essay }),
      });

      if (!res.ok) {
        throw new Error("Failed to analyze essay");
      }

      const data = await res.json();

      localStorage.setItem("arxevo_profile", JSON.stringify({
        ...data,
        raw_essay_hash: "temporary_hash_pending_backend_impl",
      }));

      router.push("/card");
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "";
      if (errMsg.toLowerCase().includes("fetch") || errMsg.toLowerCase().includes("network")) {
        setError("Connection lost. Check your internet and try again.");
      } else {
        setError("The system couldn't read enough signal from your text. Try adding more personal details — specific moments, decisions, things you've built or overcome.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── File Upload Handlers ────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    setError(null);
    setUploadedFiles([]);
    setIsExtracting(true);
    setExtractionPhase("extracting");

    try {
      const results: Array<{ name: string; text: string; wordCount: number }> = [];

      // Extract each file one by one with per-file status
      for (const file of files) {
        setExtractingFileName(file.name);
        try {
          const text = await extractTextFromFile(file);
          const wc = countWords(text);
          results.push({ name: file.name, text, wordCount: wc });
        } catch {
          setError(`Couldn't read that file. Try copy-pasting the text directly instead.`);
          setIsExtracting(false);
          setExtractionPhase("idle");
          setExtractingFileName(null);
          return;
        }
      }

      // Show combining phase
      setExtractingFileName(null);
      setExtractionPhase("combining");
      await new Promise(r => setTimeout(r, 400));

      // Combine with separators
      const combined = results
        .map(r => `--- ${r.name} ---\n${r.text}`)
        .join("\n\n");

      let finalText = combined;
      let trimmed = false;
      if (finalText.length > 25000) {
        finalText = finalText.slice(0, 25000);
        trimmed = true;
      }

      setEssay(finalText);
      setUploadedFiles(results.map(r => ({ name: r.name, wordCount: r.wordCount })));

      if (trimmed) {
        setError("Combined text trimmed to 25,000 characters");
      }

      // Auto-switch to PASTE TEXT tab
      setActiveTab("PASTE");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Couldn't read that file. Try copy-pasting the text directly instead.";
      console.error(err);
      setError(message);
      setUploadedFiles([]);
    } finally {
      setIsExtracting(false);
      setExtractionPhase("idle");
      setExtractingFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "PASTE", label: "PASTE TEXT" },
    { key: "UPLOAD", label: "UPLOAD FILE" },
    { key: "WRITE", label: "WRITE HERE" },
  ];

  // ─── Render extraction loading status ───────────────────────
  const renderExtractionStatus = () => {
    if (extractionPhase === "combining") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "20px", height: "20px", border: "1px solid #2a2820", borderTopColor: "#b8960c", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#b8960c", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Combining documents...
          </span>
        </div>
      );
    }
    if (extractionPhase === "extracting" && extractingFileName) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "20px", height: "20px", border: "1px solid #2a2820", borderTopColor: "#b8960c", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#b8960c", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Extracting {extractingFileName}...
          </span>
        </div>
      );
    }
    return null;
  };

  // ─── Tab content renderer ────────────────────────────────────
  const renderTabContent = () => {
    if (activeTab === "PASTE") {
      return (
        <textarea
          id="essay-textarea"
          style={{
            width: "100%",
            minHeight: "320px",
            backgroundColor: "#111109",
            border: "1px solid #2a2820",
            color: "#e8e0d0",
            padding: "24px",
            resize: "vertical",
            fontFamily: "var(--font-cormorant)",
            fontWeight: 400,
            fontSize: "var(--text-body)",
            lineHeight: 1.8,
            outline: "none",
            borderRadius: 0,
            transition: "border-color 0.3s, outline 0.3s",
            boxSizing: "border-box",
          }}
          placeholder="Paste your college essay, SOP, or any personal statement..."
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          maxLength={25000}
          disabled={loading || isExtracting}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#b8960c";
            e.currentTarget.style.outline = "1px solid #b8960c";
            e.currentTarget.style.outlineOffset = "3px";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#2a2820";
            e.currentTarget.style.outline = "none";
          }}
        />
      );
    }

    if (activeTab === "UPLOAD") {
      return (
        <div
          style={{
            width: "100%",
            minHeight: "320px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: `2px dashed ${isDragging ? "#b8960c" : "#2a2820"}`,
            backgroundColor: isDragging ? "rgba(184, 150, 12, 0.03)" : "#111109",
            cursor: "pointer",
            transition: "all 0.3s",
            padding: "32px",
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.docx,.txt"
            multiple
            style={{ display: "none" }}
          />

          {isExtracting ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              {renderExtractionStatus()}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", textAlign: "center" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#8a7e6e" strokeWidth={1.5} style={{ marginBottom: "8px" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span
                style={{
                  fontFamily: "var(--font-cormorant)",
                  fontWeight: 400,
                  fontStyle: "italic",
                  fontSize: "var(--text-lead)",
                  color: "var(--cream)",
                }}
              >
                Drop your files here
              </span>
              <span
                style={{
                  fontFamily: "var(--font-dm-mono)",
                  fontSize: "var(--text-label)",
                  color: "#b0a390",
                  letterSpacing: "0.1em",
                }}
              >
                or click to browse
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "8px",
                  color: "#4a4438",
                  marginTop: "8px",
                }}
              >
                .pdf .docx .txt — multiple files supported
              </span>

              {/* Uploaded files list with word counts */}
              {uploadedFiles.length > 0 && (
                <div
                  style={{
                    marginTop: "16px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "8px",
                    width: "100%",
                    maxWidth: "340px",
                  }}
                >
                  {uploadedFiles.map((f, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ color: "#b8960c", fontSize: "12px" }}>✓</span>
                      <span style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        color: "#b8960c",
                        letterSpacing: "0.05em",
                      }}>
                        {f.name}
                        <span style={{ color: "#4a4438", marginLeft: "8px" }}>
                          ({f.wordCount.toLocaleString()} words)
                        </span>
                      </span>
                    </div>
                  ))}
                  {uploadedFiles.length > 1 && (
                    <div style={{
                      marginTop: "4px",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      color: "#4a4438",
                      letterSpacing: "0.1em",
                      borderTop: "1px solid #1a1a16",
                      paddingTop: "8px",
                      width: "100%",
                    }}>
                      TOTAL: {uploadedFiles.reduce((s, f) => s + f.wordCount, 0).toLocaleString()} words across {uploadedFiles.length} files
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === "WRITE") {
      return (
        <textarea
          id="essay-write-textarea"
          style={{
            width: "100%",
            minHeight: "320px",
            backgroundColor: "#111109",
            backgroundImage:
              "repeating-linear-gradient(transparent, transparent 31px, rgba(255,255,255,0.03) 31px, rgba(255,255,255,0.03) 32px)",
            backgroundAttachment: "local",
            border: "1px solid #2a2820",
            color: "#e8e0d0",
            padding: "24px",
            resize: "vertical",
            fontFamily: "var(--font-cormorant)",
            fontWeight: 400,
            fontSize: "var(--text-body)",
            lineHeight: 1.8,
            outline: "none",
            borderRadius: 0,
            transition: "border-color 0.3s, outline 0.3s",
            boxSizing: "border-box",
          }}
          placeholder="Tell us your story. Where are you from? What drives you? What have you built or overcome?"
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          maxLength={25000}
          disabled={loading || isExtracting}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#b8960c";
            e.currentTarget.style.outline = "1px solid #b8960c";
            e.currentTarget.style.outlineOffset = "3px";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#2a2820";
            e.currentTarget.style.outline = "none";
          }}
        />
      );
    }
  };

  // ─── Agent progress bars renderer ───────────────────────────
  const renderAgentBars = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%", maxWidth: "340px" }}>
      {AGENTS.map((agent, i) => {
        const started = agentProgress[i] === 1;
        const done = agentDone[i];
        return (
          <div key={agent.label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Agent label */}
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              color: done ? "#b8960c" : started ? "#e8e0d0" : "#4a4438",
              width: "70px",
              flexShrink: 0,
              letterSpacing: "0.05em",
            }}>
              {agent.label}
            </span>

            {/* Progress bar */}
            <div style={{
              flex: 1,
              height: "2px",
              backgroundColor: "#1a1a16",
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                backgroundColor: "#b8960c",
                width: done ? "100%" : started ? "100%" : "0%",
                transition: started && !done ? `width ${agent.durationMs}ms linear` : "none",
              }} />
            </div>

            {/* Description + checkmark */}
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              color: done ? "#b8960c" : started ? "#8a7e6e" : "#4a4438",
              width: "140px",
              flexShrink: 0,
              letterSpacing: "0.03em",
            }}>
              {done ? `✓ ${agent.description}` : agent.description}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#0a0a08",
        color: "#e8e0d0",
      }}
    >
      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "80px 24px",
          maxWidth: "720px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Header */}
        <div style={{ width: "100%", marginBottom: "48px" }}>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.2em",
              color: "#8a7e6e",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "20px",
            }}
          >
            ORIGIN ANALYSIS
          </span>
          <h1
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: "var(--text-hero)",
              color: "var(--cream)",
              lineHeight: 1.1,
              marginBottom: "20px",
            }}
          >
            Tell us your story.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "var(--text-small)",
              color: "#b0a390",
              lineHeight: 1.8,
              maxWidth: "520px",
            }}
          >
            Your essay, your SOP, or anything you&apos;ve written about yourself.
            The more honest, the more accurate.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ width: "100%", position: "relative" }}>
          {/* Tabs */}
          <div style={{ display: "flex", width: "100%", marginBottom: "24px" }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                id={`tab-${tab.key.toLowerCase()}`}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  paddingBottom: "12px",
                  textAlign: "center",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === tab.key ? "1px solid #e8e0d0" : "1px solid transparent",
                  color: activeTab === tab.key ? "#e8e0d0" : "#8a7e6e",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  opacity: activeTab === tab.key ? 1 : 0.6,
                  outline: "none",
                }}
                onFocus={(e) => { e.currentTarget.style.outline = "1px solid #b8960c"; e.currentTarget.style.outlineOffset = "3px"; }}
                onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {renderTabContent()}

          {/* Counter and status */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "12px",
              minHeight: "20px",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.1em",
                color: error ? "#c41e1e" : "#8a7e6e",
              }}
            >
              {error || (charCount === 0 ? "Awaiting input..." : charCount < 50 ? "Keep going..." : `${wordCount.toLocaleString()} words`)}
            </span>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                color: charCount > 20000 ? "#b8960c" : "#8a7e6e",
              }}
            >
              {charCount.toLocaleString()} / 25,000
            </span>
          </div>

          {/* Submit button */}
          <button
            id="analyze-submit-btn"
            type="submit"
            disabled={!isValid || loading || isExtracting}
            style={{
              marginTop: "32px",
              width: "100%",
              padding: "16px 32px",
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: !isValid || loading || isExtracting ? "#4a4438" : "#e8e0d0",
              backgroundColor: "transparent",
              border: `1px solid ${!isValid || loading || isExtracting ? "#2a2820" : "#e8e0d0"}`,
              borderRadius: 0,
              cursor: !isValid || loading || isExtracting ? "not-allowed" : "pointer",
              transition: "all 0.3s",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              if (isValid && !loading && !isExtracting) {
                e.currentTarget.style.backgroundColor = "#e8e0d0";
                e.currentTarget.style.color = "#0a0a08";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = isValid && !loading && !isExtracting ? "#e8e0d0" : "#4a4438";
            }}
            onFocus={(e) => {
              if (isValid && !loading && !isExtracting) {
                e.currentTarget.style.outline = "1px solid #b8960c";
                e.currentTarget.style.outlineOffset = "3px";
              }
            }}
            onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
          >
            {loading ? "Analyzing..." : "ANALYZE MY ARC"}
          </button>

          {/* ─── Loading overlay with agent progress bars ─── */}
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                margin: "-32px -24px",
                padding: "32px 24px",
                backgroundColor: "rgba(10, 10, 8, 0.95)",
                backdropFilter: "blur(12px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 20,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "32px", width: "100%", maxWidth: "380px" }}>
                {/* System status label */}
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  color: "#4a4438",
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                }}>
                  [ARXEVO] Multi-agent analysis active
                </span>

                {/* Agent bars */}
                {renderAgentBars()}

                {/* Subtle bottom label */}
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  color: "#4a4438",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}>
                  15–20 seconds
                </span>
              </div>
            </div>
          )}
        </form>
      </main>

      <Footer />

      {/* Keyframes + mobile responsive */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        textarea::placeholder {
          color: #4a4438;
          font-style: italic;
        }
        @media (max-width: 768px) {
          #essay-textarea,
          #essay-write-textarea {
            width: 100% !important;
            font-size: 16px !important;
          }
        }
      `}} />
    </div>
  );
}
