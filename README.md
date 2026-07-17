# ResumeMatch — Skill Gap Checker & Fit Verdict

A single application that compares a candidate's resume against a job description
(JD) and, using an LLM, produces one of two analyses:

- **Assignment 1 — Skill Gap:** matched skills, missing skills, and a match percentage.
- **Assignment 2 — Fit Verdict:** a verdict (`Qualified` / `Almost There` / `Not Yet`) with three concise supporting reasons.

The two assignments live in one screen as switchable **modes**. Only one mode
runs at a time — the moment you evaluate in a mode, the other locks until you
start a new evaluation.

---

## How it works

```
┌─────────────────────────┐        ┌──────────────────────────┐
│  React + Vite frontend  │  /api  │   FastAPI backend        │
│  (left: upload + JD)    │ ─────▶ │   - /api/extract         │
│  (right: modes + result)│ ◀───── │   - /api/skill-gap       │
└─────────────────────────┘  JSON  │   - /api/fit-verdict     │
                                    │        │                 │
                                    │        ▼                 │
                                    │   Groq LLM API           │
                                    │   (key stays here)       │
                                    └──────────────────────────┘
```

The Groq API key **never** reaches the browser. All model calls go through the
FastAPI backend, which reads the key from its environment.

**AI provider:** [Groq](https://groq.com) — free tier, OpenAI-compatible chat
completions, using `llama-3.3-70b-versatile` by default. Skills are extracted
and compared by the model (not by keyword matching), and JSON output is enforced
via Groq's `response_format: json_object`.

---

## Project layout

```
resume-matcher/
├── server/                 FastAPI backend
│   ├── main.py             app + routes (/extract, /skill-gap, /fit-verdict)
│   ├── groq_client.py      Groq calls + prompt construction + JSON parsing
│   ├── extract.py          PDF / DOCX / TXT text extraction
│   ├── requirements.txt
│   └── .env.example
└── client/                 React + Vite frontend
    ├── src/
    │   ├── App.jsx          layout, state, mode-locking logic
    │   ├── Results.jsx      skill-gap + verdict rendering
    │   ├── api.js           fetch wrappers
    │   └── styles.css
    ├── index.html
    ├── vite.config.js       dev proxy /api -> :8000
    └── package.json
```

---

## Setup

You need **two terminals** — one for the backend, one for the frontend.

### 1. Backend (FastAPI)

Requires Python 3.10+.

```bash
cd server
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # then edit .env and paste your key
# GROQ_API_KEY=gsk_...

uvicorn main:app --reload --port 8000
```

Get a free Groq key at <https://console.groq.com/keys>.

Verify it's up: <http://localhost:8000/api/health> should return
`{"status":"ok","groqKeyConfigured":true}`.

### 2. Frontend (React + Vite)

Requires Node 18+.

```bash
cd client
npm install
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` to the backend,
so no CORS setup or extra config is needed locally.

---

## Using the app

1. Upload a resume (PDF, DOCX, or TXT) on the top-left. The backend extracts the
   text and reports the filename back.
2. Paste the job description into the bottom-left text area.
3. On the right, choose a mode — **01 Skill Gap** or **02 Fit Verdict**.
4. Click **Evaluate**. Once it runs, the other mode locks.
5. Click **New evaluation** (top-right of the mode tabs) to unlock and switch,
   or **Re-evaluate** in the same mode to run again.

---

## Assumptions

- **Skills come from the model, not a fixed dictionary.** The LLM extracts and
  normalises skills (e.g. `react` and `React` are treated as one), which handles
  synonyms and phrasing far better than string matching, at the cost of being
  non-deterministic.
- **Match percentage** is defined as
  `round(matched / (matched + missing) * 100)`, matching the assignment example
  (3 matched, 2 missing → 60%). It is computed from the model's skill lists, and
  the backend recomputes it defensively if the model omits or mis-returns it.
- **Verdict thresholds** are described to the model in the prompt (strong match →
  `Qualified`, partial with gaps → `Almost There`, significant gaps → `Not Yet`)
  rather than derived from a hard numeric cutoff, so the judgement can weigh
  seniority and relevance, not just skill counts.
- Scanned/image-only PDFs won't yield text (no OCR) — the backend returns a clear
  error rather than silently sending an empty resume.
- Uploads are capped at 5 MB and PDFs at 15 pages to keep token use predictable.
- Resume and JD each need ~20+ characters before Evaluate is enabled.

## Trade-offs

- **Backend proxy instead of calling Groq from the browser.** An earlier prototype
  called Groq directly from the client with the key in an input field. That
  exposes the key to anyone with dev tools, so the final version moves all model
  calls server-side. The cost is that you now run two processes; the benefit is
  the key is never shipped to the browser.
- **Non-determinism.** Because extraction and classification are LLM-driven, the
  same inputs can vary slightly between runs. `temperature` is set low (0.3) to
  reduce this. A deterministic keyword matcher would be repeatable but far worse
  at real resumes.
- **One result at a time.** Per the requirement, only the active mode's result is
  kept — switching modes doesn't cache both. Simpler state, but you re-run if you
  want the other view.
- **No persistence / auth.** Results live in component state only; nothing is
  stored. Out of scope for the assignment.
- **Text-only extraction.** Layout, tables, and columns in resumes are flattened
  to plain text before analysis, which is usually fine for skill detection but
  can lose structure in heavily designed CVs.

## Possible next steps

- OCR fallback (e.g. Tesseract) for scanned PDFs.
- Cache identical resume+JD requests to cut repeat token spend.
- Show extracted-skill counts and let the user correct the skill list before
  scoring.
- Dockerfile + compose for one-command startup.
