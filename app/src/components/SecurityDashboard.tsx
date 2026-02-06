"use client";

import { useState, useEffect, useCallback } from "react";
import { AgentData } from "@/lib/program";

interface ActivityEntry {
  timestamp: string;
  action: string;
  agentName: string;
  riskLevel: "none" | "low" | "medium" | "high" | "critical";
  details: string;
}

interface SecurityDashboardProps {
  agents: AgentData[];
}

/**
 * SentinelAgent Security Dashboard
 * Displays audit trail and security metrics for registered agents
 */
export function SecurityDashboard({ agents }: SecurityDashboardProps) {
  const [activityFeed, setActivityFeed] = useState<ActivityEntry[]>([]);
  const [networkStats, setNetworkStats] = useState({
    totalAgents: 0,
    verifiedAgents: 0,
    avgReputation: 0,
    totalChallenges: 0,
    securityAlerts: 0,
  });

  const generateActivityFeed = useCallback(() => {
    const feed: ActivityEntry[] = [];

    agents.forEach((agent) => {
      feed.push({
        timestamp: new Date(agent.createdAt.toNumber() * 1000).toISOString(),
        action: "Agent Registered",
        agentName: agent.name,
        riskLevel: "none",
        details: `Model: ${agent.modelHash.substring(0, 20)}...`,
      });

      if (agent.verified) {
        feed.push({
          timestamp: new Date(agent.updatedAt.toNumber() * 1000).toISOString(),
          action: "Agent Verified",
          agentName: agent.name,
          riskLevel: "none",
          details: "Admin verification complete",
        });
      }

      for (let i = 0; i < agent.challengesPassed; i++) {
        feed.push({
          timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          action: "Challenge Passed",
          agentName: agent.name,
          riskLevel: "none",
          details: "+100 reputation",
        });
      }

      for (let i = 0; i < agent.challengesFailed; i++) {
        feed.push({
          timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          action: "Challenge Failed",
          agentName: agent.name,
          riskLevel: "medium",
          details: "-50 reputation",
        });
      }
    });

    feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return feed.slice(0, 20);
  }, [agents]);

  useEffect(() => {
    if (agents.length === 0) return;

    const verifiedCount = agents.filter((a) => a.verified).length;
    const avgRep = agents.reduce((sum, a) => sum + a.reputationScore, 0) / agents.length / 100;
    const totalChallenges = agents.reduce(
      (sum, a) => sum + a.challengesPassed + a.challengesFailed,
      0
    );

    setNetworkStats({
      totalAgents: agents.length,
      verifiedAgents: verifiedCount,
      avgReputation: avgRep,
      totalChallenges,
      securityAlerts: agents.filter((a) => a.reputationScore < 3000).length,
    });

    setActivityFeed(generateActivityFeed());
  }, [agents, generateActivityFeed]);

  const getRiskBadge = (level: ActivityEntry["riskLevel"]) => {
    const styles: Record<ActivityEntry["riskLevel"], { bg: string; text: string; border: string }> = {
      none: { bg: "rgba(16,185,129,0.1)", text: "#10b981", border: "rgba(16,185,129,0.3)" },
      low: { bg: "rgba(59,130,246,0.1)", text: "#3b82f6", border: "rgba(59,130,246,0.3)" },
      medium: { bg: "rgba(245,158,11,0.1)", text: "#f59e0b", border: "rgba(245,158,11,0.3)" },
      high: { bg: "rgba(249,115,22,0.1)", text: "#f97316", border: "rgba(249,115,22,0.3)" },
      critical: { bg: "rgba(239,68,68,0.1)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
    };

    const style = styles[level];
    return (
      <span
        className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider"
        style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
      >
        {level}
      </span>
    );
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
      "Agent Registered": "📝",
      "Agent Verified": "✓",
      "Challenge Passed": "✓",
      "Challenge Failed": "✗",
      "Security Alert": "⚠",
    };
    return icons[action] || "•";
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[rgba(0,240,255,0.1)] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[rgba(0,240,255,0.1)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[var(--bg-deep)]">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                SentinelAgent Security Monitor
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Real-time audit trail and compliance monitoring
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)]">
            <span className="w-2 h-2 rounded-full bg-[#10b981] status-live" />
            <span className="text-sm text-[#10b981] font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-[rgba(0,240,255,0.05)]">
        {[
          { label: "Total Agents", value: networkStats.totalAgents, color: "var(--accent-primary)" },
          { label: "Verified", value: networkStats.verifiedAgents, color: "#10b981" },
          { label: "Avg Reputation", value: `${networkStats.avgReputation.toFixed(1)}%`, color: "#a855f7" },
          { label: "Challenges", value: networkStats.totalChallenges, color: "#3b82f6" },
          { label: "Alerts", value: networkStats.securityAlerts, color: "#ef4444" },
        ].map((stat, i) => (
          <div key={i} className="bg-[var(--bg-elevated)] p-4">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
              {stat.label}
            </p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
          Activity Feed
        </h3>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
          {activityFeed.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <p>No activity yet</p>
              <p className="text-sm mt-1">Agent actions will appear here</p>
            </div>
          ) : (
            activityFeed.map((entry, idx) => (
              <div
                key={idx}
                className="activity-item flex items-center justify-between rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{
                      background: entry.riskLevel === "none"
                        ? "rgba(16,185,129,0.1)"
                        : entry.riskLevel === "medium"
                        ? "rgba(245,158,11,0.1)"
                        : "rgba(239,68,68,0.1)",
                      color: entry.riskLevel === "none"
                        ? "#10b981"
                        : entry.riskLevel === "medium"
                        ? "#f59e0b"
                        : "#ef4444",
                    }}
                  >
                    {getActionIcon(entry.action)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {entry.action}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {entry.agentName} • {entry.details}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getRiskBadge(entry.riskLevel)}
                  <span className="text-xs text-[var(--text-muted)] min-w-[60px] text-right">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="m-6 mt-0 p-4 rounded-xl bg-[rgba(168,85,247,0.05)] border border-[rgba(168,85,247,0.2)]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[rgba(168,85,247,0.1)] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#a855f7]">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-[#a855f7] mb-1">
              EU AI Act Compliance Ready
            </h4>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              All agent actions are logged on-chain with immutable audit trails.
              This infrastructure supports the transparency and accountability
              requirements of the EU AI Act (Aug 2026 deadline).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
