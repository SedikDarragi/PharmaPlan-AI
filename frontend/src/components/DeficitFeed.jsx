import React, { useState } from "react";
import { fetchMockCircular, fetchLiveCircular, uploadCircular, syncPctFeeds } from "../api";

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

function ShortageRow({ item, index, moleculeNames, onSelect }) {
  const formatNum = (n) => new Intl.NumberFormat("en-US").format(n);
  const match = moleculeNames.find((m) => m === item.molecule_key);

  const handleClick = () => {
    if (onSelect) {
      onSelect({
        molecule_name: item.molecule_key,
        variant_found_in_text: item.variant_found_in_text,
        volume_deficit: item.volume_deficit,
        priority_score: item.priority_score,
      }, item);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`feed-item flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
        onSelect ? "cursor-pointer hover:bg-surface-light/80" : "bg-surface-light/40 hover:bg-surface-light/70"
      }`}
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

export default function DeficitFeed({ onShortagesUpdate, onCircularProcessed, llmProvider, onSelectMolecule }) {
  const [circularText, setCircularText] = useState(null);
  const [shortages, setShortages] = useState([]);
  const [loading, setLoading] = useState({
    fetch: false,
    process: false,
    sync: false,
  });
  const [error, setError] = useState(null);
  const [moleculeNames, setMoleculeNames] = useState([]);
  const [dataSource, setDataSource] = useState(null); // "mock" | "live" | "pct"
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(null);
  const [syncSource, setSyncSource] = useState(null); // human-readable source from PCT
  const [syncStatus, setSyncStatus] = useState(null); // "live" | "cached" | "fallback"

  /* ── Fetch mock circular ─────────────────────────────────────────── */
  const handleFetchMock = async () => {
    setLoading((prev) => ({ ...prev, fetch: true }));
    setDataSource("mock");
    setError(null);
    setLastSyncTimestamp(null);
    setSyncSource(null);
    setSyncStatus(null);
    // Clear any previous shortage results (e.g. from PCT sync) so the
    // user sees a clean slate for the new source.
    setShortages([]);
    setMoleculeNames([]);
    if (onShortagesUpdate) onShortagesUpdate([]);
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
    setLastSyncTimestamp(null);
    setSyncSource(null);
    setSyncStatus(null);
    // Clear any previous shortage results so the user sees a clean slate.
    setShortages([]);
    setMoleculeNames([]);
    if (onShortagesUpdate) onShortagesUpdate([]);
    try {
      const text = await fetchLiveCircular();
      setCircularText(text);
    } catch (err) {
      setError(err.message || "Failed to fetch live data.");
    } finally {
      setLoading((prev) => ({ ...prev, fetch: false }));
    }
  };

  /* ── Sync Live PCT Network Feeds ───────────────────────────────────── */
  const handleSyncPct = async () => {
    setLoading((prev) => ({ ...prev, sync: true }));
    setDataSource("pct");
    setError(null);
    try {
      const provider = llmProvider || undefined;
      const result = await syncPctFeeds({ autoProcess: true, llmProvider: provider });

      // Update connection state
      setLastSyncTimestamp(result.timestamp || new Date().toISOString());
      setSyncSource(result.source || "Pharmacie Centrale de Tunisie");
      setSyncStatus(result.status || "fallback");

      // Populate bulletin text (always available — even from fallback)
      const text = result.pct_bulletin_text || "";
      setCircularText(text);

      // If auto_process returned RAG results, populate shortages immediately
      if (result.rag_results && result.rag_results.length > 0) {
        const items = result.rag_results;
        setShortages(items);
        setMoleculeNames(items.map((i) => i.molecule_key));
        if (onShortagesUpdate) onShortagesUpdate(items);
        if (onCircularProcessed) onCircularProcessed(items, "pct", llmProvider);
      }
    } catch (err) {
      setError(err.message || "PCT synchronisation failed. The PCT site may be geo-restricted. Fallback data loaded.");
    } finally {
      setLoading((prev) => ({ ...prev, sync: false }));
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
      if (onCircularProcessed) onCircularProcessed(items, dataSource, llmProvider);
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
    setLastSyncTimestamp(null);
    setSyncSource(null);
    setSyncStatus(null);
    if (onShortagesUpdate) onShortagesUpdate([]);
  };

  const isProcessing = loading.fetch || loading.process || loading.sync;
  const hasCircular = Boolean(circularText);
  const hasResults = shortages.length > 0;

  /* ── Format timestamp for display ────────────────────────────────── */
  const formatTimestamp = (iso) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
          Live National Deficit Feed
        </h2>

        <div className="flex items-center gap-2">
          {/* 🔄 Sync Live PCT Network Feeds — primary action */}
          <button
            onClick={handleSyncPct}
            disabled={isProcessing}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
              syncStatus === "live"
                ? "bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 ring-1 ring-emerald-500/30"
                : "bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 ring-1 ring-violet-500/30"
            }`}
          >
            {loading.sync ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Connecting…
              </>
            ) : syncStatus === "live" ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                PCT Live
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="2 12 7 12 9 15 15 9 17 12 22 12" />
                </svg>
                Sync Live PCT Network Feeds
              </>
            )}
          </button>

          {/* Mock Data — secondary */}
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

          {/* Live Data from OpenFDA — tertiary */}
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
          {hasCircular && !hasResults && (
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
              Click <strong className="text-violet-300">Sync Live PCT Network Feeds</strong> to pull real{" "}
              <strong className="text-text-primary">Pharmacie Centrale de Tunisie</strong> shortage data
            </p>
            <p className="text-xs mt-1">
              Or use <strong className="text-accent-primary">Mock Data</strong> (simulated) or{" "}
              <strong className="text-emerald-400">Live Data</strong> (OpenFDA)
            </p>
          </div>
        )}

        {/* Connection state indicator (shown when PCT data is loaded) */}
        {dataSource === "pct" && lastSyncTimestamp && (
          <div
            className={`mb-4 rounded-lg border px-4 py-2.5 flex items-center justify-between text-xs ${
              syncStatus === "live"
                ? "bg-emerald-900/15 border-emerald-800/30"
                : syncStatus === "cached"
                ? "bg-amber-900/15 border-amber-800/30"
                : "bg-slate-700/30 border-slate-600/30"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {/* Live/fallback indicator */}
              <span
                className={`relative flex h-2.5 w-2.5 ${
                  syncStatus === "live" ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {syncStatus === "live" ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </>
                ) : (
                  <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </span>

              <span
                className={`font-medium ${
                  syncStatus === "live" ? "text-emerald-300" : "text-amber-300"
                }`}
              >
                {syncStatus === "live" ? "🟢 Live Connection" : "⚠️ Fallback Mode"}
              </span>

              <span className="text-text-dim">·</span>

              <span className="text-text-dim">{syncSource || "PCT"}</span>

              <span className="text-text-dim">·</span>

              <span className="font-mono text-text-muted tabular-nums">
                Last sync: {formatTimestamp(lastSyncTimestamp)}
              </span>
            </div>

            {syncStatus !== "live" && (
              <button
                onClick={handleSyncPct}
                disabled={loading.sync}
                className="text-xs text-accent-primary hover:text-accent-primary/80 underline underline-offset-2 disabled:opacity-40"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {hasCircular && !hasResults && (
          <div className="mb-4">
            {/* Source indicator + char count */}
            <p className="text-xs text-text-dim mb-2">
              <span
                className={`inline-block w-2 h-2 rounded-full mr-1 ${
                  dataSource === "live"
                    ? "bg-emerald-400"
                    : dataSource === "pct"
                    ? "bg-violet-400"
                    : "bg-accent-primary"
                }`}
              />
              {dataSource === "pct"
                ? "PCT"
                : dataSource === "live"
                ? "Live (OpenFDA)"
                : "Mock"}{" "}
              circular fetched ({circularText.length.toLocaleString()} chars) — ready to process:
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
                  <span className="ml-2 text-emerald-400">via OpenFDA live data</span>
                )}
                {dataSource === "pct" && (
                  <span className="ml-2 text-violet-400">via PCT live sync</span>
                )}
              </p>
            </div>
            {shortages.map((item, i) => (
              <ShortageRow
                key={`${item.molecule_key}-${i}`}
                item={item}
                index={i}
                moleculeNames={moleculeNames}
                onSelect={onSelectMolecule}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
