import React, { useEffect, useRef, useState } from "react";

/**
 * Animated SVG donut gauge.
 *
 * Draws a circle with a coloured arc representing the current percentage.
 * When the percentage changes, the arc animates smoothly to the new value.
 * The centre displays the numeric percentage + a sub-label.
 */

const VIEWBOX = 120;
const CENTER = VIEWBOX / 2;
const RADIUS = 44;
const STROKE_W = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getColor(pct) {
  if (pct >= 85) return "#14b8a6";  // teal — excellent
  if (pct >= 75) return "#0ea5e9";  // sky — good
  if (pct >= 60) return "#f59e0b";  // amber — moderate
  return "#ef4444";                  // red — low
}

function getLabel(pct) {
  if (pct >= 85) return "Optimal";
  if (pct >= 75) return "Efficient";
  if (pct >= 60) return "Moderate";
  return "Under-utilised";
}

/* ── Animated arc helper ────────────────────────────────────────────── */

function AnimatedArc({ value, color, duration }) {
  const [offset, setOffset] = useState(CIRCUMFERENCE);
  const frameRef = useRef(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const from = prevValue.current;
    const to = value;
    prevValue.current = to;

    if (from === to) {
      setOffset(CIRCUMFERENCE * (1 - to / 100));
      return;
    }

    const startTime = performance.now();
    const diff = to - from;

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + diff * eased;
      setOffset(CIRCUMFERENCE * (1 - current / 100));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, color, duration]);

  return (
    <circle
      cx={CENTER}
      cy={CENTER}
      r={RADIUS}
      fill="none"
      stroke={color}
      strokeWidth={STROKE_W}
      strokeLinecap="round"
      strokeDasharray={CIRCUMFERENCE}
      strokeDashoffset={offset}
      transform={`rotate(-90 ${CENTER} ${CENTER})`}
      style={{ transition: "stroke 0.4s ease" }}
    />
  );
}

/* ── Main gauge component ───────────────────────────────────────────── */

export default function CapacityGauge({ percentage, isLoading, previousPercentage }) {
  const color = getColor(percentage);
  const label = getLabel(percentage);
  const displayPct = isLoading ? 0 : percentage;

  return (
    <div className="flex items-center gap-4">
      <svg
        width="96"
        height="96"
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="shrink-0"
      >
        {/* Background track */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="#1e293b"
          strokeWidth={STROKE_W}
        />

        {/* Animated arc */}
        {!isLoading && (
          <AnimatedArc
            value={displayPct}
            color={color}
            duration={1500}
          />
        )}

        {/* Centre text */}
        <text
          x={CENTER}
          y={CENTER - 4}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#f1f5f9"
          fontSize="22"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          {isLoading ? "—" : `${displayPct}%`}
        </text>
        <text
          x={CENTER}
          y={CENTER + 16}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize="9"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
          letterSpacing="1"
        >
          {isLoading ? "" : label.toUpperCase()}
        </text>
      </svg>

      {/* Side label for the KPI card context */}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-widest text-text-muted mb-1">
          Plant Line Capacity Load
        </p>
        {isLoading ? (
          <div className="h-5 w-20 rounded bg-surface-hover animate-pulse" />
        ) : (
          <p className="text-xs text-text-dim">
            {previousPercentage !== undefined && previousPercentage !== percentage
              ? `${previousPercentage}% → ${percentage}%`
              : percentage < 70
              ? "Under-utilised — run AI optimisation"
              : "Healthy utilisation"}
          </p>
        )}
      </div>
    </div>
  );
}
