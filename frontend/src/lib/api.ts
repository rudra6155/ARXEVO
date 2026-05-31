/**
 * ARXEVO API Client
 *
 * Communicates with the FastAPI backend.
 * PRIVACY: essay text is sent over HTTPS and never persisted on the client.
 */

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

// --- Types matching the backend AnalysisResponse schema ---

export interface Traits {
  creativity: number;
  leadership: number;
  empathy: number;
  execution: number;
  curiosity: number;
  resilience: number;
  vision: number;
  collaboration: number;
}

export interface ProfileResult {
  archetype: "architect" | "catalyst" | "anchor" | "operator";
  secondary_archetype: "architect" | "catalyst" | "anchor" | "operator" | null;
  confidence: number;
  traits: Traits;
  origin_story: string;
  key_themes: string[];
}

// --- API functions ---

export async function analyzeEssay(essayText: string): Promise<ProfileResult> {
  const res = await fetch(`${API_BASE_URL}/analyze-essay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ essay_text: essayText }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json() as Promise<ProfileResult>;
}

export async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json();
}

export async function extractTextFromFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/extract-text`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to extract text from file" }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  const data = await res.json();
  return data.text;
}
