"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair } from "@solana/web3.js";
import { getRegistryPDA, getAgentPDA, isAnchorWallet, isValidModelHash, fetchRegistryState, buildRegisterAgentInstruction, sendAndConfirmTransaction } from "@/lib/program";

interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    modelHash: "sha256:",
    capabilities: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAnchorWallet(wallet)) {
      setError("Please connect a wallet that supports transaction signing");
      return;
    }

    if (!isValidModelHash(formData.modelHash)) {
      setError("Invalid model hash format. Must be sha256: followed by 64 hex characters");
      return;
    }

    if (formData.name.trim().length < 3) {
      setError("Agent name must be at least 3 characters");
      return;
    }

    if (formData.capabilities.trim().length < 3) {
      setError("Please specify at least one capability");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const [registryPda] = getRegistryPDA();
      const registry = await fetchRegistryState(connection);
      if (!registry) {
        setError("Registry not initialized. Please contact the admin.");
        setLoading(false);
        return;
      }
      const agentId = registry.totalAgents;
      const [agentPda] = getAgentPDA(wallet.publicKey, agentId);
      const mockNft = Keypair.generate();

      const instruction = buildRegisterAgentInstruction(
        wallet.publicKey,
        registryPda,
        agentPda,
        mockNft.publicKey,
        formData.name.trim(),
        formData.modelHash,
        formData.capabilities.trim()
      );

      const tx = await sendAndConfirmTransaction(connection, wallet, instruction);

      setSuccess(`Agent registered! TX: ${tx.substring(0, 16)}...`);
      setFormData({ name: "", modelHash: "sha256:", capabilities: "" });
      onSuccess?.();
    } catch (err: unknown) {
      console.error("Registration error:", err);
      const message = err instanceof Error ? err.message : "Failed to register agent";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Agent Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="input-neural w-full rounded-lg px-4 py-3 text-[var(--text-primary)]"
          placeholder="My AI Agent"
          required
          maxLength={64}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Model Hash (SHA256)
        </label>
        <input
          type="text"
          value={formData.modelHash}
          onChange={(e) =>
            setFormData({ ...formData, modelHash: e.target.value })
          }
          className="input-neural w-full rounded-lg px-4 py-3 font-mono text-sm text-[var(--text-primary)]"
          placeholder="sha256:abc123def456..."
          required
          minLength={71}
          maxLength={71}
          pattern="^sha256:[a-fA-F0-9]{64}$"
        />
        <p className="text-xs text-[var(--text-muted)] mt-2">
          SHA256 hash of your model file (sha256: + 64 hex chars)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Capabilities
        </label>
        <input
          type="text"
          value={formData.capabilities}
          onChange={(e) =>
            setFormData({ ...formData, capabilities: e.target.value })
          }
          className="input-neural w-full rounded-lg px-4 py-3 text-[var(--text-primary)]"
          placeholder="analysis, coding, trading"
          required
          maxLength={256}
        />
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Comma-separated list of capabilities
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#ef4444] flex-shrink-0">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-sm text-[#ef4444]">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#10b981] flex-shrink-0">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-sm text-[#10b981]">{success}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !wallet.publicKey}
        className="w-full btn-primary py-4 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Registering...
          </span>
        ) : (
          "Register Agent"
        )}
      </button>
    </form>
  );
}
