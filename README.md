# Assisterr Agent Hackathon - Colosseum 2026

> **Agent Proof-of-Intelligence + SentinelAgent** - Trust Infrastructure for Solana AI Agents

[![Solana](https://img.shields.io/badge/Solana-Devnet-purple)](https://solana.com)
[![Hackathon](https://img.shields.io/badge/Colosseum-Agent%20Hackathon-blue)](https://colosseum.com/agent-hackathon)
[![Deadline](https://img.shields.io/badge/Deadline-Feb%2012%2C%202026-red)](https://colosseum.com/agent-hackathon)

## The Problem

- **50K+ ElizaOS agents** with NO identity verification
- **$31B agent transaction volume** on Solana with ZERO trust infrastructure
- **Moltbook breach** (1.5M agents exposed) proves security is critical
- **EU AI Act** (Aug 2026) requires audit trails - no one provides them

## Our Solution

### 1. Agent Proof-of-Intelligence (PoI)

On-chain verification that an agent is who it claims to be:

```
┌─────────────────────────────────────────────────────────┐
│                   Agent Identity NFT                    │
├─────────────────────────────────────────────────────────┤
│  Model: Llama-3.2-7B (verified hash)                    │
│  Capabilities: [trading, analysis, code-review]         │
│  Owner: 5xK...7Fj (Solana wallet)                       │
│  Reputation: ████████░░ 78/100                          │
│  Security Score: ████████████ 95/100                    │
│  Verified: ✓ Proof-of-Intelligence passed               │
└─────────────────────────────────────────────────────────┘
```

### 2. SentinelAgent - Self-Auditing Security

Real-time security monitoring for every agent interaction:

```
Agent A ──► SentinelAgent ──► Agent B
                │
                ▼
         Security Check:
         ✓ No prompt injection
         ✓ No malicious code
         ✓ Within authorized scope
         ✓ Audit trail logged
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Assisterr Trust Stack                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   Agent     │    │  Sentinel   │    │  Reputation │          │
│  │  Registry   │◄──►│   Agent     │◄──►│   Oracle    │          │
│  │  (NFT)      │    │  (Security) │    │  (On-chain) │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                           │                                      │
│                    ┌──────▼──────┐                               │
│                    │   Solana    │                               │
│                    │  Programs   │                               │
│                    │  (Anchor)   │                               │
│                    └─────────────┘                               │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Smart Contracts | Anchor (Rust) |
| Agent Identity | Metaplex Core NFTs |
| Security Scanning | Pydantic AI + Custom Rules |
| Frontend | Next.js + Solana Wallet Adapter |
| Backend | NestJS + FastAPI |

## Project Structure

```
assisterr-agent-hackathon/
├── programs/              # Anchor smart contracts
│   ├── agent-registry/    # Agent identity & registration
│   └── reputation/        # On-chain reputation system
├── agent/                 # SentinelAgent implementation
│   ├── scanner/          # Security scanning engine
│   └── poi/              # Proof-of-Intelligence verifier
├── app/                   # Frontend dashboard
├── api/                   # Backend services
└── docs/                  # Documentation
```

## Quick Start

```bash
# Prerequisites
solana --version  # 1.18+
anchor --version  # 0.30+
node --version    # 20+

# Setup
npm install
anchor build
anchor deploy --provider.cluster devnet

# Run agent
cd agent && python -m sentinel
```

## Hackathon Submission

- **Track**: Infrastructure
- **Prize Target**: $50K (1st) or $5K (Most Agentic)
- **Timeline**: Feb 2-12, 2026
- **Demo**: [Coming Soon]

## Team

- **Assisterr** - AI Agent Infrastructure for Solana
- [assisterr.ai](https://assisterr.ai)

## License

MIT

---

Built for [Colosseum Agent Hackathon 2026](https://colosseum.com/agent-hackathon)
