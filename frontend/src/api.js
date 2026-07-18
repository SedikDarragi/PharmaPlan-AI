/**
 * PharmaPlan AI — API client.
 *
 * Centralised fetch wrappers for every backend endpoint.
 * All calls go through the Vite proxy (/api → http://localhost:8000/api).
 */

const BASE = "/api";

/* ── Helpers ──────────────────────────────────────────────────────── */

class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
  }
}

async function request(url, options = {}) {
  const resp = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`;
    try {
      const body = await resp.json();
      detail = body.detail || detail;
    } catch {
      // ignore parse failures
    }
    throw new APIError(detail, resp.status, null);
  }

  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("text/plain")) {
    return resp.text();
  }

  return resp.json();
}

/* ── Endpoints ─────────────────────────────────────────────────────── */

/** GET /api/inventory — full factory catalogue */
export function fetchInventory() {
  return request("/inventory");
}

/** GET /api/mock-public-circular — simulated bulletin text */
export function fetchMockCircular() {
  return request("/mock-public-circular");
}

/** GET /api/live-public-circular — real data from OpenFDA via web scraper */
export function fetchLiveCircular() {
  return request("/live-public-circular");
}

/** POST /api/upload-circular — run the RAG pipeline */
export function uploadCircular(rawText, llmProvider) {
  const body = { raw_text: rawText };
  if (llmProvider) {
    body.llm_provider = llmProvider;
  }
  return request("/upload-circular", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /api/optimize-schedule — run the optimisation engine */
export function optimizeSchedule(shortages) {
  return request("/optimize-schedule", {
    method: "POST",
    body: JSON.stringify({ shortages }),
  });
}
