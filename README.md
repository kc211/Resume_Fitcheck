# ResumeMatch --- AI Resume Skill Gap Checker

ResumeMatch is an AI-powered web application that compares a candidate's
resume against a job description and helps evaluate their suitability
for a role. Users can perform either a **Skill Gap Analysis** or a **Fit
Verdict**. The selected analysis is processed by the backend using the
Groq LLM.

------------------------------------------------------------------------

## Features

-   Upload resumes (PDF, DOCX, TXT)
-   Paste any job description
-   Skill Gap Analysis
-   Fit Verdict
-   AI-powered semantic skill matching
-   Responsive React interface

------------------------------------------------------------------------




The Groq API key **never** reaches the browser. All model calls go through the
FastAPI backend, which reads the key from its environment.

**AI provider:** [Groq](https://groq.com) — free tier, OpenAI-compatible chat
completions, using `llama-3.3-70b-versatile` by default. Skills are extracted
and compared by the model (not by keyword matching), and JSON output is enforced
via Groq's `response_format: json_object`.



## Using the app

1. Upload a resume (PDF, DOCX, or TXT) on the top-left. The backend extracts the
   text and reports the filename back.
2. Paste the job description into the bottom-left text area.
3. On the right, choose a mode — **01 Skill Gap** or **02 Fit Verdict**.
4. Click **Evaluate**. Once it runs, the other mode locks.
5. Click **New evaluation** (top-right of the mode tabs) to unlock and switch,
   or **Re-evaluate** in the same mode to run again.

---


## System Architecture

``` text
                   +----------------------+
                   |   React + Vite UI    |
                   +----------+-----------+
                              |
          Upload Resume + Enter Job Description
                              |
                              v
                  +-----------+-----------+
                  |    FastAPI Backend    |
                  +-----------+-----------+
                              |
                  Resume Text Extraction
                              |
                              |
        User selects analysis from the UI
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
 /api/skill-gap                           /api/fit-verdict
        │                                           │
        └─────────────────────┬─────────────────────┘
                              │
                              ▼
                    Prompt Construction
                              │
                              ▼
                         Groq LLM API
                              │
                              ▼
                   Structured JSON Response
                              │
                              ▼
                     Results displayed in UI
```

------------------------------------------------------------------------

## Application Workflow

1.  Upload a resume.
2.  Resume text is extracted on the backend.
3.  Paste the target job description.
4.  Select **Skill Gap Analysis** or **Fit Verdict**.
5.  The frontend calls the corresponding backend endpoint.
6.  The backend builds the appropriate prompt and sends it to the Groq
    LLM.
7.  The structured response is returned and displayed in the UI.

------------------------------------------------------------------------

## Tech Stack

**Frontend:** React, Vite, JavaScript, CSS

**Backend:** FastAPI, Python

**AI:** Groq API (Llama 3.3 70B Versatile)

**File Processing:** PDF, DOCX and TXT extraction

------------------------------------------------------------------------

## Project Structure

``` text
client/
server/
README.md
```

------------------------------------------------------------------------

## Installation

### Backend

``` bash
cd server
python -m venv .venv
# Windows
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Create a `.env` file:

``` env
GROQ_API_KEY=your_groq_api_key
```

### Frontend

``` bash
cd client
npm install
npm run dev
```

------------------------------------------------------------------------

## API Endpoints

  Endpoint             Description
  -------------------- ----------------------
  `/api/extract`       Extract resume text
  `/api/skill-gap`     Skill gap analysis
  `/api/fit-verdict`   Fit verdict analysis
  `/api/health`        Health check

------------------------------------------------------------------------

## Future Improvements

-   ATS score generation
-   OCR for scanned resumes
-   Resume improvement suggestions
-   Docker support
-   Authentication
