import { useEffect, useRef, useState } from "react";
import { extractResume, runSkillGap, runFitVerdict } from "./api";
import {
  EmptyState,
  LoadingResults,
  ErrorBanner,
  SkillGapResult,
  FitVerdictResult,
} from "./Results";

const MODE = { SKILL_GAP: 1, FIT_VERDICT: 2 };
const MODE_NAME = { 1: "Skill Gap", 2: "Fit Verdict" };

export default function App() {
  const [activeTab, setActiveTab] = useState(MODE.SKILL_GAP);
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [jd, setJd] = useState("");
  const [uploading, setUploading] = useState(false);

  // Only ONE mode's result exists at a time; lockedTo commits you to a mode.
  const [result, setResult] = useState(null); // { mode, data }
  const [lockedTo, setLockedTo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [health, setHealth] = useState(null); // { ok, keyConfigured }
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  // Probe the backend once so we can warn early if the key isn't configured.
  useEffect(() => {
    fetch((import.meta.env.VITE_API_BASE || "") + "/api/health")
      .then((r) => r.json())
      .then((d) => setHealth({ ok: true, keyConfigured: d.groqKeyConfigured }))
      .catch(() => setHealth({ ok: false, keyConfigured: false }));
  }, []);

  const ready =
    resumeText.trim().length > 20 && jd.trim().length > 20 && !loading;

  async function handleFile(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "docx", "txt"].includes(ext)) {
      setError("Please upload a PDF, DOCX, or TXT file.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const { text } = await extractResume(file);
      setResumeText(text);
      setResumeFile(file.name);
      // New resume invalidates any prior result/lock.
      setResult(null);
      setLockedTo(null);
    } catch (e) {
      setError(e.message);
      setResumeText("");
      setResumeFile(null);
    } finally {
      setUploading(false);
    }
  }

  function switchTab(n) {
    if (loading) return;
    if (lockedTo && n !== lockedTo) return; // other mode is locked
    setActiveTab(n);
  }

  function resetAll() {
    if (loading) return;
    setResult(null);
    setLockedTo(null);
    setError("");
  }

  async function evaluate() {
    if (!ready) return;
    setLoading(true);
    setError("");
    setLockedTo(activeTab); // commit + lock the other mode
    try {
      const data =
        activeTab === MODE.SKILL_GAP
          ? await runSkillGap(resumeText, jd)
          : await runFitVerdict(resumeText, jd);
      setResult({ mode: activeTab, data });
    } catch (e) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const showResultForActive = result && result.mode === activeTab && !loading;

  // Status line under the results.
  let statusState = "";
  let statusMsg = "";
  if (loading) {
    statusState = "loading";
    statusMsg = "Groq is analyzing the documents...";
  } else if (!resumeText) {
    statusMsg = "Upload a resume to continue.";
  } else if (!jd.trim()) {
    statusMsg = "Paste a job description to continue.";
  } else if (lockedTo) {
    statusState = "ready";
    statusMsg = `Locked to ${MODE_NAME[lockedTo]} mode.`;
  } else {
    statusState = "ready";
    statusMsg = "Ready to evaluate.";
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-icon">
          <i className="ti ti-chart-radar" aria-hidden="true" />
        </div>
        <h1>
          ResumeMatch <span>· Groq</span>
        </h1>
        {health && (
          <div className="health">
            <span
              className={`health-dot ${
                health.ok && health.keyConfigured ? "ok" : "bad"
              }`}
            />
            {!health.ok
              ? "Backend offline"
              : health.keyConfigured
              ? "Backend ready"
              : "API key missing"}
          </div>
        )}
      </header>

      <div className="main">
        {/* LEFT */}
        <div className="left">
          <div className="left-top">
            <div className="section-label">
              <i className="ti ti-file-cv" aria-hidden="true" /> Resume
            </div>
            <div
              className={`upload-zone ${resumeFile ? "has-file" : ""} ${
                dragOver ? "drag-over" : ""
              } ${uploading ? "loading" : ""}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files[0]);
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {uploading ? (
                <>
                  <i className="ti ti-loader-2 upload-icon spin" aria-hidden="true" />
                  <div className="upload-title">Extracting text…</div>
                </>
              ) : resumeFile ? (
                <>
                  <i className="ti ti-file-check upload-icon" aria-hidden="true" />
                  <div className="upload-title">Resume uploaded</div>
                  <div className="upload-sub">Click to replace</div>
                  <div className="file-chip">
                    <i className="ti ti-file-check" aria-hidden="true" />
                    <span className="file-name">{resumeFile}</span>
                  </div>
                </>
              ) : (
                <>
                  <i className="ti ti-cloud-upload upload-icon" aria-hidden="true" />
                  <div className="upload-title">Drop your resume here</div>
                  <div className="upload-sub">PDF, DOCX, or TXT</div>
                </>
              )}
            </div>
          </div>

          <div className="left-bottom">
            <div className="section-label">
              <i className="ti ti-briefcase" aria-hidden="true" /> Job Description
            </div>
            <textarea
              className="jd-textarea"
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description here — requirements, responsibilities, preferred skills..."
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className="right">
          <div className="mode-tabs">
            <button
              className={`mode-tab ${activeTab === 1 ? "active" : ""} ${
                lockedTo === 2 ? "locked" : ""
              }`}
              onClick={() => switchTab(1)}
            >
              <span className="tab-num">01</span>Skill Gap
              {lockedTo === 2 && (
                <i className="ti ti-lock lock-icon" aria-hidden="true" />
              )}
            </button>
            <button
              className={`mode-tab ${activeTab === 2 ? "active" : ""} ${
                lockedTo === 1 ? "locked" : ""
              }`}
              onClick={() => switchTab(2)}
            >
              <span className="tab-num">02</span>Fit Verdict
              {lockedTo === 1 && (
                <i className="ti ti-lock lock-icon" aria-hidden="true" />
              )}
            </button>
            {lockedTo && (
              <button className="reset-btn" onClick={resetAll}>
                <i className="ti ti-refresh" aria-hidden="true" />
                New evaluation
              </button>
            )}
          </div>

          <div className="results-area">
            {loading ? (
              <LoadingResults />
            ) : error ? (
              <ErrorBanner message={error} />
            ) : showResultForActive ? (
              activeTab === MODE.SKILL_GAP ? (
                <SkillGapResult data={result.data} />
              ) : (
                <FitVerdictResult data={result.data} />
              )
            ) : (
              <EmptyState />
            )}
          </div>

          <div className="bottom-bar">
            <div className={`status-dot ${statusState}`} />
            <div className="status-text">{statusMsg}</div>
            <button className="eval-btn" disabled={!ready} onClick={evaluate}>
              {loading ? (
                <>
                  <i className="ti ti-loader-2 spin" aria-hidden="true" /> Evaluating…
                </>
              ) : result && result.mode === activeTab ? (
                <>
                  <i className="ti ti-refresh" aria-hidden="true" /> Re-evaluate
                </>
              ) : (
                <>
                  <i className="ti ti-player-play" aria-hidden="true" /> Evaluate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
