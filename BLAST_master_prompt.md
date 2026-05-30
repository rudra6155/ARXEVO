# ARXEVO — MASTER BLAST PROMPT
# Paste this into Antigravity Agent Manager to initialize the entire project

---

## WHAT TO PASTE INTO ANTIGRAVITY (Agent Manager → New Task)

---

### TASK 1 — BLUEPRINT (Paste this first, in a new agent)

```
I am building ARXEVO — a web app where users upload a college essay and receive an AI-generated character card showing their archetype, traits, and origin story.

Reference @gemini.md for the full project spec.
Reference @brand_guidelines.md for all UI/styling decisions.

Your ONLY task right now is to scaffold the project structure exactly as defined in gemini.md. Do the following:

1. Create the folder structure:
   arxevo/
   ├── frontend/   (Next.js 14 with App Router, Tailwind CSS)
   └── backend/    (FastAPI, Python 3.11+)

2. Initialize frontend:
   - npx create-next-app@latest frontend --typescript --tailwind --app
   - Install additional deps: npm install recharts lucide-react

3. Initialize backend:
   - Create backend/requirements.txt with: fastapi, uvicorn, anthropic, python-dotenv, pydantic
   - Create backend/main.py with a basic FastAPI app and /health endpoint
   - Create backend/.env.example with: ANTHROPIC_API_KEY=your_key_here

4. Create root README.md with project name and one-liner

Do NOT build any features yet. Just scaffold. Confirm when done.
```

---

### TASK 2 — LINKS (Paste this second, in a new agent after Task 1 is done)

```
Reference @gemini.md for the project spec.

Task: Set up all integrations and environment connections.

1. Backend — Claude API integration:
   - Create backend/services/claude_service.py
   - Implement analyze_essay(essay_text: str) → dict function
   - Use the EXACT prompt from gemini.md section "AI PROMPT CONTRACT"
   - Model: claude-sonnet-4-6
   - Return parsed JSON matching the Profile schema in gemini.md
   - Add error handling: if Claude returns malformed JSON, retry once

2. Backend — FastAPI router:
   - Create backend/routers/analyze.py
   - POST /analyze-essay endpoint
   - Input validation: essay must be 50–5000 characters
   - PRIVACY RULE: never log or store raw essay_text, only process it
   - Return the analyzed profile dict

3. Frontend — API client:
   - Create frontend/lib/api.ts
   - analyzeEssay(essayText: string) → Promise<ProfileResult>
   - Handle loading, error states

4. Create backend/routers/__init__.py and wire router into main.py

Do NOT build any UI yet. Test the /analyze-essay endpoint with this essay:
"Growing up in a coastal town, I watched the reefs die slowly. At 15, I didn't write a petition — I wrote code. I built AirCare, a sensor network that mapped water quality in real time. Three fishing villages now use my data."

Show me the raw JSON response before proceeding.
```

---

### TASK 3 — ARCHITECT (Paste this third, in a new agent)

```
Reference @gemini.md and @brand_guidelines.md.

The backend analyze-essay endpoint is working. Now build the minimal logic layer.

1. Create frontend/app/page.tsx — Landing page:
   - Dark background (#0A0E1A)
   - Hero text: "Your origin story starts here."
   - Subtext: "Submit your essay. Discover your archetype."
   - Single CTA button: "Begin your arc" → links to /onboard
   - Use Space Grotesk font (import from Google Fonts)
   - Add [ARXEVO] notification banner at top: "[ARXEVO] 1,247 arcs initialized."
   - NO other content. Clean, dramatic, minimal.

2. Create frontend/app/onboard/page.tsx — Essay submission:
   - System notification: "[ARXEVO] Submit your origin data for analysis."
   - Textarea: placeholder "Paste your essay, SOP, or even a paragraph about yourself..."
   - Character count display (50 min, 5000 max)
   - Submit button: "Analyze my arc"
   - Loading state: animated scan-line effect + "[ARXEVO] Evaluating your arc..."
   - On success: redirect to /card with profile data in localStorage (temporary)
   - Error state: "[ARXEVO] Analysis failed. Retry?"

3. Create frontend/app/card/page.tsx — Results page (skeleton only):
   - Read profile data from localStorage
   - Display: archetype name, origin story text, trait scores as numbers
   - NO styling yet — just confirm data flows end to end

Style using brand_guidelines.md color variables. Use Tailwind for layout.
```

---

### TASK 4 — STYLIZATION (Paste this fourth, in a new agent)

```
Reference @brand_guidelines.md for ALL styling decisions.

The data is flowing end-to-end. Now make the character card beautiful.

Build frontend/components/CharacterCard.tsx:

CARD STRUCTURE (top to bottom):
1. Top accent bar: 4px solid line in archetype color (architect=blue, catalyst=purple, anchor=cyan, operator=gold)
2. Portrait area: 200px tall, dark surface, centered archetype symbol (🔷/⚡/🌊/⚙️ but as large SVG/text, 64px)
3. Archetype badge: "[ARXEVO] ARCHETYPE DETECTED" label + archetype name in archetype color, uppercase, Space Grotesk 700
4. User name (if available) + "Verified ✓" badge
5. Origin story: italic, muted text, 14px, Inter
6. Divider line
7. TRAIT MAP heading
8. 8 trait bars (label + fill bar + percentage)
9. Bottom stats row: "ARCHETYPE" | "SQUAD" (locked) | "RANK" (pending)

ANIMATIONS (stagger on mount):
- Each section fades in with translateY(8px) → translateY(0)
- Trait bars fill from 0% to actual value
- Top accent bar slides in from left
- Add @keyframes as per brand_guidelines.md

CARD SPECS:
- Width: 360px max
- Background: #111827
- Border: 1px solid #374151
- Border-radius: 8px
- On hover: archetype-colored glow (use --glow-* variables)
- Shadow: 0 25px 50px rgba(0,0,0,0.5)

Also build frontend/components/TraitRadar.tsx:
- Use recharts RadarChart
- Dark background, archetype-colored fill (0.3 opacity), solid stroke
- 8 axes: creativity, leadership, empathy, execution, curiosity, resilience, vision, collaboration
- Animate on mount

Make /card page use CharacterCard and TraitRadar components side by side.
Add "Share your card" button (copies URL to clipboard for now).
```

---

### TASK 5 — TRIGGER (Paste this fifth, in a new agent)

```
Reference @gemini.md for deployment config.

The app is working locally. Now deploy it.

1. Frontend — Deploy to Vercel:
   - Ensure all env variables are documented in .env.example
   - Create vercel.json if needed for Next.js config
   - Confirm build passes: npm run build

2. Backend — Prepare for Railway deployment:
   - Create backend/Dockerfile:
     FROM python:3.11-slim
     WORKDIR /app
     COPY requirements.txt .
     RUN pip install -r requirements.txt
     COPY . .
     CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
   - Create backend/railway.toml with start command
   - Update CORS in main.py to allow the Vercel domain

3. GitHub:
   - Create .gitignore (node_modules, .env, __pycache__, .next)
   - Confirm all code is pushed to main branch

4. Update frontend/lib/api.ts to use NEXT_PUBLIC_API_URL env variable
   (localhost:8000 for dev, Railway URL for prod)

5. Do a final end-to-end test:
   - Submit the test essay from gemini.md
   - Confirm character card renders with correct archetype
   - Confirm no raw essay text appears in any logs or responses

Report the live URLs when done.
```

---

## CONTEXT ROT PREVENTION

When any agent chat reaches 10+ messages, run this:

```
Summarize our current progress in 5 bullet points covering:
1. What's been built and confirmed working
2. Current file structure
3. Any bugs encountered and how they were fixed
4. What the next task is
5. Any decisions made that deviate from gemini.md

I will start a new chat and paste this summary as context.
```

---

## PRIVACY AUDIT PROMPT (Run before any deployment)

```
Audit the entire codebase for privacy compliance. Check:
1. Is raw essay text EVER written to a database, file, or log? If yes, remove it.
2. Is the SHA-256 hash of the essay stored (not the text itself)?
3. Are all Supabase tables using Row Level Security?
4. Does any API response accidentally return the original essay text?
5. Is the ANTHROPIC_API_KEY stored only in .env and never hardcoded?

Report each check as PASS or FAIL with file:line references.
```
