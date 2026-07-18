import React, { useState } from "react";
import { fetchMockCircular, fetchLiveCircular, uploadCircular } from "../api";

/* ── Priority badge ────────────────────────────────────────────────── */

function PriorityBadge({ score }) {
  const color =
    score >= 8
      ? "bg-red-900/50 text-red-400 border-red-800/60"
      : score >= 5
      ? "bg-amber-900/50 text-amber-400 border-amber-800/60"
      : "bg-sky-900/50 text-sky-400 border-sky-800/60";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${color}`}
    >
      P{score}
    </span>
  );
}

/* ── Single shortage row ───────────────────────────────────────────── */

function ShortageRow({ item, index, moleculeNames }) {
  const formatNum = (n) => new Intl.NumberFormat("en-US").format(n);
  const match = moleculeNames.find((m) => m === item.molecule_key);

  return (
    <div
      className="feed-item flex items-center gap-3 rounded-lg bg-surface-light/40 px-4 py-3 transition-colors hover:bg-surface-light/70"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-text-primary truncate">
            {item.molecule_key}
          </span>
          {!match && (
            <span className="text-[10px] uppercase tracking-wider text-accent-warning bg-amber-900/30 px-1.5 py-0.5 rounded">
              Unmatched
            </span>
          )}
        </div>
        <p className="text-xs text-text-dim truncate mt-0.5">
          Variant found: <span className="font-mono text-accent-coral">{item.variant_found_in_text}</span>
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="font-mono text-sm font-semibold text-text-primary">
          {new Intl.NumberFormat("en-US").format(item.volume_deficit)}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-text-dim">Deficit</p>
      </div>

      <div className="shrink-0">
        <PriorityBadge score={item.priority_score} />
      </div>
    </div>
  );
}

/* ── Feed component ────────────────────────────────────────────────── */

export default function DeficitFeed({ onShortagesUpdate, llmProvider }) {
  const [circularText, setCircularText] = useState(null);
  const [shortages, setShortages] = useState([]);
  const [loading, setLoading] = useState({
    fetch: false,
    process: false,
  });
  const [error, setError] = useState(null);
  const [moleculeNames, setMoleculeNames] = useState([]);
  const [dataSource, setDataSource] = useState(null); // "mock" | "live"

  /* ── Fetch mock circular ─────────────────────────────────────────── */
  const handleFetchMock = async () => {
    setLoading((prev) => ({ ...prev, fetch: true }));
    setDataSource("mock");
    setError(null);
    try {
      const text = await fetchMockCircular();
      setCircularText(text);
    } catch (err) {
      setError(err.message || "Failed to fetch mock circular.");
    } finally {
      setLoading((prev) => ({ ...prev, fetch: false }));
    }
  };

  /* ── Fetch live circular from OpenFDA ─────────────────────────────── */
  const handleFetchLive = async () => {
    setLoading((prev) => ({ ...prev, fetch: true }));
    setDataSource("live");
    setError(null);
    try {
      const text = await fetchLiveCircular();
      setCircularText(text);
    } catch (err) {
      setError(err.message || "Failed to fetch live data.");
    } finally {
      setLoading((prev) => ({ ...prev, fetch: false }));
    }
  };

  /* ── Process via RAG pipeline ─────────────────────────────────────── */
  const handleProcessCircular = async () => {
    if (!circularText) return;
    setLoading((prev) => ({ ...prev, process: true }));
    setError(null);
    try {
      const provider = llmProvider || undefined;
      const result = await uploadCircular(circularText, provider);
      const items = result.items || [];
      setShortages(items);
      setMoleculeNames(items.map((i) => i.molecule_key));
      if (onShortagesUpdate) onShortagesUpdate(items);
    } catch (err) {
      setError(err.message || "RAG pipeline processing failed.");
    } finally {
      setLoading((prev) => ({ ...prev, process: false }));
    }
  };

  /* ── Clear ────────────────────────────────────────────────────────── */
  const handleClear = () => {
    setCircularText(null);
    setShortages([]);
    setError(null);
    setDataSource(null);
    if (onShortagesUpdate) onShortagesUpdate([]);
  };

  const isProcessing = loading.fetch || loading.process;
  const hasCircular = Boolean(circularText);
  const hasResults = shortages.length > 0;

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
          Live National Deficit Feed
        </h2>

        <div className="flex items-center gap-2">
          {/* Fetch Mock button */}
          <button
            onClick={handleFetchMock}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary/15 px-3 py-1.5 text-xs font-medium text-accent-primary transition-all hover:bg-accent-primary/25 disabled:opacity-40"
          >
            {loading.fetch && dataSource !== "live" ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Fetching…
              </>
            ) : (
              <>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-9-9" />
                  <path d="M21 3v6h-6" />
                </svg>
                Mock Data
              </>
            )}
          </button>

          {/* Fetch Live button */}
          <button
            onClick={handleFetchLive}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900/30 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-900/50 disabled:opacity-40"
          >
            {loading.fetch && dataSource === "live" ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Fetching…
              </>
            ) : (
              <>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="2 12 7 12 9 15 15 9 17 12 22 12" />
                </svg>
                Live Data
              </>
            )}
          </button>

          {/* Process button */}
          {hasCircular && (
            <button
              onClick={handleProcessCircular}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-warning/15 px-3 py-1.5 text-xs font-medium text-accent-warning transition-all hover:bg-accent-warning/25 disabled:opacity-40"
            >
              {loading.process ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Processing…
                </>
              ) : (
                "Submit to RAG Engine"
              )}
            </button>
          )}

          {/* Active provider badge */}
          {hasCircular && llmProvider && (
            <span className="text-[10px] uppercase tracking-wider text-accent-primary bg-accent-primary/10 px-2 py-1 rounded">
              {llmProvider}
            </span>
          )}

          {/* Clear button */}
          {hasResults && (
            <button
              onClick={handleClear}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-dim transition-all hover:text-text-muted hover:bg-surface-hover"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {error && (
          <div className="mb-4 rounded-lg bg-red-900/20 border border-red-800/40 px-4 py-3 text-sm text-red-400">
            ⚠ {error}
          </div>
        )}

        {!hasCircular && !error && (
          <div className="py-12 text-center text-text-dim">
            <svg className="mx-auto w-10 h-10 mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <p className="text-sm">
              Click <strong>Mock Data</strong> for a simulated bulletin, or{" "}
              <strong>Live Data</strong> to fetch real shortages from OpenFDA
            </p>
            <p className="text-xs mt-1">
              Then submit to the RAG engine to extract opportunities
            </p>
          </div>
        )}

        {hasCircular && !hasResults && (
          <div className="mb-4">
            <p className="text-xs text-text-dim mb-2">
              <span
                className={`inline-block w-2 h-2 rounded-full mr-1 ${
                  dataSource === "live" ? "bg-emerald-400" : "bg-accent-primary"
                }`}
              />
              {dataSource === "live" ? "Live" : "Mock"} circular fetched (
              {circularText.length.toLocaleString()} chars) — ready to process:
            </p>
            <pre className="max-h-40 overflow-y-auto rounded-lg bg-surface/60 p-3 text-[11px] leading-relaxed text-text-dim font-mono whitespace-pre-wrap border border-surface-border">
              {circularText.slice(0, 1500)}
              {circularText.length > 1500 && (
                <span className="text-accent-warning"> … [truncated]</span>
              )}
            </pre>
          </div>
        )}

        {hasResults && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-text-dim">
                {shortages.length} shortage{shortages.length !== 1 ? "s" : ""} identified
                {dataSource === "live" && (
                  <span className="ml-2 text-emerald-400">via live data</span>
                )}
              </p>
            </div>
            {shortages.map((item, i) => (
              <ShortageRow
                key={`${item.molecule_key}-${i}`}
                item={item}
                index={i}
                moleculeNames={moleculeNames}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
