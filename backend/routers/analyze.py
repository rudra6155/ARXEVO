"""
POST /analyze-essay router.

PRIVACY CONTRACT:
- Raw essay text is NEVER logged or stored.
- It is passed to the analysis service (Gemini) and then discarded.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.claude_service import analyze_essay

router = APIRouter()


class EssayRequest(BaseModel):
    essay_text: str = Field(
        ...,
        min_length=50,
        max_length=25000,
        description="The essay to analyze (50–25000 characters).",
    )


class TraitsResponse(BaseModel):
    creativity: int
    leadership: int
    empathy: int
    execution: int
    curiosity: int
    resilience: int
    vision: int
    collaboration: int


class AnalysisResponse(BaseModel):
    archetype: str
    secondary_archetype: str | None
    confidence: int
    traits: TraitsResponse
    origin_story: str
    key_themes: list[str]


@router.post("/analyze-essay", response_model=AnalysisResponse)
async def analyze_essay_endpoint(body: EssayRequest):
    """
    Analyze a college essay and return archetype, traits, origin story.
    The raw essay_text is never logged or stored — privacy first.
    """
    try:
        result = await analyze_essay(body.essay_text)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
