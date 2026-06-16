from fastapi import FastAPI, APIRouter, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import health
from app.middleware.auth import verify_token

app = FastAPI(
    title=settings.SERVICE_NAME,
    version=settings.VERSION,
)

# CORS — allow Node.js backend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Public routes (no auth) ──────────────────────────────────
app.include_router(health.router)

# ── Protected routes (require JWT) ───────────────────────────
# Every route in this router checks the JWT before running
protected = APIRouter(dependencies=[Depends(verify_token)])


@protected.get("/hello")
async def hello():
    """Test endpoint — verify the Python service is reachable and JWT works."""
    return {"message": "AI service is alive! Your JWT works."}


app.include_router(protected, prefix="/api/v1")


@app.on_event("startup")
async def startup():
    print(f"[{settings.SERVICE_NAME}] Service starting on port 8000")
