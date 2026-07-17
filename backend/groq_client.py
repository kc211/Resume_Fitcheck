"""Thin wrapper around the Groq chat-completions API.

Keeps the API key server-side and centralises prompt construction + JSON parsing
so the route handlers stay small.
"""
from __future__ import annotations

import json
import os

import httpx

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Cap how much text we forward to keep token use predictable.
RESUME_CHAR_LIMIT = 6000
JD_CHAR_LIMIT = 4000


class GroqError(Exception):
    """Raised when the Groq API returns a non-200 or unparseable response."""


async def _call_groq(prompt: str, max_tokens: int) -> dict:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise GroqError("GROQ_API_KEY is not set on the server.")

    payload = {
        "model": GROQ_MODEL,
        "max_tokens": max_tokens,
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
        "messages": [{"role": "user", "content": prompt}],
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        try:
            resp = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        except httpx.RequestError as exc:
            raise GroqError(f"Could not reach Groq: {exc}") from exc

    if resp.status_code == 401:
        raise GroqError("Groq rejected the API key (401). Check GROQ_API_KEY.")
    if resp.status_code == 429:
        raise GroqError("Groq rate limit hit (429). Wait a moment and retry.")
    if resp.status_code != 200:
        raise GroqError(f"Groq API error {resp.status_code}: {resp.text[:200]}")

    data = resp.json()
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise GroqError("Unexpected response shape from Groq.") from exc

    content = content.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise GroqError(f"Groq did not return valid JSON: {content[:200]}") from exc


def _trim(text: str, limit: int) -> str:
    return text.strip()[:limit]


async def skill_gap(resume: str, jd: str) -> dict:
    """Assignment 1 — extract + compare skills, return match percentage."""
    prompt = f"""You are a technical recruiter. Extract skills from both documents and compare them.

RESUME:
{_trim(resume, RESUME_CHAR_LIMIT)}

JOB DESCRIPTION:
{_trim(jd, JD_CHAR_LIMIT)}

Return ONLY a JSON object shaped exactly like:
{{"matched": ["skill"], "missing": ["skill"], "matchPercent": 60}}

Rules:
- Extract concrete skills only: technologies, tools, languages, frameworks, certifications.
- "matched" = skills that appear in BOTH the resume and the job description.
- "missing" = skills required by the job description but NOT present in the resume.
- "matchPercent" = round(len(matched) / (len(matched) + len(missing)) * 100). Use 0 if both are empty.
- Deduplicate and normalise casing (e.g. "react" and "React" are the same skill)."""
    data = await _call_groq(prompt, max_tokens=1000)
    # Defensive normalisation so the frontend can trust the shape.
    matched = list(dict.fromkeys(data.get("matched", []) or []))
    missing = list(dict.fromkeys(data.get("missing", []) or []))
    total = len(matched) + len(missing)
    percent = data.get("matchPercent")
    if not isinstance(percent, (int, float)):
        percent = round(len(matched) / total * 100) if total else 0
    return {
        "matched": matched,
        "missing": missing,
        "matchPercent": max(0, min(100, round(percent))),
    }


async def fit_verdict(resume: str, jd: str) -> dict:
    """Assignment 2 — classification verdict + three reasons."""
    prompt = f"""You are a senior technical recruiter assessing candidate fit for a role.

RESUME:
{_trim(resume, RESUME_CHAR_LIMIT)}

JOB DESCRIPTION:
{_trim(jd, JD_CHAR_LIMIT)}

Return ONLY a JSON object shaped exactly like:
{{"verdict": "Almost There", "reasons": ["reason", "reason", "reason"]}}

Rules:
- "verdict" MUST be exactly one of: "Qualified", "Almost There", "Not Yet".
  - "Qualified" = strong match, most requirements met.
  - "Almost There" = good partial match with some key gaps.
  - "Not Yet" = significant gaps in required skills.
- "reasons" = exactly 3 short, specific sentences, each under 20 words."""
    data = await _call_groq(prompt, max_tokens=500)
    verdict = data.get("verdict", "Not Yet")
    if verdict not in ("Qualified", "Almost There", "Not Yet"):
        verdict = "Not Yet"
    reasons = (data.get("reasons") or [])[:3]
    while len(reasons) < 3:
        reasons.append("Insufficient detail to assess this dimension.")
    return {"verdict": verdict, "reasons": reasons}
