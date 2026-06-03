from fastapi import APIRouter
from pydantic import BaseModel
from services.manga_service import generate_manga_cover

router = APIRouter()


class MangaRequest(BaseModel):
    archetype: str
    origin_story: str
    key_themes: list[str] = []
    user_name: str = "The Protagonist"


@router.post("/generate-manga-cover")
async def manga_cover_endpoint(req: MangaRequest):
    url = generate_manga_cover(
        req.archetype,
        req.origin_story,
        req.key_themes,
        req.user_name
    )
    return {"manga_cover_url": url}
