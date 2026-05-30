"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { extractTextFromFile } from "@/lib/api";
import Footer from "@/components/Footer";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Tab = "PASTE" | "UPLOAD" | "WRITE";

const LOADING_MESSAGES = [
  "Agent 1 reading your patterns...",
  "Agent 2 analyzing your behavior...",
  "Agent 3 mapping your values...",
  "Supervisor reconciling findings...",
  "Your arc is confirmed.",
];

export default function Onboard() {
  const [activeTab, setActiveTab] = useState<Tab>("PASTE");
  const [essay, setEssay] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File upload states
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading animation states
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  const router = useRouter();

  const charCount = essay.length;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMsgIndex((prev) => Math.min(prev + 1, LOADING_MESSAGES.length - 1));
      }, 3000);
    } else {
      setLoadingMsgIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const validateInput = () => {
    if (charCount < 50) {
      setError("Tell us more. The system needs at least 50 characters to work with.");
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
      setError("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- File Upload Handlers ---
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
    setFileNames(files.map(f => f.name));
    setIsExtracting(true);

    try {
      const texts = await Promise.all(files.map(f => extractTextFromFile(f)));
      setEssay((prev) => {
        const combined = texts.join("\n\n");
        return prev ? prev + "\n\n" + combined : combined;
      });
      setActiveTab("PASTE");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to extract text from files.";
      console.error(err);
      setError(message);
      setFileNames([]);
    } finally {
      setIsExtracting(false);
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

  const renderTabContent = () => {
    if (activeTab === "PASTE") {
      return (
        <textarea
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
            transition: "border-color 0.3s",
          }}
          placeholder="Paste your college essay, SOP, or any personal statement..."
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          maxLength={25000}
          disabled={loading || isExtracting}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#b8960c";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#2a2820";
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
          />

          {isExtracting ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  border: "2px solid #2a2820",
                  borderTopColor: "#b8960c",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  color: "#b8960c",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                Extracting text...
              </span>
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
                Drop your file here
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
                Accepted: .pdf .docx .txt
              </span>
              {fileNames.length > 0 && (
                <div
                  style={{
                    marginTop: "16px",
                    fontFamily: "var(--font-dm-mono)",
                    fontSize: "var(--text-small)",
                    color: "var(--gold)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {fileNames.map((name, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {name}
                    </div>
                  ))}
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
            transition: "border-color 0.3s",
          }}
          placeholder="Tell us your story. Where are you from? What drives you? What have you built or overcome?"
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          maxLength={25000}
          disabled={loading || isExtracting}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#b8960c";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#2a2820";
          }}
        />
      );
    }
  };

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
                }}
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
              {error || (charCount === 0 ? "Awaiting input..." : charCount < 50 ? "Keep going..." : "")}
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
          >
            {loading ? "Analyzing..." : "ANALYZE MY ARC"}
          </button>

          {/* Loading overlay */}
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                margin: "-32px -24px",
                padding: "32px 24px",
                backgroundColor: "rgba(10, 10, 8, 0.92)",
                backdropFilter: "blur(12px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 20,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", maxWidth: "320px", width: "100%" }}>
                <div
                  style={{
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                  }}
                >
                  <div
                    key={loadingMsgIndex}
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "11px",
                      color: "#e8e0d0",
                      letterSpacing: "0.15em",
                      textAlign: "center",
                      animation: "fadeInOut 1.8s ease-in-out",
                    }}
                  >
                    {LOADING_MESSAGES[loadingMsgIndex]}
                  </div>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    width: "100%",
                    height: "1px",
                    backgroundColor: "#2a2820",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      backgroundColor: "#b8960c",
                      transition: "width 1s ease-out",
                      width: `${((loadingMsgIndex) / (LOADING_MESSAGES.length - 1)) * 100}%`,
                    }}
                  />
                </div>

                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    color: "#8a7e6e",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                  }}
                >
                  System Active
                </span>
              </div>
            </div>
          )}
        </form>
      </main>

      <Footer />

      {/* Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(5px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-5px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        textarea::placeholder {
          color: #4a4438;
          font-style: italic;
        }
      `}} />
    </div>
  );
}
