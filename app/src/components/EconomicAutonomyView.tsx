"use client";

import { useEffect, useState, useCallback } from "react";

interface EconomicTransaction {
  timestamp: string;
  direction: "sent" | "received";
  lamports: number;
  sol: number;
  reason: string;
  counterparty?: string;
  tx?: string;
}

interface AgentEconomics {
  agent_name: string;
  description: string;
  summary: {
    total_transactions: number;
    total_sol_sent: number;
    total_sol_received: number;
    net_sol: number;
    sent_count: number;
    received_count: number;
  };
  fee_structure: {
    challenge_fee: string;
    quality_reward_threshold: string;
    quality_reward: string;
  };
  recent_transactions: EconomicTransaction[];
}

interface AggregatedEconomics {
  agents: AgentEconomics[];
  network_totals: {
    total_transactions: number;
    total_sol_flow: number;
    net_sol: number;
  };
}

const AGENT_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  "PoI-Alpha": { text: "#a855f7", bg: "rgba(168,85,247,0.1)", border: "rgba(168,85,247,0.3)" },
  "PoI-Beta": { text: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
  "PoI-Gamma": { text: "#00f0ff", bg: "rgba(0,240,255,0.1)", border: "rgba(0,240,255,0.3)" },
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleDateString();
}

function explorerTxUrl(tx: string): string {
  return `https://explorer.solana.com/tx/${tx}?cluster=devnet`;
}

export function EconomicAutonomyView() {
  const [data, setData] = useState<AggregatedEconomics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/a2a?endpoint=economics");
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6 rounded-xl bg-[var(--bg-elevated)] border border-[rgba(0,240,255,0.1)] animate-pulse">
        <div className="h-6 w-56 bg-[var(--bg-surface)] rounded mb-4" />
        <div className="h-32 bg-[var(--bg-surface)] rounded" />
      </div>
    );
  }

  if (!data || data.agents.length === 0) return null;

  // Combine all transactions from all agents
  const allTransactions = data.agents
    .flatMap((a) =>
      a.recent_transactions.map((t) => ({ ...t, agent: a.agent_name }))
    )
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 30);

  const totalTxs = data.agents.reduce(
    (s, a) => s + a.summary.total_transactions,
    0
  );
  const totalSolFlow = data.agents.reduce(
    (s, a) => s + a.summary.total_sol_sent,
    0
  );

  return (
    <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[rgba(0,240,255,0.08)] overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-5 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f59e0b]/20 to-[#10b981]/20 flex items-center justify-center border border-[rgba(245,158,11,0.2)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[#f59e0b]">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6v12M15 9.5c0-1.38-1.34-2.5-3-2.5s-3 1.12-3 2.5 1.34 2.5 3 2.5 3 1.12 3 2.5-1.34 2.5-3 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Agent Economic Autonomy
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Autonomous SOL micropayments between agents for challenge services
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {totalTxs > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.2)]">
              <span className="text-xs text-[#f59e0b] font-medium">
                {totalTxs} txs
              </span>
            </div>
          )}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-[var(--text-muted)] transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Body */}
      <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? "max-h-[3000px]" : "max-h-0"}`}>
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-5 pb-4">
          {[
            { label: "Total Transactions", value: totalTxs, color: "#f59e0b" },
            { label: "SOL Transferred", value: `${totalSolFlow.toFixed(4)}`, color: "var(--accent-primary)" },
            { label: "Active Agents", value: data.agents.filter(a => a.summary.total_transactions > 0).length, color: "#10b981" },
            { label: "Fee per Challenge", value: "0.001 SOL", color: "#a855f7" },
          ].map((stat, i) => (
            <div key={i} className="px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[rgba(0,240,255,0.04)]">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Per-agent economic breakdown */}
        <div className="px-5 pb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Agent Balances
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.agents.map((agent, idx) => {
              const colors = AGENT_COLORS[agent.agent_name] || { text: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)" };
              const netPositive = agent.summary.net_sol >= 0;
              return (
                <div key={idx} className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[rgba(0,240,255,0.05)]">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                    >
                      {agent.agent_name.replace("PoI-", "").charAt(0)}
                    </span>
                    <span className="font-medium text-sm text-[var(--text-primary)]">
                      {agent.agent_name}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[9px] text-[var(--text-muted)] uppercase">Sent</p>
                      <p className="text-xs font-bold text-[#ef4444]">
                        {agent.summary.total_sol_sent.toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[var(--text-muted)] uppercase">Received</p>
                      <p className="text-xs font-bold text-[#10b981]">
                        {agent.summary.total_sol_received.toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-[var(--text-muted)] uppercase">Net</p>
                      <p className={`text-xs font-bold ${netPositive ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                        {netPositive ? "+" : ""}{agent.summary.net_sol.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction feed */}
        <div className="px-5 pb-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            Recent Transactions
            {allTransactions.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-[var(--bg-surface)] text-[var(--text-muted)] font-normal">
                {allTransactions.length}
              </span>
            )}
          </h3>

          <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {allTransactions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-[var(--text-muted)]">
                  Waiting for economic transactions...
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Agents pay 0.001 SOL per challenge, earn 0.0005 SOL for quality answers
                </p>
              </div>
            ) : (
              allTransactions.map((tx, idx) => {
                const isSent = tx.direction === "sent";
                const agentColor = AGENT_COLORS[tx.agent]?.text || "#94a3b8";
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-surface)]/50 transition-colors"
                  >
                    {/* Direction icon */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isSent ? "bg-[rgba(239,68,68,0.1)]" : "bg-[rgba(16,185,129,0.1)]"
                    }`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        className={isSent ? "text-[#ef4444] rotate-45" : "text-[#10b981] -rotate-45"}>
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>

                    {/* Agent */}
                    <span className="text-xs font-semibold flex-shrink-0 w-16" style={{ color: agentColor }}>
                      {tx.agent.replace("PoI-", "")}
                    </span>

                    {/* Reason */}
                    <span className="flex-1 text-xs text-[var(--text-secondary)] truncate min-w-0">
                      {tx.reason}
                      {tx.counterparty && <span className="text-[var(--text-muted)]"> ({tx.counterparty})</span>}
                    </span>

                    {/* Amount */}
                    <span className={`text-xs font-bold flex-shrink-0 ${isSent ? "text-[#ef4444]" : "text-[#10b981]"}`}>
                      {isSent ? "-" : "+"}{tx.sol.toFixed(4)} SOL
                    </span>

                    {/* TX link */}
                    {tx.tx && (
                      <a
                        href={explorerTxUrl(tx.tx)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent-primary)] hover:underline flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                        </svg>
                      </a>
                    )}

                    {/* Time */}
                    <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0 w-12 text-right">
                      {formatRelativeTime(tx.timestamp)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Fee structure info */}
        <div className="mx-5 mb-5 p-3.5 rounded-xl bg-[rgba(245,158,11,0.02)] border border-[rgba(245,158,11,0.08)]">
          <div className="flex items-start gap-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[var(--text-muted)] flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              <strong className="text-[var(--text-secondary)]">Economic Protocol:</strong>{" "}
              Challenger pays 0.001 SOL to the target before issuing a challenge. If the target scores &ge; 70%,
              they earn a 0.0005 SOL quality reward back. All payments are autonomous devnet SOL transfers
              with on-chain signatures.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
