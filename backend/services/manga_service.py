import requests
import os
import base64

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")

# HuggingFace router endpoint — OpenAI-compatible images/generations API
# Avoids Railway DNS issues with the legacy api-inference host
MODEL_URL = (
    "https://router.huggingface.co/hf-inference/models/"
    "black-forest-labs/FLUX.1-schnell/v1/images/generations"
)


def _parse_image_response(data: dict) -> str | None:
    """Extract a base64 data URL from an OpenAI-style images/generations response."""
    items = data.get("data", [])
    if not items:
        return None

    item = items[0]

    # Preferred: the API returned a hosted URL — fetch and convert to base64
    image_url = item.get("url")
    if image_url:
        try:
            img_response = requests.get(image_url, timeout=30)
            if img_response.status_code == 200:
                img_b64 = base64.b64encode(img_response.content).decode("utf-8")
                return f"data:image/jpeg;base64,{img_b64}"
        except Exception as e:
            print(f"Failed to fetch image URL: {e}")

    # Fallback: the API returned inline base64
    b64_data = item.get("b64_json")
    if b64_data:
        return f"data:image/jpeg;base64,{b64_data}"

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

    prompt = f"""1990s Japanese anime magazine cover art,
Newtype magazine style, Marvel comics energy,
Image Comics epic scale. Professional editorial
illustration. Magazine cover layout with masthead
at top reading ARXEVO.

Central protagonist hero figure, 65% of frame,
determined expression looking toward horizon,
human and relatable with signs of struggle,
strong dramatic pose, detailed clothing with
realistic folds and texture.

Character archetype: {archetype.upper()}
Visual environment: {visual}
Themes: {themes}
Story context: {story}

Past struggles depicted behind character in shadow,
future aspirations ahead in light. Character stands
at transition point between darkness and hope.

Art style: hand-painted anime illustration,
cel animation color treatment, real brush textures,
printed magazine texture, slight paper grain,
halftone printing artifacts, 1990s collector edition.

Masterpiece illustration, professional editorial
artwork, extremely detailed, sharp focal hierarchy,
strong composition, cinematic atmosphere,
high contrast, rich shadows.

NOT generic AI art. NOT generic superhero.
This is the official magazine cover of a
real person's life story."""

    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "prompt": prompt,
        "n": 1,
        "size": "768x1024",
    }

    try:
        response = requests.post(
            MODEL_URL,
            headers=headers,
            json=payload,
            timeout=60,
        )

        if response.status_code == 200:
            result = _parse_image_response(response.json())
            if result:
                return result
            print("HF response 200 but no image data found")

        elif response.status_code == 503:
            # Model still loading — retry once after 20 s
            import time
            print("HF model loading, retrying in 20 s...")
            time.sleep(20)
            retry = requests.post(
                MODEL_URL,
                headers=headers,
                json=payload,
                timeout=60,
            )
            if retry.status_code == 200:
                result = _parse_image_response(retry.json())
                if result:
                    return result
            print(f"HF retry error: {retry.status_code} — {retry.text[:200]}")

        else:
            print(f"HF API error: {response.status_code} — {response.text[:200]}")

        return None

    except Exception as e:
        print(f"Manga generation error: {e}")
        return None
