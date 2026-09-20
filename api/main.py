"""
Vexadoc — FastAPI Entry Point
Start with: uvicorn api.main:app --reload
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from api.routes import router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting Vexadoc API...")
    yield
    print("🛑 Shutting down Vexadoc API...")


app = FastAPI(
    title="Vexadoc",
    description="Ask anything. Know everything. — Enterprise RAG Platform",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Dynamic CORS configuration ────────────────────────────────
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows local dev, Render, and Vercel domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {
        "name":    "Vexadoc",
        "tagline": "Ask anything. Know everything.",
        "version": "0.1.0",
        "status":  "running",
        "docs":    "/docs",
    }