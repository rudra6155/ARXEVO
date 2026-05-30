from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.analyze import router as analyze_router
from routers.upload import router as upload_router

app = FastAPI(title="ARXEVO API")

# Allow the Next.js frontend to call the API during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(analyze_router)
app.include_router(upload_router)



@app.get("/")
async def root():
    return {"message": "Welcome to the ARXEVO API. Use /health to check status."}


@app.get("/health")
async def health_check():
    return {"status": "ok"}
