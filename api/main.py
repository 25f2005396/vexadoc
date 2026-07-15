"""
Vexadoc — FastAPI Entry Point
Start with: uvicorn api.main:app --reload
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting Vexadoc...")
    yield
    print("Shutting down Vexadoc...")


app = FastAPI(
    title="Vexadoc",
    description="Ask anything. Know everything. — Enterprise RAG Platform",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
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