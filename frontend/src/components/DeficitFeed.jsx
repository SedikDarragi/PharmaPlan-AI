import React, { useState } from "react";
import { fetchMockCircular, uploadCircular } from "../api";

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
      {/* Molecule info */}
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

      {/* Deficit volume */}
      <div className="text-right shrink-0">
        <p className="font-mono text-sm font-semibold text-text-primary">
          {formatNum(item.volume_deficit)}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-text-dim">Deficit</p>
      </div>

      {/* Priority */}
      <div className="shrink-0">
        <PriorityBadge score={item.priority_score} />
      </div>
    </div>
  );
}

/* ── Feed component ────────────────────────────────────────────────── */

export default function DeficitFeed({ onShortagesUpdate }) {
  const [circularText, setCircularText] = useState(null);
  const [shortages, setShortages] = useState([]);
  const [loading, setLoading] = useState({
    fetch: false,
    process: false,
  });
  const [error, setError] = useState(null);
  const [moleculeNames, setMoleculeNames] = useState([]);

  /* ── Step 1: Fetch the mock circular ─────────────────────────────── */
  const handleFetchCircular = async () => {
    setLoading((prev) => ({ ...prev, fetch: true }));
    setError(null);
    try {
      const text = await fetchMockCircular();
      setCircularText(text);
    } catch (err) {
      setError(err.message || "Failed to fetch circular.");
    } finally {
      setLoading((prev) => ({ ...prev, fetch: false }));
    }
  };

  /* ── Step 2: Process via RAG pipeline ─────────────────────────────── */
  const handleProcessCircular = async () => {
    if (!circularText) return;
    setLoading((prev) => ({ ...prev, process: true }));
    setError(null);
    try {
      const result = await uploadCircular(circularText);
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

  /* ── Step 3: Clear results ────────────────────────────────────────── */
  const handleClear = () => {
    setCircularText(null);
    setShortages([]);
    setError(null);
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
          {/* Fetch button */}
          <button
            onClick={handleFetchCircular}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary/15 px-3 py-1.5 text-xs font-medium text-accent-primary transition-all hover:bg-accent-primary/25 disabled:opacity-40"
          >
            {loading.fetch ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Fetching…
              </>
            ) : (
              "Fetch Circular"
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
        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-900/20 border border-red-800/40 px-4 py-3 text-sm text-red-400">
            ⚠ {error}
          </div>
        )}

        {/* Status: nothing loaded */}
        {!hasCircular && !error && (
          <div className="py-12 text-center text-text-dim">
            <svg className="mx-auto w-10 h-10 mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <p className="text-sm">Click <strong>Fetch Circular</strong> to load a mock public bulletin</p>
            <p className="text-xs mt-1">Then submit to the RAG engine to extract shortage opportunities</p>
          </div>
        )}

        {/* Circular preview */}
        {hasCircular && !hasResults && (
          <div className="mb-4">
            <p className="text-xs text-text-dim mb-2">
              Circular fetched ({circularText.length.toLocaleString()} chars) — ready to process:
            </p>
            <pre className="max-h-40 overflow-y-auto rounded-lg bg-surface/60 p-3 text-[11px] leading-relaxed text-text-dim font-mono whitespace-pre-wrap border border-surface-border">
              {circularText.slice(0, 1500)}
              {circularText.length > 1500 && (
                <span className="text-accent-warning"> … [truncated]</span>
              )}
            </pre>
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-text-dim">
                {shortages.length} shortage{shortages.length !== 1 ? "s" : ""} identified
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
