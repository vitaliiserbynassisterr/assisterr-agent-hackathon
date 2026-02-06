"use client";

import React, { useState, useEffect } from "react";
import { SolanaEvent, SolanaEventType } from "@/hooks/useSolanaEvents";

interface LiveEventsFeedProps {
  events: SolanaEvent[];
  isConnected: boolean;
  lastEventTime: Date | null;
  onClear?: () => void;
  onSimulate?: () => void;
  className?: string;
}

/**
 * Event type configuration for styling and icons
 */
const eventConfig: Record<SolanaEventType, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  agent_registered: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    label: "Agent Registered",
  },
  agent_updated: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.1)",
    borderColor: "rgba(59, 130, 246, 0.3)",
    label: "Agent Updated",
  },
  reputation_changed: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.3)",
    label: "Reputation Changed",
  },
  challenge_created: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    color: "#a855f7",
    bgColor: "rgba(168, 85, 247, 0.1)",
    borderColor: "rgba(168, 85, 247, 0.3)",
    label: "Challenge Created",
  },
  challenge_responded: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    color: "#22d3ee",
    bgColor: "rgba(34, 211, 238, 0.1)",
    borderColor: "rgba(34, 211, 238, 0.3)",
    label: "Challenge Response",
  },
  connection_status: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
      </svg>
    ),
    color: "#64748b",
    bgColor: "rgba(100, 116, 139, 0.1)",
    borderColor: "rgba(100, 116, 139, 0.3)",
    label: "Connection",
  },
};

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleDateString();
}

/**
 * Single event item component
 */
function EventItem({ event, isNew }: { event: SolanaEvent; isNew: boolean }) {
  const config = eventConfig[event.type];
  const [timeAgo, setTimeAgo] = useState(formatRelativeTime(event.timestamp));

  // Update relative time every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatRelativeTime(event.timestamp));
    }, 10000);
    return () => clearInterval(interval);
  }, [event.timestamp]);

  // Build event description
  const getDescription = () => {
    const { data } = event;

    switch (event.type) {
      case "agent_registered":
        return (
          <>
            <span className="font-semibold" style={{ color: config.color }}>
              {data.agentName}
            </span>{" "}
            joined the network
          </>
        );

      case "agent_updated":
        return (
          <>
            <span className="font-semibold" style={{ color: config.color }}>
              {data.agentName}
            </span>{" "}
            updated profile
          </>
        );

      case "reputation_changed":
        const repDelta = (data.newReputation || 0) - (data.oldReputation || 0);
        return (
          <>
            <span className="font-semibold" style={{ color: config.color }}>
              {data.agentName}
            </span>{" "}
            reputation{" "}
            <span className={repDelta > 0 ? "text-[#10b981]" : "text-[#ef4444]"}>
              {repDelta > 0 ? "+" : ""}{repDelta}
            </span>
          </>
        );

      case "challenge_created":
        return (
          <>
            Challenge issued to{" "}
            <span className="font-semibold" style={{ color: config.color }}>
              {data.agentName}
            </span>
          </>
        );

      case "challenge_responded":
        const passed = data.status === "passed";
        const delta = (data.newReputation || 0) - (data.oldReputation || 0);
        return (
          <>
            <span className="font-semibold" style={{ color: config.color }}>
              {data.agentName}
            </span>{" "}
            {passed ? "passed" : "failed"} challenge{" "}
            <span className={passed ? "text-[#10b981]" : "text-[#ef4444]"}>
              ({delta > 0 ? "+" : ""}{delta})
            </span>
          </>
        );

      case "connection_status":
        return (
          <>
            WebSocket {data.status === "connected" ? (
              <span className="text-[#10b981]">connected</span>
            ) : (
              <span className="text-[#ef4444]">disconnected</span>
            )}
          </>
        );

      default:
        return "Unknown event";
    }
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-lg transition-all duration-500
        ${isNew ? "animate-slide-in bg-[var(--bg-surface)]" : "bg-transparent"}
      `}
      style={{
        borderLeft: `3px solid ${config.borderColor}`,
      }}
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{
          backgroundColor: config.bgColor,
          color: config.color,
        }}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-primary)] leading-relaxed">
          {getDescription()}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          {timeAgo}
        </p>
      </div>

      {/* Pulse indicator for new events */}
      {isNew && (
        <div className="flex-shrink-0">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: config.color }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Live Events Feed Component
 *
 * Displays real-time blockchain events with animations
 */
export function LiveEventsFeed({
  events,
  isConnected,
  lastEventTime,
  onClear,
  onSimulate,
  className = "",
}: LiveEventsFeedProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());

  // Mark new events for animation
  useEffect(() => {
    if (events.length > 0) {
      const latestId = events[0].id;
      setNewEventIds(prev => new Set([...prev, latestId]));

      // Remove "new" status after animation
      const timeout = setTimeout(() => {
        setNewEventIds(prev => {
          const next = new Set(prev);
          next.delete(latestId);
          return next;
        });
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [events]);

  return (
    <div className={`rounded-xl border border-[rgba(0,240,255,0.1)] overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="relative">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-[#10b981]" : "bg-[#ef4444]"
              }`}
            />
            {isConnected && (
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-[#10b981] animate-ping opacity-75" />
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              Live Events
              {events.length > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)]">
                  {events.length}
                </span>
              )}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {isConnected ? "WebSocket connected to Solana" : "Connecting..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Demo button */}
          {onSimulate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSimulate();
              }}
              className="px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Demo
            </button>
          )}

          {/* Clear button */}
          {onClear && events.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Clear
            </button>
          )}

          {/* Expand/collapse */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-[var(--text-muted)] transition-transform duration-300 ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Events list */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          isExpanded ? "max-h-[400px]" : "max-h-0"
        }`}
      >
        <div className="p-2 space-y-1 max-h-[384px] overflow-y-auto custom-scrollbar">
          {events.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--bg-surface)] flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-[var(--text-muted)]"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Waiting for blockchain events...
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Events will appear when agents register or respond to challenges
              </p>
            </div>
          ) : (
            events.map((event) => (
              <EventItem
                key={event.id}
                event={event}
                isNew={newEventIds.has(event.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Status bar */}
      {isExpanded && lastEventTime && (
        <div className="px-4 py-2 bg-[var(--bg-surface)] border-t border-[rgba(0,240,255,0.05)] text-xs text-[var(--text-muted)]">
          Last event: {formatRelativeTime(lastEventTime)}
        </div>
      )}
    </div>
  );
}
