import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.settings import settings
from app.db.session import init_db
from app.api.router import api_router


app = FastAPI(title="CRM API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/api/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}


@app.on_event("startup")
async def _startup() -> None:
    # Run blocking DB init + seed in a thread so the event loop stays free.
    await asyncio.to_thread(init_db)

