import React, { useEffect, useRef, useState } from "react";

/* ── Icons ──────────────────────────────────────────────────────────── */

const GaugeIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 1 0 10 10" />
    <path d="M12 12 17 7" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const DollarIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

/* ── Animated counter hook ──────────────────────────────────────────── */

function useAnimatedValue(targetValue, isActive, duration = 1200, startValue = 0) {
  const [display, setDisplay] = useState(startValue);
  const frameRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isActive) {
      setDisplay(targetValue);
      hasAnimated.current = false;
      return;
    }

    // Only animate on the first activation; subsequent targetValue changes
    // during an active animation are handled by the running loop.
    if (hasAnimated.current) {
      setDisplay(targetValue);
      return;
    }

    hasAnimated.current = true;
    const diff = targetValue - startValue;
    if (diff === 0) {
      setDisplay(targetValue);
      return;
    }

    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startValue + diff * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(targetValue);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [targetValue, isActive, duration, startValue]);

  return display;
}

/* ── Card component ────────────────────────────────────────────────── */

function KpiCard({ icon, label, value, sublabel, accentColor, isLoading, isFlashing, children }) {
  return (
    <div
      className={`glass-panel rounded-xl px-5 py-4 flex items-start gap-4 transition-all duration-200 hover:border-slate-600/80 hover:shadow-lg hover:shadow-black/20 ${
        isFlashing ? "ring-2 ring-accent-warning/50 ring-offset-1 ring-offset-surface" : ""
      }`}
    >
      <div
        className="shrink-0 mt-0.5 rounded-lg p-2.5"
        style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-widest text-text-muted mb-1">
          {label}
        </p>
        {isLoading ? (
          <div className="h-7 w-24 rounded bg-surface-hover animate-pulse" />
        ) : (
          <p className="kpi-value text-2xl font-bold font-mono tracking-tight">{value}</p>
        )}
        {sublabel && (
          <p className="text-xs text-text-dim mt-0.5 truncate">{sublabel}</p>
        )}
        {children}
      </div>
    </div>
  );
}

/* ── KPI row ───────────────────────────────────────────────────────── */

export default function KpiCards({
  inventory,
  shortages,
  optimizationResult,
  isOptimized,
  isLoading,
}) {
  /* ── Compute baseline KPIs ──────────────────────────────────────── */
  let baselineCapacity = 65;
  let baselineShortages = 0;
  let baselineUncaptured = 0;

  if (inventory && inventory.length > 0) {
    const totalCap = inventory.reduce((s, i) => s + i.max_monthly_box_capacity, 0);
    const totalAlloc = inventory.reduce((s, i) => s + i.current_allocated_production, 0);
    baselineCapacity = totalCap > 0 ? Math.round((totalAlloc / totalCap) * 100) : 0;

    if (shortages && shortages.length > 0) {
      baselineShortages = shortages.length;
      shortages.forEach((s) => {
        const match = inventory.find((i) => i.molecule_name === s.molecule_key);
        if (match) {
          baselineUncaptured += match.margin_per_box_usd * s.volume_deficit;
        }
      });
    }
  }

  /* ── Optimized values from backend ──────────────────────────────── */
  const optSummary = optimizationResult?.summary || {};
  const optAllocations = optimizationResult?.allocations || [];

  // Total shortage matches (only those actually filled)
  const filledMatches = optAllocations.filter((a) => a.deficit_filled > 0).length;

  const optimizedCapacity = isOptimized ? (optSummary.overall_capacity_load_after ?? baselineCapacity) : baselineCapacity;
  const optimizedShortages = isOptimized ? (filledMatches || baselineShortages) : baselineShortages;
  const capturedRevenue = isOptimized ? (optSummary.captured_revenue ?? 0) : 0;
  const uncapturedAfter = isOptimized ? Math.max(0, baselineUncaptured - capturedRevenue) : baselineUncaptured;

  /* ── Animated counters ──────────────────────────────────────────── */
  const capAnim = useAnimatedValue(optimizedCapacity, isOptimized, 1500, baselineCapacity);
  const revAnim = useAnimatedValue(uncapturedAfter, isOptimized, 1500, baselineUncaptured);
  const capturedAnim = useAnimatedValue(capturedRevenue, isOptimized, 1500, 0);

  const formatUSD = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const showOptimizedLabel = (before, after) =>
    isOptimized ? `${before}% → ${after}%` : "";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* 1. Capacity Load */}
      <KpiCard
        icon={<GaugeIcon />}
        label="Plant Line Capacity Load"
        value={
          isLoading
            ? "—"
            : isOptimized
            ? `${capAnim}%`
            : `${baselineCapacity}%`
        }
        sublabel={
          isOptimized
            ? `Optimised from ${optSummary.overall_capacity_load_before ?? baselineCapacity}%`
            : baselineCapacity < 70
            ? "Under-utilised — run AI optimisation"
            : "Healthy utilisation"
        }
        accentColor={isOptimized ? "#14b8a6" : "#0ea5e9"}
        isLoading={isLoading}
      />

      {/* 2. Shortage Matches */}
      <KpiCard
        icon={<AlertIcon />}
        label="Active Shortage Matches Filled"
        value={isLoading ? "—" : String(optimizedShortages)}
        sublabel={
          isOptimized
            ? `${filledMatches} of ${baselineShortages} shortages addressed`
            : baselineShortages === 0
            ? "Process a circular first"
            : `${baselineShortages} opportunities identified`
        }
        accentColor={isOptimized ? "#14b8a6" : "#f59e0b"}
        isLoading={isLoading}
      />

      {/* 3. Uncaptured Revenue (counts down to $0 on optimize) */}
      <KpiCard
        icon={<DollarIcon />}
        label="Uncaptured Revenue Opportunity"
        value={isLoading ? "—" : isOptimized ? formatUSD(revAnim) : formatUSD(baselineUncaptured)}
        sublabel={
          isOptimized
            ? "Being captured by optimisation engine…"
            : baselineUncaptured === 0
            ? "Process a circular to estimate"
            : "Gross margin left unfulfilled"
        }
        accentColor={isOptimized ? "#f59e0b" : "#14b8a6"}
        isLoading={isLoading}
      />

      {/* 4. Captured Revenue (NEW — flashes on optimize) */}
      <KpiCard
        icon={<TrendingUpIcon />}
        label="Captured Contractual Revenue Added"
        value={
          isLoading
            ? "—"
            : isOptimized
            ? `+${formatUSD(capturedAnim)}`
            : formatUSD(0)
        }
        sublabel={
          isOptimized
            ? "Additional revenue captured via re-allocation"
            : "Run AI optimisation to capture value"
        }
        accentColor="#10b981"
        isLoading={isLoading}
        isFlashing={isOptimized && capturedAnim > 0 && capturedAnim < capturedRevenue}
      />
    </div>
  );
}
