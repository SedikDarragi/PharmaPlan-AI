import React, { useState, useRef, useEffect } from "react";

/* ── Icon map ───────────────────────────────────────────────────────── */

const ICONS = {
  inventory: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  circular: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  rag: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  optimize: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  molecule: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9V3" />
      <path d="M12 15v6" />
      <path d="M8.5 8.5 4 4" />
      <path d="M15.5 15.5 20 20" />
      <path d="M8.5 15.5 4 20" />
      <path d="M15.5 8.5 20 4" />
    </svg>
  ),
  demo: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  live: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="2 12 7 12 9 15 15 9 17 12 22 12" />
    </svg>
  ),
};

/* ── Single event row ───────────────────────────────────────────────── */

function EventRow({ event, index }) {
  const icon = ICONS[event.type] || ICONS.circular;
  const time = new Date(event.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      className="flex items-center gap-3 py-2 px-4 rounded-lg transition-colors hover:bg-surface-hover/40"
      style={{ animation: `fade-in-up 0.2s ease-out ${index * 30}ms both` }}
    >
      {/* Dot + line */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: event.color || "#0ea5e9" }}
        />
      </div>

      {/* Icon */}
      <div
        className="shrink-0 rounded-md p-1.5"
        style={{ backgroundColor: `${event.color || "#0ea5e9"}15`, color: event.color || "#0ea5e9" }}
      >
        {icon}
      </div>

      {/* Description */}
      <p className="flex-1 text-xs text-text-primary truncate min-w-0">
        {event.description}
      </p>

      {/* Timestamp */}
      <span className="shrink-0 font-mono text-[10px] text-text-dim tabular-nums">
        {time}
      </span>
    </div>
  );
}

/* ── Feed component ─────────────────────────────────────────────────── */

export default function ActivityFeed({ events, maxVisible = 20 }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef(null);
  const prevCount = useRef(0);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current && events.length > prevCount.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevCount.current = events.length;
  }, [events.length]);

  if (!events || events.length === 0) return null;

  const displayEvents = isExpanded ? events : events.slice(-5);
  const hasMore = events.length > 5;

  return (
    <div className="glass-panel rounded-xl overflow-hidden transition-all duration-300">
      {/* Toggle header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-3 border-b border-surface-border hover:bg-surface-hover/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {events.slice(-3).map((e, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full border border-surface"
                style={{ backgroundColor: e.color || "#0ea5e9" }}
              />
            ))}
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Activity Log
          </h3>
          <span className="text-[10px] font-mono text-text-dim">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
        </div>

        <svg
          className={`w-3.5 h-3.5 text-text-dim transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Event list */}
      <div
        ref={scrollRef}
        className={`overflow-y-auto transition-all duration-300 ${
          isExpanded ? "max-h-80" : "max-h-[180px]"
        }`}
      >
        <div className="py-2">
          {displayEvents.map((event, i) => (
            <EventRow key={event.id} event={event} index={i} />
          ))}
        </div>
      </div>

      {/* Toggle more/less */}
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 text-[10px] uppercase tracking-wider text-text-dim hover:text-text-muted transition-colors border-t border-surface-border"
        >
          {isExpanded ? "Show less" : `Show ${events.length - 5} more`}
        </button>
      )}
    </div>
  );
}
