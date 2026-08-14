from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import hashlib

from puzzles_data import PUZZLES, get_all_puzzles_meta, get_puzzle
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------- Models ----------
class PuzzleMeta(BaseModel):
    level: int
    category: str
    difficulty: str

class PuzzleFull(BaseModel):
    level: int
    category: str
    difficulty: str
    question: str
    options: List[str]
    answer: str
    concept: str

class HintRequest(BaseModel):
    level: int

class ExplainRequest(BaseModel):
    level: int
    user_answer: str
    correct: bool


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "LogIQ API", "total_puzzles": len(PUZZLES)}


@api_router.get("/puzzles", response_model=List[PuzzleMeta])
async def list_puzzles():
    return get_all_puzzles_meta()


@api_router.get("/puzzles/{level}", response_model=PuzzleFull)
async def get_puzzle_route(level: int):
    p = get_puzzle(level)
    if not p:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    return p


@api_router.get("/daily-challenge", response_model=PuzzleFull)
async def daily_challenge():
    # Deterministic daily: hash of UTC date -> level 1..100
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    h = int(hashlib.sha256(today.encode()).hexdigest(), 16)
    level = (h % 100) + 1
    p = get_puzzle(level)
    return p


async def _ai_stream(system_msg: str, prompt: str):
    """Yield SSE-style text chunks from Gemini."""
    if not EMERGENT_LLM_KEY:
        yield "AI is unavailable. Try again later."
        return
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"logiq-{datetime.now(timezone.utc).timestamp()}",
            system_message=system_msg,
        ).with_model("gemini", "gemini-3-flash-preview")
        from emergentintegrations.llm.chat import TextDelta, StreamDone
        async for ev in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(ev, TextDelta):
                yield ev.content
            elif isinstance(ev, StreamDone):
                break
    except Exception as e:
        logger.error(f"AI stream error: {e}")
        yield f"(AI unavailable) Concept hint: think step by step."


@api_router.post("/hint")
async def get_hint(req: HintRequest):
    p = get_puzzle(req.level)
    if not p:
        raise HTTPException(status_code=404, detail="Puzzle not found")

    system = "You are a friendly logical reasoning tutor for a puzzle game. Give ONE short hint (2 sentences max) that guides the learner without revealing the answer. Be playful and encouraging."
    prompt = f"Puzzle: {p['question']}\nOptions: {', '.join(p['options'])}\nConcept: {p['concept']}\nGive a helpful hint without spoiling."

    async def gen():
        async for chunk in _ai_stream(system, prompt):
            yield chunk

    return StreamingResponse(gen(), media_type="text/plain",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api_router.post("/explain")
async def get_explanation(req: ExplainRequest):
    p = get_puzzle(req.level)
    if not p:
        raise HTTPException(status_code=404, detail="Puzzle not found")

    outcome = "correct" if req.correct else "incorrect"
    system = "You are a warm, playful logical reasoning coach. Explain the puzzle's solution clearly in 3-4 sentences. Emphasize the concept so the learner masters it. Be encouraging."
    prompt = (
        f"Puzzle: {p['question']}\n"
        f"Correct answer: {p['answer']}\n"
        f"User answered: {req.user_answer} ({outcome})\n"
        f"Concept: {p['concept']}\n"
        f"Explain the reasoning and what to remember. If wrong, gently point where they went off."
    )

    async def gen():
        async for chunk in _ai_stream(system, prompt):
            yield chunk

    return StreamingResponse(gen(), media_type="text/plain",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
