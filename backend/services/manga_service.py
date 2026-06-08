import requests
import os
import base64
import time

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")

MODEL_URL = (
    "https://router.huggingface.co/hf-inference/models/"
    "black-forest-labs/FLUX.1-schnell"
)


def _post_and_parse(headers: dict, payload: dict, timeout: int = 90) -> str | None:
    response = requests.post(MODEL_URL, headers=headers, json=payload, timeout=timeout)
    print(f"HF status: {response.status_code} | content-type: {response.headers.get('content-type', '?')}")

    if response.status_code == 200:
        content_type = response.headers.get("content-type", "")
        if "image" in content_type or len(response.content) > 1000:
            img_b64 = base64.b64encode(response.content).decode("utf-8")
            ext = "png" if "png" in content_type else "jpeg"
            return f"data:image/{ext};base64,{img_b64}"
        else:
            print(f"HF 200 but unexpected body: {response.text[:300]}")
            return None
    elif response.status_code in (503, 429):
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
        "architect": "blueprint schematics and structural frameworks in midground, city blueprints and engineering drawings emerging from the background, geometric precision in every corner",
        "catalyst": "spark trails and kinetic energy radiating from the protagonist, shattered old structures transforming into new forms in midground, a reimagined world in the background",
        "anchor": "an interconnected web of relationships and community in midground, deep roots intertwined with rippling water, a thriving community or institution in the background",
        "operator": "precise gears and clockwork machinery turning in midground, systematic processes visualized as elegant mechanical systems, a completed mission or perfected achievement in the background",
    }

    visual = archetype_visuals.get(
        archetype.lower(), "symbolic representations of the protagonist's defining journey in midground, their greatest achievement visualized in the background"
    )
    themes = ", ".join(key_themes[:3]) if key_themes else "journey, growth, determination"

    # Extract first sentence as the dramatic quote
    first_sentence = ""
    if origin_story:
        parts = origin_story.replace("!", ".").replace("?", ".").split(".")
        first_sentence = parts[0].strip() if parts else origin_story[:120].strip()
        if len(first_sentence) > 120:
            first_sentence = first_sentence[:117] + "..."

    prompt = f"""The cover should feel like a collector's edition anime magazine from an alternate universe where this person became the protagonist of their own legendary story.

Authentic 1990s Japanese anime magazine cover. Inspired by Newtype, Animage, early Shonen Jump promotional artwork. Professional editorial illustration. Printed cel-animation aesthetic. Hand-painted anime artwork. Subtle paper grain. Magazine cover, not a movie poster.

Large ARXEVO masthead at the top. Issue number "VOL.01". Publication details, barcode, editorial sidebars, feature headlines. Authentic magazine typography and layout.

MAIN CHARACTER: A human protagonist reflecting this archetype: {archetype.upper()}.
{visual}
Distinct personality. Natural imperfections. Not a superhero. Not generic. The character should feel like a real person whose life has become worthy of a cover story.

COMPOSITION:
Foreground: The protagonist standing at the threshold of transformation.
Midground: Visual storytelling extracted directly from this biography — memories, struggles, inventions, achievements, mentors, failures, and turning points from: {themes}. These elements feel grounded in the environment, not floating.
Background: A visualization of the future mission — dream destination, institution, invention, city, movement, or societal impact. Past, present, and future coexist in a single composition.

NARRATIVE TENSION: The image should raise a question about what happens next. The protagonist looks toward an unanswered future.

EDITORIAL CAPTION: Integrate this as a short teaser line in editorial typography within the cover layout: "{first_sentence}"

EDITORIAL DESIGN: Strong focal hierarchy. Feature headline text as part of the cover design. Editorial sidebar text along one edge. Small publication details in margins. Collector-edition border design. Professional magazine cover layout.

ART STYLE: Hand-painted anime illustration. Cel animation color treatment. Real brush textures. Printed magazine paper texture. Halftone printing artifacts. 1990s collector edition quality. Strong ink outlines. Rich color palette. Dramatic lighting. Cinematic atmosphere. High contrast shadows. Rich emotional depth.

The viewer should immediately think: "This looks like the first issue of a legendary story."

AVOID: Generic anime protagonist. Floating disconnected icons. Random technology holograms. Corporate branding aesthetics. AI poster aesthetics. Excessive visual effects. Overcrowded collage layouts. LinkedIn-style motivation."""

    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": prompt,
        "parameters": {
            "num_inference_steps": 4,
            "guidance_scale": 0.0,
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
