import React from "react";

/* ── Bar sub-component ─────────────────────────────────────────────── */

function CapacityBar({ used, total }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const color =
    pct >= 90
      ? "bg-accent-danger"
      : pct >= 75
      ? "bg-accent-warning"
      : "bg-accent-primary";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-surface-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="font-mono text-xs text-text-muted w-10 text-right tabular-nums">
        {pct}%
      </span>
    </div>
  );
}

/* ── Status badge ──────────────────────────────────────────────────── */

function StatusBadge({ available }) {
  if (available > 50_000) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        High
      </span>
    );
  }
  if (available > 10_000) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-900/40 px-2.5 py-0.5 text-xs font-medium text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      Low
    </span>
  );
}

/* ── Table ─────────────────────────────────────────────────────────── */

export default function FactoryCatalog({ inventory, isLoading, error }) {
  /* ── Error state ──────────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="glass-panel rounded-xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-900/30 mb-3">
          <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-sm text-red-400 font-medium mb-1">Failed to load factory catalogue</p>
        <p className="text-xs text-text-dim">{error}</p>
      </div>
    );
  }

  /* ── Loading state ────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="glass-panel rounded-xl p-5">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 rounded bg-surface-hover animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  /* ── Empty state ──────────────────────────────────────────────────── */
  if (!inventory || inventory.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-8 text-center text-text-dim">
        <p>No inventory data available.</p>
      </div>
    );
  }

  const formatNum = (n) => new Intl.NumberFormat("en-US").format(n);

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-surface-border">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
          Factory Catalogue &amp; Capabilities
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-text-dim">
              <th className="text-left px-5 py-3 font-medium">Molecule</th>
              <th className="text-left px-4 py-3 font-medium">Dosage</th>
              <th className="text-left px-4 py-3 font-medium">Form</th>
              <th className="text-right px-4 py-3 font-medium">Capacity / mo</th>
              <th className="text-right px-4 py-3 font-medium">Allocated</th>
              <th className="text-right px-4 py-3 font-medium">Available</th>
              <th className="text-left px-4 py-3 font-medium">Capacity Load</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {inventory.map((item, i) => (
              <tr
                key={item.molecule_name}
                className="transition-colors hover:bg-surface-hover/50"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <td className="px-5 py-3 font-medium text-text-primary">
                  {item.molecule_name}
                </td>
                <td className="px-4 py-3 text-text-muted font-mono text-xs">
                  {item.active_dosage}
                </td>
                <td className="px-4 py-3 text-text-muted">{item.delivery_form}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-text-muted">
                  {formatNum(item.max_monthly_box_capacity)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-text-muted">
                  {formatNum(item.current_allocated_production)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-accent-primary">
                  {formatNum(item.available_capacity)}
                </td>
                <td className="px-4 py-3 min-w-[130px]">
                  <CapacityBar
                    used={item.current_allocated_production}
                    total={item.max_monthly_box_capacity}
                  />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge available={item.available_capacity} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
