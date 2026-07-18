import React, { useEffect, useState, useCallback, useRef } from "react";
import { fetchInventory, fetchMockCircular, uploadCircular, optimizeSchedule } from "./api";
import KpiCards from "./components/KpiCards";
import FactoryCatalog from "./components/FactoryCatalog";
import DeficitFeed from "./components/DeficitFeed";
import BeforeAfterComparison from "./components/BeforeAfterComparison";

/* ── Header ─────────────────────────────────────────────────────────── */

const PROVIDERS = [
  { value: "", label: "Env Default" },
  { value: "mock", label: "Mock" },
  { value: "google", label: "Google Gemini" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
];

function Header({ onQuickDemo, isDemoRunning, llmProvider, onProviderChange }) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-text-primary">
            Pharma<span className="text-accent-primary">Plan</span> AI
          </h1>
          <p className="text-[11px] font-medium uppercase tracking-widest text-text-dim">
            Executive Factory Interface
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* ── LLM Provider Switcher ──────────────────────────────────── */}
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <select
            value={llmProvider}
            onChange={(e) => onProviderChange(e.target.value)}
            className="bg-surface-light/60 border border-surface-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40 cursor-pointer hover:border-surface-hover transition-colors"
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* ── Quick Demo Populate ──────────────────────────────────────── */}
        <button
          onClick={onQuickDemo}
          disabled={isDemoRunning}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary/10 px-3 py-1.5 text-xs font-medium text-accent-primary transition-all hover:bg-accent-primary/20 disabled:opacity-40"
        >
          {isDemoRunning ? (
            <>
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Running demo…
            </>
          ) : (
            <>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Quick Demo
            </>
          )}
        </button>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs text-text-dim">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          System Online
        </div>
      </div>
    </header>
  );
}

/* ── Apply AI Optimization CTA ──────────────────────────────────────── */

function OptimizationCta({ onOptimize, isOptimizing, shortages, isOptimized }) {
  const hasShortages = shortages && shortages.length > 0;

  return (
    <div className="glass-panel rounded-xl px-6 py-5 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">
          Production Line Optimization Engine
        </h3>
        <p className="text-xs text-text-dim mt-0.5">
          {isOptimized
            ? "Optimisation complete — review the before/after comparison below."
            : "Re-allocate factory capacity to match the highest-priority market shortages identified by the RAG engine."}
        </p>
      </div>
      <button
        onClick={onOptimize}
        disabled={isOptimizing || !hasShortages}
        className={`btn-cta shrink-0 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed ${
          isOptimized
            ? "from-emerald-500 to-emerald-600"
            : "from-accent-primary to-accent-secondary"
        }`}
      >
        {isOptimizing ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Optimizing…
          </>
        ) : isOptimized ? (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Optimisation Complete
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Apply AI Line Optimization
          </>
        )}
      </button>
    </div>
  );
}

/* ── Footer ─────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="px-6 py-4 border-t border-surface-border text-[10px] uppercase tracking-widest text-text-dim text-center">
      PharmaPlan AI v0.1.0 &middot; B2B SaaS &middot; Pharmaceutical Production Intelligence
    </footer>
  );
}

/* ── Main App ───────────────────────────────────────────────────────── */

export default function App() {
  const [inventory, setInventory] = useState([]);
  const [shortages, setShortages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState(null);

  // Optimization state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null);

  // LLM Provider (local override for the RAG pipeline)
  const [llmProvider, setLlmProvider] = useState("");

  // Quick Demo
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const demoInFlight = useRef(false);

  /* ── Load inventory on mount ─────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    fetchInventory()
      .then((data) => {
        if (!cancelled) setInventory(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Inventory fetch failed:", err);
          setInventoryError(err.message || "Backend unreachable");
          setInventory([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Shortages from DeficitFeed ───────────────────────────────────── */
  const handleShortagesUpdate = useCallback((items) => {
    setShortages(items);
    // Reset optimisation state when shortages change
    setIsOptimized(false);
    setOptimizationResult(null);
  }, []);

  /* ── Optimize CTA ─────────────────────────────────────────────────── */
  const handleOptimize = useCallback(async () => {
    if (isOptimizing || shortages.length === 0) return;

    setIsOptimizing(true);
    try {
      const result = await optimizeSchedule(
        shortages.map((s) => ({
          molecule_key: s.molecule_key,
          variant_found_in_text: s.variant_found_in_text,
          volume_deficit: s.volume_deficit,
          priority_score: s.priority_score,
        }))
      );
      setOptimizationResult(result);
      setIsOptimized(true);
    } catch (err) {
      console.error("Optimisation failed:", err);
      // In a live demo/pitch, the backend has a mock fallback,
      // so this branch should rarely be reached.
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, shortages]);

  /* ── Quick Demo Populate ──────────────────────────────────────────── */
  const handleQuickDemo = useCallback(async () => {
    if (demoInFlight.current) return;
    demoInFlight.current = true;
    setIsDemoRunning(true);

    try {
      // Step 1: Fetch circular
      const text = await fetchMockCircular();

      // Step 2: Process via RAG (use the selected provider)
      const provider = llmProvider || undefined;
      const ragResult = await uploadCircular(text, provider);
      const items = ragResult.items || [];
      setShortages(items);
      setIsOptimized(false);
      setOptimizationResult(null);

      // Step 3: Brief pause so user sees the RAG results populate
      await new Promise((r) => setTimeout(r, 600));

      // Step 4: Run optimization
      const optResult = await optimizeSchedule(
        items.map((s) => ({
          molecule_key: s.molecule_key,
          variant_found_in_text: s.variant_found_in_text,
          volume_deficit: s.volume_deficit,
          priority_score: s.priority_score,
        }))
      );
      setOptimizationResult(optResult);
      setIsOptimized(true);
    } catch (err) {
      console.error("Quick demo failed:", err);
    } finally {
      setIsDemoRunning(false);
      demoInFlight.current = false;
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header
        onQuickDemo={handleQuickDemo}
        isDemoRunning={isDemoRunning}
        llmProvider={llmProvider}
        onProviderChange={setLlmProvider}
      />

      <main className="flex-1 px-6 py-5 space-y-5 max-w-7xl mx-auto w-full">
        {/* ── Module A: KPI Impact Cards ──────────────────────────────── */}
        <KpiCards
          inventory={inventory}
          shortages={shortages}
          optimizationResult={optimizationResult}
          isOptimized={isOptimized}
          isLoading={isLoading}
        />

        {/* ── Apply AI Optimization CTA ───────────────────────────────── */}
        <OptimizationCta
          onOptimize={handleOptimize}
          isOptimizing={isOptimizing}
          shortages={shortages}
          isOptimized={isOptimized}
        />

        {/* ── Before vs. After Comparison ─────────────────────────────── */}
        <BeforeAfterComparison
          allocations={optimizationResult?.allocations || []}
          summary={optimizationResult?.summary || null}
          isVisible={isOptimized && optimizationResult !== null}
        />

        {/* ── Module B: Factory Catalog ───────────────────────────────── */}
        <FactoryCatalog
          inventory={
            isOptimized && optimizationResult?.allocations
              ? inventory.map((item) => {
                  const alloc = optimizationResult.allocations.find(
                    (a) => a.molecule_key === item.molecule_name
                  );
                  return alloc
                    ? {
                        ...item,
                        current_allocated_production: alloc.after_allocation,
                        available_capacity:
                          item.max_monthly_box_capacity - alloc.after_allocation,
                      }
                    : item;
                })
              : inventory
          }
          isLoading={isLoading}
          error={inventoryError}
        />

        {/* ── Module C: Live National Deficit Feed ────────────────────── */}
        <DeficitFeed
          onShortagesUpdate={handleShortagesUpdate}
          llmProvider={llmProvider}
        />
      </main>

      <Footer />
    </div>
  );
}
