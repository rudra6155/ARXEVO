# ARXEVO — PROJECT CONSTITUTION
> "Your origin story starts here."

---

## SINGULAR OUTCOME (What we are building right now)
A web app where a user uploads a college essay (or paragraph) and receives:
1. Their **archetype** (Architect / Catalyst / Anchor / Operator)
2. A **trait radar** (scores across 8 dimensions)
3. An AI-generated **origin story** (2–3 sentences, manga-flavored)
4. A shareable **character card** (manga aesthetic, dark UI)

Everything else (squads, missions, matchmaking) is v2. Do not build it yet.

---

## TECH STACK (Source of Truth)

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 (App Router) | Fast deploy, great DX |
| Styling | Tailwind CSS + custom CSS vars | Speed + brand control |
| Backend | FastAPI (Python) | Python AI libs, clean API |
| Database | Supabase | Auth + storage + Postgres |
| AI — Analysis | Anthropic Claude claude-sonnet-4-6 | Best for nuanced human writing |
| AI — Origin Story | Anthropic Claude claude-sonnet-4-6 | Same model, structured output |
| Deployment | Vercel (frontend) + Railway (FastAPI) | Fast, free tiers |
| Version Control | GitHub | Always push before major changes |

---

## DATA SCHEMA

### User
```
id: uuid
email: string
name: string
verified: boolean
created_at: timestamp
```

### Profile
```
id: uuid
user_id: uuid (FK)
raw_essay_hash: string  ← hash only, NOT raw text
archetype: enum [architect, catalyst, anchor, operator]
secondary_archetype: enum [same options] | null
origin_story: string (2-3 sentences)
traits: jsonb {
  creativity: 0-100,
  leadership: 0-100,
  empathy: 0-100,
  execution: 0-100,
  curiosity: 0-100,
  resilience: 0-100,
  vision: 0-100,
  collaboration: 0-100
}
card_generated: boolean
created_at: timestamp
```

---

## API ENDPOINTS (FastAPI)

```
POST /analyze-essay
  body: { essay_text: string }
  returns: { archetype, secondary_archetype, traits, origin_story, confidence }
  
GET /health
  returns: { status: "ok" }
```

---

## AI PROMPT CONTRACT

### Essay Analysis Prompt
System: You are an expert personality analyst specializing in identifying core traits from personal essays. Return ONLY valid JSON, no preamble, no markdown.

User: Analyze this essay and return JSON with this exact schema:
{
  "archetype": "architect|catalyst|anchor|operator",
  "secondary_archetype": "architect|catalyst|anchor|operator|null",
  "confidence": 0-100,
  "traits": {
    "creativity": 0-100,
    "leadership": 0-100,
    "empathy": 0-100,
    "execution": 0-100,
    "curiosity": 0-100,
    "resilience": 0-100,
    "vision": 0-100,
    "collaboration": 0-100
  },
  "origin_story": "2-3 sentence manga-flavored narrative in third person that captures the user's journey. Dramatic but real. Like a Solo Leveling character card.",
  "key_themes": ["theme1", "theme2", "theme3"]
}

Archetype definitions:
- architect: strategy, systems, long-term thinking, building structures
- catalyst: creativity, disruption, innovation, artistic expression, questioning norms
- anchor: empathy, community, relationships, emotional depth, service
- operator: execution, persistence, problem-solving, achievement, precision

Essay: {essay_text}

---

## PRIVACY CONTRACT (Non-negotiable)

1. Raw essay text is NEVER stored in the database
2. Only the hash (SHA-256) is stored to detect duplicates
3. Essay text is deleted from memory after analysis completes
4. No data is sold, shared, or used for model training
5. All Supabase tables have Row Level Security (RLS) enabled
6. Users can delete their profile + all data at any time

This is a FOUNDING PRINCIPLE, not just a feature.

---

## BRAND CONSTANTS

```css
--color-bg: #0A0E1A;
--color-surface: #111827;
--color-surface-2: #1F2937;
--color-accent-blue: #3B82F6;
--color-accent-purple: #8B5CF6;
--color-accent-gold: #F59E0B;
--color-text: #F8FAFC;
--color-text-muted: #9CA3AF;

--archetype-architect: #3B82F6;   /* electric blue */
--archetype-catalyst: #8B5CF6;    /* neon purple */
--archetype-anchor: #06B6D4;      /* cyan */
--archetype-operator: #F59E0B;    /* gold */
```

Fonts: `Space Grotesk` (headings) + `Inter` (body)  
Vibe: Solo Leveling system windows. Dark, sharp, glowing.  
Tone: "You have been chosen by the system."

---

## FOLDER STRUCTURE

```
arxevo/
├── frontend/           ← Next.js app
│   ├── app/
│   │   ├── page.tsx           ← Landing page
│   │   ├── onboard/page.tsx   ← Essay upload
│   │   ├── card/page.tsx      ← Character card reveal
│   │   └── layout.tsx
│   ├── components/
│   │   ├── CharacterCard.tsx
│   │   ├── TraitRadar.tsx
│   │   ├── EssayUploader.tsx
│   │   └── SystemNotification.tsx
│   └── lib/
│       └── api.ts
│
├── backend/            ← FastAPI app
│   ├── main.py
│   ├── routers/
│   │   └── analyze.py
│   ├── services/
│   │   └── claude_service.py
│   └── requirements.txt
│
├── gemini.md           ← THIS FILE (always in root)
├── .env.example
└── README.md
```

---

## ANTIGRAVITY AGENT RULES

1. **One task per agent message.** Do not chain multiple features in one prompt.
2. **Backend agent uses Claude Opus** (complex logic). Frontend agent uses Gemini 3 Pro (visuals).
3. **Always push to GitHub before starting a new major task.**
4. **Context rot prevention:** After 10+ messages in a chat, summarize progress and start fresh.
5. **Privacy rule is sacred:** Agent must NEVER add code that stores raw essay text.
6. **Test with real essay text** (see sample below) before calling any feature done.

### Sample test essay (use this for all testing):
"Growing up in a coastal town, I watched the reefs die slowly. At 15, I didn't write a petition — I wrote code. I built AirCare, a sensor network that mapped water quality in real time. Three fishing villages now use my data. I don't know if I saved the reefs, but I learned that the distance between a problem and its solution is exactly the width of your willingness to start."

---

## CURRENT STATUS
- [ ] Backend: FastAPI skeleton
- [ ] Backend: Claude analysis endpoint
- [ ] Frontend: Landing page
- [ ] Frontend: Essay upload flow
- [ ] Frontend: Character card component
- [ ] Frontend: Trait radar chart
- [ ] Integration: Frontend calls backend
- [ ] Deploy: Vercel + Railway
- [ ] Privacy: RLS enabled on all tables
