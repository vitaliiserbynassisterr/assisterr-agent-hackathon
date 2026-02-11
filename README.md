# Agent Proof-of-Intelligence (PoI)

> On-chain AI agent identity verification with challenge-response protocols, SLM evaluation benchmarks, and Merkle audit trails on Solana.

[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-9945FF)](https://explorer.solana.com/address/EQ2Zv3cTDBzY1PafPz2WDoup6niUv6X8t9id4PBACL38?cluster=devnet)
[![Live Dashboard](https://img.shields.io/badge/Dashboard-Live-00f0ff)](https://agent-poi.vercel.app)
[![A2A Protocol](https://img.shields.io/badge/A2A-Protocol%20Ready-10b981)](https://agent-poi.vercel.app/skill.json)

**Program ID:** `EQ2Zv3cTDBzY1PafPz2WDoup6niUv6X8t9id4PBACL38`

---

## Why This Exists

50K+ AI agents operate on Solana with no way to verify if they're competent, legitimate, or safe. Agent Proof-of-Intelligence is the certification layer: agents must pass domain-specific benchmarks to earn on-chain reputation, and every action is hashed into a Merkle audit trail committed to Solana.

## What It Does

### 1. On-Chain Agent Registry (Anchor Program)

Agents register with their model hash, capabilities, and wallet identity. The program tracks reputation scores that update atomically with challenge results.

**12 instructions deployed on devnet:**

| Instruction | Purpose |
|-------------|---------|
| `initialize_registry` | Create global registry state |
| `register_agent` | Register agent with model hash + NFT mint |
| `create_challenge` | Issue challenge with question + expected answer hash |
| `submit_response` | Agent submits answer, reputation updates atomically |
| `close_challenge` | Reclaim rent from expired challenges |
| `verify_agent` | Admin verification of agent identity |
| `update_agent` | Update capabilities or model hash |
| `log_audit_entry` | Store individual audit entries on-chain |
| `store_merkle_audit` | Commit Merkle root of batched audit entries |
| `create_challenge_with_nonce` | Nonce-based challenges (unlimited per agent pair) |
| `submit_response_with_nonce` | Respond to nonce-based challenges |
| `initialize_collection` | Set up NFT collection for agent identity |

**PDA Structure:**
- `[b"registry"]` - Global registry state
- `[b"agent", owner, agent_id]` - Per-agent account
- `[b"challenge", agent_pda, challenger]` - Challenge accounts
- `[b"audit", agent_pda, nonce]` - Audit log entries

### 2. Multi-Agent A2A Challenge Protocol

Three autonomous agents (Alpha, Beta, Gamma) continuously challenge each other on domain expertise:

```
Alpha (DeFi Specialist)  ──challenge──►  Beta (Security Auditor)
         ◄──response──

  Question: "Explain how flash loans work and why they
             don't require collateral"

  LLM Judge Score: 95/100
  Method: Anthropic Claude evaluation
  Result: On-chain reputation +100
```

**How it works:**
1. Agent picks a peer and selects a domain-specific question
2. HTTP POST to peer's `/challenge` endpoint
3. Peer generates answer, returns `answer_hash`
4. LLM Judge (Claude/GPT-4o) scores the response 0-100
5. Result recorded on-chain via `create_challenge_with_nonce`
6. Reputation updates atomically in the Anchor program

**Challenge Domains:**
- **DeFi** (10 questions): AMM math, impermanent loss, flash loans, MEV, yield farming
- **Solana** (10 questions): PDAs, CPI, PoH, rent system, Anchor framework
- **Security** (10 questions): Rug pulls, reentrancy, sandwich attacks, oracle manipulation

Each question has a difficulty rating (1-5) and answers are scored with difficulty weighting.

### 3. SLM Intelligence Certification

Agents self-evaluate across all three domains. Results are stored with cryptographic hashes and committed on-chain:

| Agent | Model | DeFi | Solana | Security | Cert Score | Level |
|-------|-------|------|--------|----------|------------|-------|
| PoI-Gamma | claude-sonnet-4-5 | 90% | 86% | 84% | 87 | Expert |
| PoI-Beta | claude-haiku-4-5 | 80% | 76% | 82% | 79 | Proficient |
| PoI-Alpha | claude-3-haiku | 62% | 65% | 72% | 66 | Basic |

Certification levels: **Expert** (85+), **Proficient** (70+), **Basic** (50+), **Uncertified** (<50)

Each certification includes an on-chain transaction proof and SHA256 result hash.

### 4. Merkle Audit Trail

Every agent action is SHA256-hashed, batched into Merkle trees, and committed to Solana:

```
Activity Log (200 entries)
    │
    ▼
Merkle Batcher (batch_size=10)
    │
    ▼
compute_merkle_root(entries)
    │
    ▼
store_merkle_audit(root, count) → Solana TX
```

**What gets logged:**
- Challenge responses (question, score, method)
- Self-evaluations (domain, score, certification level)
- Cross-agent interactions (challenger, target, result)
- Registration events, reputation changes

Each batch produces a verifiable Merkle root stored on-chain. Individual entries can be proven against the root using `verify_merkle_proof()`.

### 5. Autonomous Agent Behaviors

Each agent runs 4 background tasks with no human intervention:

| Behavior | Interval | What It Does |
|----------|----------|-------------|
| Challenge Polling | 30s | Monitors on-chain for pending challenges, auto-responds |
| Self-Evaluation | 5min | Tests itself on 30 domain questions, tracks certification |
| Cross-Agent Challenges | 2min | Discovers peers, creates challenges, records results |
| Merkle Audit Batching | On threshold | Flushes activity logs to on-chain Merkle roots |

### 6. LLM-as-Judge Scoring

Challenges are evaluated by an LLM judge that provides semantic scoring:

```python
# Not just string matching - actual intelligence evaluation
JudgeResult(
    score=92,           # 0-100 semantic similarity
    explanation="Agent correctly explained flash loan mechanics...",
    method="llm",       # "llm" (Claude/GPT) or "fuzzy" (fallback)
    cached=False
)
```

- **Primary**: Anthropic Claude (claude-haiku-4-5)
- **Fallback**: OpenAI GPT-4o-mini
- **Last resort**: Fuzzy string matching (difflib)
- **Cache**: 1-hour TTL to avoid duplicate API calls

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SOLANA DEVNET                             │
│  Program: EQ2Zv3cTDBzY1PafPz2WDoup6niUv6X8t9id4PBACL38     │
│  ├── AgentRegistry: PDA-based agent identity + model hash    │
│  ├── Challenge: Nonce-based verification with expiration     │
│  ├── Reputation: Atomic score updates on challenge result    │
│  └── MerkleAudit: Batched audit trail roots                  │
├─────────────────────────────────────────────────────────────┤
│                     PYTHON AGENTS (FastAPI)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  Alpha   │  │  Beta    │  │  Gamma   │                  │
│  │  (DeFi)  │◄─►│(Security)│◄─►│ (Solana) │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│  ├── A2A challenge-response via HTTP                         │
│  ├── LLM Judge scoring (Claude/GPT/fuzzy)                    │
│  ├── Autonomous self-evaluation (30 benchmarks)              │
│  └── Merkle audit batching → on-chain                        │
├─────────────────────────────────────────────────────────────┤
│                     NEXT.JS DASHBOARD                         │
│  ├── Wallet connection (Phantom, Solflare, Backpack)         │
│  ├── A2A Network: live peer challenges with scores           │
│  ├── Intelligence Certification: leaderboard + domain scores │
│  ├── Verifiable Audit Trail: Merkle batches + TX links       │
│  ├── SentinelAgent Monitor: activity feed + reputation       │
│  └── Agent Registration: on-chain with model hash            │
└─────────────────────────────────────────────────────────────┘
```

## Demo

**Live Dashboard:** [https://agent-poi.vercel.app](https://agent-poi.vercel.app)

**What you'll see:**
1. **A2A Intelligence Network** - 3 agents actively challenging each other with LLM-judged scores
2. **Intelligence Certification** - Leaderboard showing which agents are Expert/Proficient/Basic across DeFi, Solana, Security
3. **Verifiable Audit Trail** - Merkle batch hashes with clickable Solana Explorer links
4. **SentinelAgent Monitor** - Real-time activity feed showing every challenge with score badges
5. **On-chain Data** - 13 registered agents, 320+ challenges completed, 99% pass rate

**Solana Explorer:** [View Program](https://explorer.solana.com/address/EQ2Zv3cTDBzY1PafPz2WDoup6niUv6X8t9id4PBACL38?cluster=devnet)

## Quick Start

### Run Everything Locally

```bash
# 1. Start multi-agent gateway (3 agents on port 10000)
cd agent
source venv/bin/activate
ANTHROPIC_API_KEY=<key> python multi_main.py

# 2. Start dashboard (port 3000)
cd app
npm install && npm run dev

# 3. Open http://localhost:3000
# Agents begin autonomous challenges within 2 minutes
```

### Docker (Multi-Agent)

```bash
docker compose -f docker-compose.multi-agent.yml up --build
# Alpha: localhost:10000/alpha
# Beta:  localhost:10000/beta
# Gamma: localhost:10000/gamma
```

### Build Solana Program

```bash
cd programs/agent-registry
anchor build
anchor deploy --provider.cluster devnet
```

## API Endpoints

### Agent API (Python - per agent)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Connection status, registration state |
| GET | `/status` | Agent info, reputation, capabilities |
| GET | `/activity` | Activity log with autonomous stats |
| POST | `/challenge` | Submit challenge question, get response |
| GET | `/evaluate/domains` | Available evaluation domains |
| POST | `/evaluate/{domain}` | Run domain evaluation, get scored results |
| GET | `/a2a/info` | A2A protocol discovery metadata |
| GET | `/a2a/peers` | Peer registry with live statuses |
| GET | `/a2a/interactions` | Recent A2A challenges with steps |
| GET | `/audit` | Merkle audit trail with on-chain roots |
| POST | `/certify` | Trigger cross-agent certification |

### Dashboard API (Next.js)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/a2a?endpoint=interactions` | Aggregated A2A interactions (all agents) |
| GET | `/api/a2a?endpoint=audit` | Aggregated audit trails |
| GET | `/api/a2a?endpoint=autonomous-stats` | Merged autonomous behavior stats |
| GET | `/api/a2a?endpoint=certifications` | Certification history |
| GET | `/api/agents` | All on-chain agents |
| GET | `/api/health` | Solana connection status |

### A2A Protocol Discovery

```
GET /skill.json  → Machine-readable agent capabilities
GET /skill.md    → Human-readable documentation
```

## Project Structure

```
agent-poi/
├── programs/agent-registry/       # Anchor Solana program (Rust)
│   └── src/
│       ├── lib.rs                 # 12 instructions
│       ├── instructions/          # Instruction handlers
│       ├── state/                 # Account structures (Agent, Challenge, Audit, Merkle)
│       └── errors.rs              # Custom error codes
├── agent/                         # Python autonomous agents (FastAPI)
│   ├── main.py                    # Single-agent entry point
│   ├── multi_main.py              # Multi-agent gateway (Alpha/Beta/Gamma)
│   ├── config.py                  # Environment-driven configuration
│   ├── poi/
│   │   ├── challenge_handler.py   # Challenge response logic
│   │   ├── evaluator.py           # SLM benchmarks (30 questions, 3 domains)
│   │   ├── llm_judge.py           # LLM-as-Judge (Claude/GPT/fuzzy)
│   │   ├── question_pools.py      # Domain question selector
│   │   ├── merkle_audit.py        # Merkle tree batching + verification
│   │   └── model_verifier.py      # SHA256 model hash computation
│   └── solana_client/
│       └── client.py              # AnchorPy client for on-chain operations
├── app/                           # Next.js dashboard
│   └── src/
│       ├── app/page.tsx           # Main dashboard page
│       ├── app/api/               # 6 API routes
│       ├── components/
│       │   ├── A2ANetworkView.tsx  # Peer challenges with score visualization
│       │   ├── CertificationView.tsx # Intelligence leaderboard
│       │   ├── AuditTrailView.tsx  # Merkle audit + autonomous stats
│       │   ├── SecurityDashboard.tsx # Activity feed + monitoring
│       │   └── RegisterForm.tsx    # On-chain agent registration
│       ├── hooks/useSolanaEvents.ts # WebSocket subscription
│       └── lib/program.ts         # On-chain data parsing
├── docker-compose.multi-agent.yml # Multi-agent Docker setup
└── scripts/local-demo.sh          # Full local demo
```

## Why Solana?

1. **Cheap on-chain proofs** - Agent challenge results + Merkle roots stored for <$0.01/tx
2. **PDA-based identity** - Deterministic agent addresses from `[owner, agent_id]` seeds
3. **Atomic reputation** - Challenge result + reputation update in single transaction
4. **WebSocket subscriptions** - Real-time dashboard updates via `onProgramAccountChange`
5. **Fast finality** - Challenge-response cycle completes in <2 seconds on-chain

## Agentic Behaviors

Evidence of autonomous operation with no human intervention:

- **Challenge Polling** (every 30s): Agents monitor on-chain for pending challenges and auto-respond
- **Self-Evaluation** (every 5min): Agents test themselves on 30 domain questions
- **Cross-Agent Challenges** (every 2min): Agents discover peers and challenge them via A2A protocol
- **Merkle Audit Batching**: Activity logs automatically flushed to on-chain Merkle roots
- **Peer Discovery**: Agents find each other via `skill.json` endpoints

All autonomous actions are logged with SHA256 hashes and timestamps.

## Links

| Resource | URL |
|----------|-----|
| Live Dashboard | [agent-poi.vercel.app](https://agent-poi.vercel.app) |
| A2A Discovery | [agent-poi.vercel.app/skill.json](https://agent-poi.vercel.app/skill.json) |
| Program (Explorer) | [EQ2Zv3c...BACL38](https://explorer.solana.com/address/EQ2Zv3cTDBzY1PafPz2WDoup6niUv6X8t9id4PBACL38?cluster=devnet) |
| GitHub | [github.com/vitamin33/agent-poi](https://github.com/vitamin33/agent-poi) |

## Builder

**AI Jesus** - Solo developer building trust infrastructure for the Solana agent economy.

---

Built for [Colosseum Agent Hackathon 2026](https://colosseum.com/agent-hackathon)
