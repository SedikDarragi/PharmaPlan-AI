import React, { useEffect } from "react";
import MOLECULE_KNOWLEDGE, { getMoleculeFallback } from "../data/molecules";

/* ── Pill tags ─────────────────────────────────────────────────────── */

function Pill({ label, color }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium ${color}`}
    >
      {label}
    </span>
  );
}

/* ── Stat row ───────────────────────────────────────────────────────── */

function StatRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] uppercase tracking-wider text-text-dim">
        {label}
      </span>
      <span className={`font-mono text-xs font-semibold ${accent ? "text-accent-primary" : "text-text-primary"}`}>
        {value}
      </span>
    </div>
  );
}

/* ── Drawer backdrop + panel ────────────────────────────────────────── */

export default function MoleculeDetailDrawer({
  molecule,
  optimizationInfo,
  shortageInfo,
  onClose,
}) {
  /* ── Close on Escape key ──────────────────────────────────────────── */
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!molecule) return null;

  const info = MOLECULE_KNOWLEDGE[molecule.molecule_name] || getMoleculeFallback(molecule.molecule_name);
  const formatNum = (n) => new Intl.NumberFormat("en-US").format(n);
  const formatUSD = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  const isLoading = molecule._loading;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-surface border-l border-surface-border shadow-2xl shadow-black/50 overflow-y-auto transition-transform duration-300"
        style={{ animation: "slide-in 0.25s ease-out" }}
      >
        <style>{`
          @keyframes slide-in {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 bg-surface border-b border-surface-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{info.classIcon}</span>
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                {molecule.molecule_name}
              </h2>
              <p className="text-xs text-text-dim">{info.therapeuticClass}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-dim hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* ── ATC + Brand aliases ──────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap">
            <Pill label={`ATC: ${info.atcCode}`} color="bg-accent-primary/15 text-accent-primary" />
            {info.brandAliases.slice(0, 4).map((b) => (
              <Pill key={b} label={b} color="bg-surface-hover text-text-muted" />
            ))}
          </div>

          {/* ── Description ──────────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
              Description
            </h3>
            <p className="text-sm text-text-primary leading-relaxed">
              {info.description}
            </p>
          </div>

          {/* ── Mechanism of Action ──────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
              Mechanism of Action
            </h3>
            <p className="text-sm text-text-dim leading-relaxed">
              {info.mechanism}
            </p>
          </div>

          {/* ── Typical Indications ──────────────────────────────────── */}
          {info.typicalIndications.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
                Typical Indications
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {info.typicalIndications.map((ind) => (
                  <Pill key={ind} label={ind} color="bg-emerald-900/30 text-emerald-400" />
                ))}
              </div>
            </div>
          )}

          {/* ── Factory stats ────────────────────────────────────────── */}
          <div className="glass-panel rounded-xl p-4 space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
              Factory Production Stats
            </h3>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-4 rounded bg-surface-hover animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <StatRow
                  label="Dosage form"
                  value={`${molecule.active_dosage} ${molecule.delivery_form}`}
                />
                <StatRow
                  label="Monthly capacity"
                  value={formatNum(molecule.max_monthly_box_capacity)}
                />
                <StatRow
                  label="Currently allocated"
                  value={formatNum(molecule.current_allocated_production)}
                />
                <StatRow
                  label="Available capacity"
                  value={formatNum(molecule.available_capacity)}
                  accent
                />
                <StatRow
                  label="Margin per box"
                  value={formatUSD(molecule.margin_per_box_usd)}
                />
              </>
            )}
          </div>

          {/* ── Shortage / optimization info ─────────────────────────── */}
          {shortageInfo && (
            <div className="glass-panel rounded-xl p-4 space-y-1 border border-accent-warning/30">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-accent-warning mb-2">
                ⚠ National Deficit
              </h3>
              <StatRow
                label="Variant found in text"
                value={shortageInfo.variant_found_in_text}
              />
              <StatRow
                label="Volume deficit"
                value={formatNum(shortageInfo.volume_deficit)}
                accent
              />
              <StatRow
                label="Priority score"
                value={`P${shortageInfo.priority_score}`}
              />
            </div>
          )}

          {optimizationInfo && (
            <div className="glass-panel rounded-xl p-4 space-y-1 border border-emerald-900/40">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">
                ✅ Optimisation Impact
              </h3>
              <StatRow
                label="Allocation before"
                value={formatNum(optimizationInfo.before_allocation)}
              />
              <StatRow
                label="Allocation after"
                value={formatNum(optimizationInfo.after_allocation)}
                accent
              />
              <StatRow
                label="Deficit filled"
                value={formatNum(optimizationInfo.deficit_filled)}
              />
              <StatRow
                label="Marginal revenue"
                value={formatUSD(optimizationInfo.marginal_revenue)}
              />
            </div>
          )}

          {/* ── Warnings ──────────────────────────────────────────────── */}
          {info.warnings.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
                ⚠ Safety Notes
              </h3>
              <ul className="space-y-1">
                {info.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-dim">
                    <span className="mt-0.5 w-1 h-1 rounded-full bg-accent-danger shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
