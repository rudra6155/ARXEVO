"""
Groq-based essay analysis service.
Uses the AI Prompt Contract from gemini.md.

PRIVACY: Raw essay text is never stored or logged.
It is passed to Groq for analysis and then discarded.
"""

import json
import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not set in .env")

client = Groq(api_key=GROQ_API_KEY)

MODEL_NAME = "llama-3.3-70b-versatile"

# --- AI Prompt Contract (from gemini.md) ---

SYSTEM_PROMPT = (
    "You are an expert personality analyst specializing in identifying "
    "core traits from personal essays. Return ONLY valid JSON, no preamble, no markdown."
)

USER_PROMPT_TEMPLATE = """Analyze this essay and return JSON with this exact schema:
{{
  "archetype": "architect|catalyst|anchor|operator",
  "secondary_archetype": "architect|catalyst|anchor|operator|null",
  "confidence": 0-100,
  "traits": {{
    "creativity": 0-100,
    "leadership": 0-100,
    "empathy": 0-100,
    "execution": 0-100,
    "curiosity": 0-100,
    "resilience": 0-100,
    "vision": 0-100,
    "collaboration": 0-100
  }},
  "origin_story": "2-3 sentence manga-flavored narrative in third person that captures the user's journey. Dramatic but real. Like a Solo Leveling character card.",
  "key_themes": ["theme1", "theme2", "theme3"]
}}

Archetype definitions:
- architect: strategy, systems, long-term thinking, building structures
- catalyst: creativity, disruption, innovation, artistic expression, questioning norms
- anchor: empathy, community, relationships, emotional depth, service
- operator: execution, persistence, problem-solving, achievement, precision

Essay: {essay_text}"""


def _parse_response(raw_text: str) -> dict:
    """
    Extract and parse JSON from the model response.
    Handles cases where the model wraps JSON in markdown code fences.
    """
    text = raw_text.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        # Remove opening fence (```json or ```)
        first_newline = text.index("\n")
        text = text[first_newline + 1:]
        # Remove closing fence
        if text.endswith("```"):
            text = text[:-3].strip()

    return json.loads(text)


VALID_ARCHETYPES = {"architect", "catalyst", "anchor", "operator"}
REQUIRED_TRAITS = {
    "creativity", "leadership", "empathy", "execution",
    "curiosity", "resilience", "vision", "collaboration",
}


def _validate_result(result: dict) -> dict:
    """Validate that the parsed result matches the Profile schema."""
    # Archetype
    if result.get("archetype") not in VALID_ARCHETYPES:
        raise ValueError(f"Invalid archetype: {result.get('archetype')}")

    # Secondary archetype (nullable)
    sec = result.get("secondary_archetype")
    if sec is not None and sec != "null" and sec not in VALID_ARCHETYPES:
        raise ValueError(f"Invalid secondary_archetype: {sec}")
    if sec == "null":
        result["secondary_archetype"] = None

    # Confidence
    conf = result.get("confidence")
    if not isinstance(conf, (int, float)) or not (0 <= conf <= 100):
        raise ValueError(f"Invalid confidence: {conf}")

    # Traits
    traits = result.get("traits", {})
    if not isinstance(traits, dict):
        raise ValueError("traits must be an object")
    for key in REQUIRED_TRAITS:
        val = traits.get(key)
        if not isinstance(val, (int, float)) or not (0 <= val <= 100):
            raise ValueError(f"Invalid trait '{key}': {val}")

    # Origin story
    if not isinstance(result.get("origin_story"), str) or len(result["origin_story"]) < 10:
        raise ValueError("origin_story must be a non-trivial string")

    # Key themes
    if not isinstance(result.get("key_themes"), list) or len(result["key_themes"]) == 0:
        raise ValueError("key_themes must be a non-empty list")

    return result


async def analyze_essay(essay_text: str) -> dict:
    """
    Send essay to Groq for personality analysis.
    Returns a validated dict matching the Profile schema.

    PRIVACY: essay_text is sent to the Groq API for analysis only.
    It is never logged, stored, or persisted anywhere.

    If Groq returns malformed JSON, the request is retried once.
    """
    user_prompt = USER_PROMPT_TEMPLATE.format(essay_text=essay_text)
    last_error: Exception | None = None

    for attempt in range(2):  # Try up to 2 times (initial + 1 retry)
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
            )
            raw_text = response.choices[0].message.content
            parsed = _parse_response(raw_text)
            validated = _validate_result(parsed)
            return validated
        except (json.JSONDecodeError, ValueError, KeyError) as exc:
            last_error = exc
            if attempt == 0:
                # Will retry once
                continue
            raise ValueError(
                f"Groq returned invalid data after 2 attempts: {exc}"
            ) from exc
        except Exception as exc:
            # Network / API errors — do not retry
            raise RuntimeError(f"Groq API call failed: {exc}") from exc

    # Should not be reached, but just in case
    raise ValueError(f"Analysis failed: {last_error}")
