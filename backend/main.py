"""FastAPI backend for the Resume ↔ JD matcher.

Exposes three endpoints:
  POST /api/extract        multipart file upload -> extracted resume text
  POST /api/skill-gap      { resume, jd } -> matched/missing skills + percentage
  POST /api/fit-verdict    { resume, jd } -> verdict + 3 reasons

The Groq API key lives only on the server (loaded from the environment), so it
is never exposed to the browser.
"""
from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

import groq_client
from extract import ExtractionError, extract_text

load_dotenv()

app = FastAPI(title="Resume Matcher API", version="1.0.0")

# Allow the Vite dev server (and any origins listed in CORS_ORIGINS) to call us.
origins = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB


class CompareRequest(BaseModel):
    resume: str
    jd: str

    @field_validator("resume", "jd")
    @classmethod
    def not_too_short(cls, v: str) -> str:
        if len(v.strip()) < 20:
            raise ValueError("Text is too short to analyse (need at least 20 characters).")
        return v


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "groqKeyConfigured": bool(os.getenv("GROQ_API_KEY"))}


@app.post("/api/extract")
async def extract_endpoint(file: UploadFile = File(...)) -> dict:
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 5 MB limit.")
    try:
        text = extract_text(file.filename or "", data)
    except ExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"filename": file.filename, "text": text, "chars": len(text)}


@app.post("/api/skill-gap")
async def skill_gap_endpoint(req: CompareRequest) -> dict:
    try:
        return await groq_client.skill_gap(req.resume, req.jd)
    except groq_client.GroqError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/fit-verdict")
async def fit_verdict_endpoint(req: CompareRequest) -> dict:
    try:
        return await groq_client.fit_verdict(req.resume, req.jd)
    except groq_client.GroqError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
