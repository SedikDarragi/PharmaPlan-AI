import React from "react";

/* ── Delta badge ───────────────────────────────────────────────────── */

function DeltaBadge({ delta }) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="18 15 12 9 6 15" />
        </svg>
        +{delta.toLocaleString()}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/40 px-2 py-0.5 text-xs font-mono font-bold text-amber-400">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {delta.toLocaleString()}
      </span>
    );
  }
  return (
    <span className="text-xs font-mono text-text-dim">—</span>
  );
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function BeforeAfterComparison({ allocations, summary, isVisible }) {
  const formatUSD = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  if (!isVisible || !allocations || allocations.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel rounded-xl overflow-hidden transition-all duration-500">
      {/* Header */}
      <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted flex items-center gap-2">
          <svg className="w-4 h-4 text-accent-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          Before vs. After AI Optimisation
        </h2>

        {/* Summary badges */}
        {summary && (
          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <p className="text-text-dim">Revenue Before</p>
              <p className="font-mono font-semibold text-text-primary">
                {formatUSD(summary.total_revenue_before)}
              </p>
            </div>
            <svg className="w-4 h-4 text-accent-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <div className="text-right">
              <p className="text-text-dim">Revenue After</p>
              <p className="font-mono font-semibold text-accent-emerald text-emerald-400">
                {formatUSD(summary.total_revenue_after)}
              </p>
            </div>
            <div className="pl-4 border-l border-surface-border">
              <p className="text-text-dim">Captured</p>
              <p className="font-mono font-bold text-accent-warning">
                +{formatUSD(summary.captured_revenue)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-text-dim">
              <th className="text-left px-5 py-3 font-medium">Molecule</th>
              <th className="text-right px-4 py-3 font-medium">Before</th>
              <th className="text-right px-4 py-3 font-medium">After</th>
              <th className="text-center px-4 py-3 font-medium">Delta</th>
              <th className="text-right px-4 py-3 font-medium">Deficit Filled</th>
              <th className="text-right px-4 py-3 font-medium">Marginal Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {allocations.map((a, i) => {
              const formatNum = (n) => new Intl.NumberFormat("en-US").format(n);
              return (
                <tr
                  key={a.molecule_key}
                  className={`transition-colors hover:bg-surface-hover/50 ${
                    a.capacity_delta > 0
                      ? "bg-emerald-900/5"
                      : a.capacity_delta < 0
                      ? "bg-amber-900/5"
                      : ""
                  }`}
                  style={{ animation: `fade-in-up 0.3s ease-out ${i * 40}ms both` }}
                >
                  <td className="px-5 py-3 font-medium text-text-primary">
                    {a.molecule_key}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-text-muted">
                    {formatNum(a.before_allocation)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-text-primary">
                    {formatNum(a.after_allocation)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DeltaBadge delta={a.capacity_delta} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-accent-primary">
                    {a.deficit_filled > 0 ? formatNum(a.deficit_filled) : (
                      <span className="text-text-dim">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-semibold">
                    {a.marginal_revenue > 0 ? (
                      <span className="text-accent-coral">{formatUSD(a.marginal_revenue)}</span>
                    ) : (
                      <span className="text-text-dim">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer summary bar */}
      {summary && (
        <div className="px-5 py-3 border-t border-surface-border bg-surface-light/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <span className="text-text-dim">
              Capacity load:{" "}
              <span className="font-mono text-text-primary">
                {summary.overall_capacity_load_before}% → {summary.overall_capacity_load_after}%
              </span>
            </span>
            <span className="text-text-dim">
              Shortage matches filled:{" "}
              <span className="font-mono text-text-primary">{summary.total_shortage_matches}</span>
            </span>
          </div>
          <span className="text-emerald-400 font-semibold">
            +{formatUSD(summary.captured_revenue)} revenue captured
          </span>
        </div>
      )}
    </div>
  );
}
