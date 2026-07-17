import { useEffect, useState } from "react";

export function EmptyState() {
  return (
    <div className="empty-state">
      <i className="ti ti-scan empty-icon" aria-hidden="true" />
      <div className="empty-title">No analysis yet</div>
      <div className="empty-sub">
        Pick a mode, add a resume and job description, then hit Evaluate. The
        other mode locks once you start.
      </div>
    </div>
  );
}

export function LoadingResults() {
  const widths = [80, 60, 100, 50, 70];
  return (
    <div className="loading-wrap">
      <div className="loading-row">
        {widths.map((w, i) => (
          <div
            key={i}
            className="shimmer"
            style={{
              width: w,
              height: 26,
              borderRadius: 20,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      <div className="shimmer" style={{ width: "100%" }} />
      <div className="shimmer" style={{ width: "85%" }} />
      <div className="shimmer" style={{ width: "65%" }} />
      <div
        className="shimmer"
        style={{ width: "100%", height: 60, borderRadius: 10, marginTop: 8 }}
      />
    </div>
  );
}

export function ErrorBanner({ message }) {
  return (
    <div className="error-banner">
      <i className="ti ti-alert-circle" aria-hidden="true" />
      {message}
    </div>
  );
}

function fitMeta(pct) {
  if (pct >= 70) return { color: "var(--green)", label: "Strong fit" };
  if (pct >= 45) return { color: "var(--amber)", label: "Partial fit" };
  return { color: "var(--red)", label: "Low fit" };
}

export function SkillGapResult({ data }) {
  const pct = Math.max(0, Math.min(100, Math.round(data.matchPercent)));
  const R = 44;
  const C = 2 * Math.PI * R;
  const { color, label } = fitMeta(pct);
  const matched = data.matched || [];
  const missing = data.missing || [];

  // Animate the ring from empty to its value on mount.
  const [offset, setOffset] = useState(C);
  useEffect(() => {
    const t = setTimeout(() => setOffset(C - (pct / 100) * C), 80);
    return () => clearTimeout(t);
  }, [C, pct]);

  return (
    <>
      <div className="result-card summary-row">
        <div className="ring-wrap">
          <svg
            className="ring-svg"
            width="110"
            height="110"
            viewBox="0 0 110 110"
            aria-hidden="true"
          >
            <circle className="ring-track" cx="55" cy="55" r={R} />
            <circle
              className="ring-fill"
              cx="55"
              cy="55"
              r={R}
              stroke={color}
              strokeDasharray={C}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="ring-pct">
            <span className="ring-num" style={{ color }}>
              {pct}%
            </span>
            <span className="ring-label">match</span>
          </div>
        </div>
        <div>
          <div className="summary-fit" style={{ color }}>
            {label}
          </div>
          <div className="summary-detail">
            {matched.length} matched · {missing.length} missing of{" "}
            {matched.length + missing.length} required
          </div>
        </div>
      </div>

      <div className="result-card">
        <div className="result-card-title" style={{ color: "var(--green)" }}>
          <i className="ti ti-check" aria-hidden="true" /> Matched Skills
        </div>
        <div className="skill-pills">
          {matched.length ? (
            matched.map((s, i) => (
              <span
                key={s + i}
                className="pill matched"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {s}
              </span>
            ))
          ) : (
            <span className="pills-empty">None found.</span>
          )}
        </div>
      </div>

      <div className="result-card">
        <div className="result-card-title" style={{ color: "var(--red)" }}>
          <i className="ti ti-x" aria-hidden="true" /> Missing Skills
        </div>
        <div className="skill-pills">
          {missing.length ? (
            missing.map((s, i) => (
              <span
                key={s + i}
                className="pill missing"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {s}
              </span>
            ))
          ) : (
            <span className="pills-empty">No gaps — great match!</span>
          )}
        </div>
      </div>
    </>
  );
}

const VERDICT_STYLE = {
  Qualified: { cls: "qualified", icon: "ti-circle-check" },
  "Almost There": { cls: "almost", icon: "ti-adjustments-horizontal" },
  "Not Yet": { cls: "not-yet", icon: "ti-circle-x" },
};

export function FitVerdictResult({ data }) {
  const meta = VERDICT_STYLE[data.verdict] || VERDICT_STYLE["Not Yet"];
  return (
    <>
      <div className={`verdict-badge ${meta.cls}`}>
        <div className="verdict-label">
          <i className={`ti ${meta.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />{" "}
          Fit Assessment
        </div>
        <div className="verdict-text">{data.verdict}</div>
      </div>

      <div className="result-card">
        <div className="result-card-title">
          <i className="ti ti-list" aria-hidden="true" /> Supporting Reasons
        </div>
        <div className="reason-list">
          {(data.reasons || []).map((r, i) => (
            <div
              key={i}
              className="reason-item"
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <span className="reason-num">0{i + 1}</span>
              <span className="reason-text">{r}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
