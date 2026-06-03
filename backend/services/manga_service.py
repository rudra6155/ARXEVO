import requests
import os
import base64
import time

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")

# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT NOTES (important — do NOT change the URL pattern):
#
#  router.huggingface.co/hf-inference/models/<model>
#      ↑ correct for ALL standard HF-inference tasks (text-to-image, NLP, etc.)
#      ↑ returns raw binary image bytes on 200, NOT JSON
#
#  router.huggingface.co/hf-inference/models/<model>/v1/images/generations
#      ↑ WRONG — /v1/ paths are OpenAI-compat chat/LLM routes only
#
#  Request body: {"inputs": "<prompt>", "parameters": {...}}
#      ↑ "inputs" key required — NOT "prompt", NOT "n", NOT "size"
#      ↑ optional params go inside "parameters" dict
# ─────────────────────────────────────────────────────────────────────────────

MODEL_URL = (
    "https://router.huggingface.co/hf-inference/models/"
    "black-forest-labs/FLUX.1-schnell"
)


def _post_and_parse(headers: dict, payload: dict, timeout: int = 90) -> str | None:
    """POST to HF inference endpoint and return base64 data URL, or None on failure."""
    response = requests.post(MODEL_URL, headers=headers, json=payload, timeout=timeout)

    # Log enough context to diagnose future issues
    print(f"HF status: {response.status_code} | content-type: {response.headers.get('content-type', '?')}")

    if response.status_code == 200:
        content_type = response.headers.get("content-type", "")
        if "image" in content_type or len(response.content) > 1000:
            # Raw binary bytes — the expected success path
            img_b64 = base64.b64encode(response.content).decode("utf-8")
            ext = "png" if "png" in content_type else "jpeg"
            return f"data:image/{ext};base64,{img_b64}"
        else:
            # Shouldn't happen on 200, but log it
            print(f"HF 200 but unexpected body: {response.text[:300]}")
            return None

    elif response.status_code in (503, 429):
        # 503 = model loading, 429 = rate-limit — both are transient
        print(f"HF transient {response.status_code}: {response.text[:200]}")
        return "RETRY"

    else:
        print(f"HF API error {response.status_code}: {response.text[:400]}")
        return None


def generate_manga_cover(
    archetype: str,
    origin_story: str,
    key_themes: list,
    user_name: str = "The Protagonist",
) -> str | None:

    if not HF_API_KEY:
        print("HUGGINGFACE_API_KEY not set — skipping manga generation")
        return None

    archetype_visuals = {
        "architect": "geometric blueprint grids, structural frameworks, technical precision, city blueprints in background",
        "catalyst": "explosive energy radiating outward, spark trails, dynamic breaking and reforming, kinetic force",
        "anchor": "deep roots visible, interconnected web of people, concentric ripples across water, community",
        "operator": "precise clockwork machinery, gears turning, systematic execution, mechanical perfection",
    }

    visual = archetype_visuals.get(
        archetype.lower(), "abstract personal power emanating outward"
    )
    themes = ", ".join(key_themes[:3]) if key_themes else "journey, growth, determination"
    story = origin_story[:200] if origin_story else ""

    prompt = (
        f"1990s Japanese anime magazine cover art, Newtype magazine style, "
        f"Marvel comics energy, Image Comics epic scale. Professional editorial illustration. "
        f"Magazine cover layout with masthead at top reading ARXEVO. "
        f"Central protagonist hero figure, 65% of frame, determined expression looking toward horizon, "
        f"human and relatable with signs of struggle, strong dramatic pose, "
        f"detailed clothing with realistic folds and texture. "
        f"Character archetype: {archetype.upper()}. "
        f"Visual environment: {visual}. "
        f"Themes: {themes}. "
        f"Story context: {story}. "
        f"Past struggles depicted behind character in shadow, future aspirations ahead in light. "
        f"Character stands at transition point between darkness and hope. "
        f"Art style: hand-painted anime illustration, cel animation color treatment, "
        f"real brush textures, printed magazine texture, slight paper grain, "
        f"halftone printing artifacts, 1990s collector edition. "
        f"Masterpiece illustration, professional editorial artwork, extremely detailed, "
        f"sharp focal hierarchy, strong composition, cinematic atmosphere, high contrast, rich shadows."
    )

    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json",
    }

    # HF inference standard format: {"inputs": prompt, "parameters": {...}}
    payload = {
        "inputs": prompt,
        "parameters": {
            "num_inference_steps": 4,
            "guidance_scale": 0.0,   # FLUX-schnell is guidance-distilled; 0.0 is correct
        },
    }

    try:
        result = _post_and_parse(headers, payload, timeout=90)

        if result == "RETRY":
            print("HF model loading/rate-limited — waiting 25s then retrying...")
            time.sleep(25)
            result = _post_and_parse(headers, payload, timeout=90)

        if result and result != "RETRY":
            return result

        return None

    except requests.exceptions.Timeout:
        print("HF request timed out after 90s")
        return None
    except Exception as e:
        print(f"Manga generation error: {e}")
        return None
