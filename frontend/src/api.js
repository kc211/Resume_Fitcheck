// All backend calls live here. The base is empty in dev (Vite proxies /api)
// and can be pointed at a deployed backend via VITE_API_BASE in production.
const BASE = import.meta.env.VITE_API_BASE || "";

async function handle(res) {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function extractResume(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/extract`, { method: "POST", body: form });
  return handle(res);
}

export async function runSkillGap(resume, jd) {
  const res = await fetch(`${BASE}/api/skill-gap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume, jd }),
  });
  return handle(res);
}

export async function runFitVerdict(resume, jd) {
  const res = await fetch(`${BASE}/api/fit-verdict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume, jd }),
  });
  return handle(res);
}
