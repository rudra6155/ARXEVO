"""
Groq-based essay analysis service.
Uses the AI Prompt Contract from gemini.md.

PRIVACY: Raw essay text is never stored or logged.
It is passed to Groq for analysis and then discarded.
"""

import json
import os
import time
import logging
from dotenv import load_dotenv
from groq import Groq

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not set in .env")

client = Groq(api_key=GROQ_API_KEY)

MODEL_NAME = "llama-3.3-70b-versatile"

# --- AI Prompts ---

PATTERN_ANALYST_SYSTEM = "You are a linguistic pattern analyst. Your only job is to identify recurring patterns in how someone writes and thinks — not what they say, but HOW they say it. Look for: sentence structure complexity, abstract vs concrete language, active vs passive framing, emotional vs analytical tone, frequency of systems-thinking language vs people-focused language. Return ONLY valid JSON. No preamble."

PATTERN_ANALYST_PROMPT = """Analyze this text for linguistic and cognitive patterns. Return JSON:
{{
  "pattern_archetype": "architect|catalyst|anchor|operator",
  "pattern_confidence": 0-100,
  "dominant_patterns": ["pattern1", "pattern2", "pattern3"],
  "language_style": "abstract|concrete|mixed",
  "reasoning_style": "systems|people|creative|execution"
}}
Text: {essay_text}"""

BEHAVIORAL_ANALYST_SYSTEM = "You are a behavioral analyst. Your only job is to analyze what a person DOES — their actions, decisions, responses to obstacles, and behavioral patterns revealed through their writing. Ignore how they write. Focus entirely on what they describe doing. Return ONLY valid JSON. No preamble."

BEHAVIORAL_ANALYST_PROMPT = """Analyze this text for behavioral patterns. Return JSON:
{{
  "behavioral_archetype": "architect|catalyst|anchor|operator",
  "behavioral_confidence": 0-100,
  "key_behaviors": ["behavior1", "behavior2", "behavior3"],
  "response_to_obstacles": "plans|disrupts|connects|executes",
  "action_orientation": "strategic|creative|relational|operational"
}}
Text: {essay_text}"""

VALUES_ANALYST_SYSTEM = "You are a values and motivation analyst. Your only job is to identify what a person fundamentally cares about — what drives them, what they sacrifice for, what they believe matters. Look for implicit values revealed through their choices and priorities, not just stated values. Return ONLY valid JSON. No preamble."

VALUES_ANALYST_PROMPT = """Analyze this text for core values and motivations. Return JSON:
{{
  "values_archetype": "architect|catalyst|anchor|operator",
  "values_confidence": 0-100,
  "core_values": ["value1", "value2", "value3"],
  "primary_motivation": "build|disrupt|connect|achieve",
  "key_themes": ["theme1", "theme2", "theme3"]
}}
Text: {essay_text}"""

SUPERVISOR_SYSTEM = """You are a senior identity analyst and supervisor. You receive three independent analyses of the same person's writing — from a pattern analyst, a behavioral analyst, and a values analyst. Your job is to reconcile their findings, resolve contradictions, and produce a final definitive identity profile.

Rules:
- If all three agents agree on archetype: high confidence
- If two agree and one differs: go with majority, note the tension in the origin story
- If all three disagree: assign the archetype that best explains the most evidence across all three
- The origin story must be specific to THIS person — reference their actual experiences from the text
- Never produce a generic origin story
Return ONLY valid JSON. No preamble."""

SUPERVISOR_PROMPT = """Three agents have analyzed the same essay. Reconcile their findings and produce the final profile.

PATTERN ANALYSIS: {agent1_output}
BEHAVIORAL ANALYSIS: {agent2_output}  
VALUES ANALYSIS: {agent3_output}
ORIGINAL ESSAY: {essay_text}

Return JSON matching this exact schema:
{{
  "archetype": "architect|catalyst|anchor|operator",
  "secondary_archetype": "architect|catalyst|anchor|operator|null",
  "confidence": 0-100,
  "agent_agreement": "unanimous|majority|disputed",
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
  "origin_story": "2-3 sentences. Specific to this person. Third person. References their actual experiences. Reads like the opening of a novel, not a summary.",
  "key_themes": ["theme1", "theme2", "theme3"],
  "agent_notes": "One sentence on any significant disagreement between agents and how it was resolved."
}}"""

FALLBACK_SYSTEM = "You are an expert personality analyst specializing in identifying core traits from personal essays. Return ONLY valid JSON, no preamble, no markdown."

FALLBACK_PROMPT = """Analyze this essay and return JSON with this exact schema:
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
    if text.startswith("```"):
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline + 1:]
        if text.endswith("```"):
            text = text[:-3].strip()
    return json.loads(text)


def retry_json_parse(system_prompt: str, user_prompt: str, bad_text: str) -> dict:
    logger.info("Retrying JSON parsing...")
    repair_prompt = f"Extract the JSON from this text and return ONLY valid JSON without any markdown code fences or text before/after. \n\nText: {bad_text}"
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": "You are a JSON parsing and repair expert. Return ONLY valid JSON."},
            {"role": "user", "content": repair_prompt}
        ],
        temperature=0.0,
        max_tokens=1000
    )
    return _parse_response(response.choices[0].message.content)


def call_groq(system_prompt: str, user_prompt: str) -> dict:
    start_time = time.time()
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.3,
        max_tokens=1000
    )
    text = response.choices[0].message.content
    duration = time.time() - start_time
    logger.info(f"Groq API call took {duration:.2f} seconds")
    
    try:
        return _parse_response(text)
    except Exception as e:
        logger.warning(f"Failed to parse JSON, attempting repair: {e}")
        return retry_json_parse(system_prompt, user_prompt, text)


VALID_ARCHETYPES = {"architect", "catalyst", "anchor", "operator"}
REQUIRED_TRAITS = {
    "creativity", "leadership", "empathy", "execution",
    "curiosity", "resilience", "vision", "collaboration",
}


def _validate_result(result: dict) -> dict:
    """Validate that the parsed result matches the Profile schema."""
    if result.get("archetype") not in VALID_ARCHETYPES:
        raise ValueError(f"Invalid archetype: {result.get('archetype')}")

    sec = result.get("secondary_archetype")
    if sec is not None and sec != "null" and sec not in VALID_ARCHETYPES:
        raise ValueError(f"Invalid secondary_archetype: {sec}")
    if sec == "null":
        result["secondary_archetype"] = None

    conf = result.get("confidence")
    if not isinstance(conf, (int, float)) or not (0 <= conf <= 100):
        raise ValueError(f"Invalid confidence: {conf}")

    traits = result.get("traits", {})
    if not isinstance(traits, dict):
        raise ValueError("traits must be an object")
    for key in REQUIRED_TRAITS:
        val = traits.get(key)
        if not isinstance(val, (int, float)) or not (0 <= val <= 100):
            raise ValueError(f"Invalid trait '{key}': {val}")

    if not isinstance(result.get("origin_story"), str) or len(result["origin_story"]) < 10:
        raise ValueError("origin_story must be a non-trivial string")

    if not isinstance(result.get("key_themes"), list) or len(result["key_themes"]) == 0:
        raise ValueError("key_themes must be a non-empty list")

    return result


async def analyze_essay(essay_text: str) -> dict:
    """
    Send essay to Groq for personality analysis using a 4-agent architecture.
    Returns a validated dict matching the Profile schema.
    """
    start_total = time.time()
    
    try:
        logger.info("Agent 1: Pattern Analyst running...")
        agent1_out = call_groq(PATTERN_ANALYST_SYSTEM, PATTERN_ANALYST_PROMPT.format(essay_text=essay_text))
        
        logger.info("Agent 2: Behavioral Analyst running...")
        agent2_out = call_groq(BEHAVIORAL_ANALYST_SYSTEM, BEHAVIORAL_ANALYST_PROMPT.format(essay_text=essay_text))
        
        logger.info("Agent 3: Values Analyst running...")
        agent3_out = call_groq(VALUES_ANALYST_SYSTEM, VALUES_ANALYST_PROMPT.format(essay_text=essay_text))
        
        logger.info("Supervisor Agent reconciling...")
        final_out = call_groq(SUPERVISOR_SYSTEM, SUPERVISOR_PROMPT.format(
            agent1_output=json.dumps(agent1_out),
            agent2_output=json.dumps(agent2_out),
            agent3_output=json.dumps(agent3_out),
            essay_text=essay_text
        ))
        
        validated = _validate_result(final_out)
        
        logger.info(f"Total multi-agent analysis took {time.time() - start_total:.2f} seconds")
        return validated
        
    except Exception as exc:
        logger.error(f"Multi-agent workflow failed: {exc}. Falling back to single-agent approach.")
        # Fallback to single agent
        start_fallback = time.time()
        try:
            fallback_out = call_groq(FALLBACK_SYSTEM, FALLBACK_PROMPT.format(essay_text=essay_text))
            validated_fallback = _validate_result(fallback_out)
            logger.info(f"Fallback analysis took {time.time() - start_fallback:.2f} seconds")
            return validated_fallback
        except Exception as fallback_exc:
            logger.error(f"Fallback workflow also failed: {fallback_exc}")
            raise RuntimeError(f"Groq API call failed completely: {fallback_exc}") from fallback_exc
