"use client";

import { useEffect, useState, useCallback } from "react";

interface DefiCapability {
  agent?: string;
  initialized?: boolean;
  agentipy_available?: boolean;
  tools?: Record<string, boolean>;
  stats?: {
    total_operations: number;
    successful: number;
    failed: number;
    avg_latency_ms: number;
  };
}

interface AggregatedDefi {
  agents: DefiCapability[];
  total_agents_with_defi: number;
  total_operations: number;
  powered_by: string;
}

/**
 * DeFi Intelligence View - Shows live DeFi capabilities powered by AgentiPy
 */
export function DeFiIntelligenceView() {
  const [defiData, setDefiData] = useState<AggregatedDefi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDefi = useCallback(async () => {
    try {
      const res = await fetch("/api/a2a?endpoint=defi-capabilities");
      if (res.ok) {
        const data = await res.json();
        setDefiData(data);
        setError(null);
      } else {
        setError(`API returned ${res.status}`);
      }
    } catch {
      setError("Agent API unreachable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDefi();
    const interval = setInterval(fetchDefi, 30000);
    return () => clearInterval(interval);
  }, [fetchDefi]);

  if (loading) {
    return (
      <div className="p-6 rounded-xl bg-[var(--bg-elevated)] border border-[rgba(0,240,255,0.1)] animate-pulse">
        <div className="h-6 w-48 bg-[var(--bg-surface)] rounded mb-4" />
        <div className="h-20 bg-[var(--bg-surface)] rounded" />
      </div>
    );
  }

  if (error || !defiData) {
    return null; // Silently hide if DeFi not available
  }

  const toolNames: Record<string, string> = {
    balance: "SOL Balance",
    tps: "Network TPS",
    coingecko: "CoinGecko",
    rugcheck: "RugCheck",
    trade: "Jupiter DEX",
    price: "Price Feeds",
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.3"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Live DeFi Intelligence
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Powered by AgentiPy - 41 Solana protocols, 218+ actions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${defiData.total_agents_with_defi > 0 ? "bg-[#10b981] status-live" : "bg-[var(--text-muted)]"}`} />
          <span className="text-sm text-[var(--text-secondary)]">
            {defiData.total_agents_with_defi}/{defiData.agents.length} agents active
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="rounded-xl bg-[var(--bg-elevated)] border border-[rgba(0,240,255,0.1)] overflow-hidden">
        {/* Summary bar */}
        <div className="p-4 border-b border-[rgba(0,240,255,0.05)] bg-gradient-to-r from-[rgba(245,158,11,0.05)] to-[rgba(239,68,68,0.05)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Agents w/ DeFi</div>
              <div className="text-lg font-bold text-[#f59e0b]">{defiData.total_agents_with_defi}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">DeFi Operations</div>
              <div className="text-lg font-bold text-[var(--text-primary)]">{defiData.total_operations}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Protocols</div>
              <div className="text-lg font-bold text-[var(--accent-primary)]">41</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Actions</div>
              <div className="text-lg font-bold text-[#a855f7]">218+</div>
            </div>
          </div>
        </div>

        {/* Per-agent DeFi capabilities */}
        <div className="divide-y divide-[rgba(0,240,255,0.05)]">
          {defiData.agents.map((agent, idx) => (
            <div key={idx} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${agent.initialized ? "bg-[#10b981]" : "bg-[#ef4444]"}`} />
                  <span className="font-medium text-[var(--text-primary)]">{agent.agent || `Agent ${idx + 1}`}</span>
                </div>
                {agent.stats && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {agent.stats.total_operations} ops | {agent.stats.avg_latency_ms}ms avg
                  </span>
                )}
              </div>

              {/* Tool badges */}
              {agent.tools && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(agent.tools).map(([tool, available]) => (
                    <span
                      key={tool}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        available
                          ? "bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[#10b981]"
                          : "bg-[rgba(107,114,128,0.1)] border border-[rgba(107,114,128,0.2)] text-[var(--text-muted)]"
                      }`}
                    >
                      {toolNames[tool] || tool}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Integration info */}
        <div className="p-4 bg-[var(--bg-surface)] border-t border-[rgba(0,240,255,0.05)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Integration: AgentiPy SolanaAgentKit + Proof-of-Intelligence Protocol</span>
            <a
              href="https://docs.agentipy.fun/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-primary)] hover:underline"
            >
              AgentiPy Docs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
