"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AgentData, getAgentPDA } from "@/lib/program";
import { ChallengeModal } from "./ChallengeModal";

interface AgentCardProps {
  agent: AgentData;
  rank?: number;
  onChallengeCreated?: () => void;
}

/**
 * Circular gauge component for reputation visualization
 */
function ReputationGauge({ value, size = 80 }: { value: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value, 100) / 100;
  const strokeDashoffset = circumference * (1 - progress);

  const getGaugeColor = () => {
    if (value >= 70) return { stroke: "#10b981", glow: "rgba(16, 185, 129, 0.5)" };
    if (value >= 50) return { stroke: "#f59e0b", glow: "rgba(245, 158, 11, 0.5)" };
    return { stroke: "#ef4444", glow: "rgba(239, 68, 68, 0.5)" };
  };

  const { stroke, glow } = getGaugeColor();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="gauge-arc"
          style={{
            filter: `drop-shadow(0 0 6px ${glow})`,
            transition: "stroke-dashoffset 1s ease-out",
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-lg font-bold"
          style={{ color: stroke }}
        >
          {value.toFixed(0)}
        </span>
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
          Score
        </span>
      </div>
    </div>
  );
}

export function AgentCard({ agent, rank, onChallengeCreated }: AgentCardProps) {
  const wallet = useWallet();
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const reputation = agent.reputationScore / 100;
  const isOwner = wallet.publicKey?.equals(agent.owner);
  const [agentPda] = getAgentPDA(agent.owner, agent.agentId);

  const totalChallenges = agent.challengesPassed + agent.challengesFailed;
  const passRate = totalChallenges > 0
    ? Math.round((agent.challengesPassed / totalChallenges) * 100)
    : 0;

  return (
    <>
      <div
        className="group relative bg-[var(--bg-elevated)] rounded-xl border border-[rgba(0,240,255,0.1)]
                   hover:border-[rgba(0,240,255,0.3)] transition-all duration-300 overflow-hidden card-lift glow-border"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Top gradient accent */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: rank && rank <= 3
              ? "linear-gradient(90deg, #00f0ff, #a855f7)"
              : "linear-gradient(90deg, rgba(0,240,255,0.3), rgba(168,85,247,0.3))"
          }}
        />

        {/* Rank badge */}
        {rank && (
          <div className="absolute top-4 left-4">
            <div
              className={`
                flex items-center justify-center w-10 h-10 rounded-lg font-bold text-lg
                ${rank === 1 ? "bg-gradient-to-br from-yellow-400 to-amber-600 text-black" : ""}
                ${rank === 2 ? "bg-gradient-to-br from-gray-300 to-gray-500 text-black" : ""}
                ${rank === 3 ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white" : ""}
                ${rank > 3 ? "bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[rgba(0,240,255,0.2)]" : ""}
              `}
            >
              #{rank}
            </div>
          </div>
        )}

        <div className="p-6 pt-5">
          {/* Header with gauge */}
          <div className="flex items-start justify-between mb-4">
            <div className={rank ? "ml-14" : ""}>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">
                  {agent.name}
                </h3>
                {agent.verified && (
                  <span className="badge-verified scanline-effect px-2 py-0.5 rounded text-xs font-medium">
                    Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--text-muted)] font-mono">
                ID: {agent.agentId.toString().padStart(4, "0")}
              </p>
            </div>
            <ReputationGauge value={reputation} />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="stat-card p-3 text-center">
              <div className="text-xl font-bold text-[#10b981]">
                {agent.challengesPassed}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                Passed
              </div>
            </div>
            <div className="stat-card p-3 text-center">
              <div className="text-xl font-bold text-[#ef4444]">
                {agent.challengesFailed}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                Failed
              </div>
            </div>
            <div className="stat-card p-3 text-center">
              <div className="text-xl font-bold text-[var(--accent-primary)]">
                {passRate}%
              </div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                Rate
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div className="mb-4">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Capabilities
            </p>
            <div className="flex flex-wrap gap-1.5">
              {agent.capabilities.split(",").map((cap, i) => (
                <span
                  key={cap}
                  className="px-2 py-1 rounded text-xs font-medium
                           bg-[rgba(168,85,247,0.15)] text-[#c084fc] border border-[rgba(168,85,247,0.3)]
                           hover:bg-[rgba(168,85,247,0.25)] transition-colors"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {cap.trim()}
                </span>
              ))}
            </div>
          </div>

          {/* Model hash */}
          <div className="bg-[var(--bg-surface)] rounded-lg p-3 mb-4 border border-[rgba(0,240,255,0.05)]">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Model Hash
            </p>
            <p className="text-xs font-mono text-[var(--text-secondary)] truncate">
              {agent.modelHash}
            </p>
          </div>

          {/* Owner */}
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-4">
            <span className="font-mono truncate max-w-[180px]">
              Owner: {agent.owner.toString().substring(0, 12)}...
            </span>
            {isOwner && (
              <span className="text-[var(--accent-primary)] font-medium">
                (You)
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {!isOwner && wallet.publicKey && (
              <button
                onClick={() => setShowChallengeModal(true)}
                className="flex-1 btn-primary py-2.5 rounded-lg text-sm font-semibold"
              >
                Challenge
              </button>
            )}
            <a
              href={`https://explorer.solana.com/address/${agentPda.toString()}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 btn-secondary py-2.5 rounded-lg text-sm text-center font-medium"
            >
              Explorer
            </a>
          </div>
        </div>

        {/* Hover glow effect */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            opacity: isHovered ? 0.1 : 0,
            background: "radial-gradient(circle at 50% 50%, var(--accent-primary), transparent 70%)",
          }}
        />
      </div>

      {/* Challenge Modal */}
      {showChallengeModal && (
        <ChallengeModal
          agent={agent}
          agentPda={agentPda}
          onClose={() => setShowChallengeModal(false)}
          onSuccess={() => {
            setShowChallengeModal(false);
            onChallengeCreated?.();
          }}
        />
      )}
    </>
  );
}
