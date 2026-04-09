# 🍄 Micopay Protocol

**x402 microservice infrastructure for AI agents on Stellar**

> Stellar Hacks: Agents — DoraHacks 2026

---

## What is Micopay?

Micopay Protocol is a network of x402 microservices on Stellar that any AI agent can **discover, pay per-request, and compose**. No API keys. No signup. Payment IS authentication.

The core primitive is an **atomic swap HTLC** (Soroban/Rust) coordinated by an AI agent: Claude understands intent and plans, a deterministic executor handles funds. The LLM never touches money.

### Tracks covered

| Track | What we built |
|-------|---------------|
| Paid agent services / APIs | Every endpoint is pay-per-request via x402 |
| Agent-to-agent payments | Swap coordinator agent pays for services |
| Rating, reputation, and trust | On-chain reputation (4 tiers, NFT soulbound) |
| Agent marketplaces / discovery | SKILL.md + `/api/v1/services` endpoint |
| DeFi integrations | Atomic swaps cross-chain via HTLCs |

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/ericmt-98/micopay-mvp
cd micopay-mvp
npm install

# 2. Set environment variables
cp .env.example .env
# Add ANTHROPIC_API_KEY at minimum

# 3. Start API
cd apps/api && npm run dev

# 4. Start dashboard
cd apps/web && npm run dev

# 5. Run the demo
bash scripts/demo.sh
```

---

## Services (x402)

| Service | Endpoint | Price |
|---------|----------|-------|
| Service Discovery | `GET /api/v1/services` | **free** |
| SKILL.md | `GET /skill.md` | **free** |
| Fund Stats | `GET /api/v1/fund/stats` | **free** |
| Swap Search | `GET /api/v1/swaps/search` | $0.001 |
| Reputation | `GET /api/v1/reputation/:address` | $0.0005 |
| Swap Plan (Claude) | `POST /api/v1/swaps/plan` | $0.01 |
| Swap Execute | `POST /api/v1/swaps/execute` | $0.05 |
| Swap Status | `GET /api/v1/swaps/:id/status` | $0.0001 |
| **Fund Micopay** | `POST /api/v1/fund` | **$0.10** |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  AI Agent / User                 │
└────────────────────────┬────────────────────────┘
                         │ natural language intent
                         ▼
┌─────────────────────────────────────────────────┐
│         Intent Parser (Claude API)               │
│  • Understands intent                            │
│  • Calls tools: search_swaps, get_reputation     │
│  • Produces SwapPlan JSON                        │
│  • NEVER touches funds                           │
└────────────────────────┬────────────────────────┘
                         │ SwapPlan
                         ▼
┌─────────────────────────────────────────────────┐
│         Swap Executor (TypeScript, no LLM)       │
│  • Follows plan exactly                          │
│  • Lock on chain A → monitor chain B             │
│  • Release (reveals secret) → counterparty claims│
│  • Refund on timeout                             │
└──────────┬──────────────────────┬───────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐  ┌──────────────────────────┐
│ AtomicSwapHTLC   │  │ AtomicSwapHTLC            │
│ (Soroban chain A)│  │ (chain B — or mock)       │
│                  │  │                           │
│ lock()           │  │ lock()                    │
│ release() ←secret│  │ release() ← secret public │
│ refund()         │  │ refund()                  │
└──────────────────┘  └──────────────────────────┘
```

### Key design principles

1. **Payment IS authentication** — x402 replaces API keys
2. **LLM plans, code executes** — Claude never touches funds
3. **Two contracts, one trait** — `HashedTimeLock` shared between `AtomicSwapHTLC` and `MicopayEscrow`
4. **Cross-chain without bridges** — atomicity from cryptography, not custodians
5. **The project funds itself** — Fund Micopay proves x402 works in 10 seconds

---

## Repository Structure

```
micopay-protocol/
├── contracts/
│   ├── htlc-core/          # HashedTimeLock trait (Rust)
│   ├── atomic-swap/        # Clean HTLC for cross-chain swaps
│   └── micopay-escrow/     # P2P escrow with disputes & reputation
├── packages/
│   ├── types/              # Shared TypeScript types
│   └── sdk/                # AtomicSwapClient + Stellar helpers
├── apps/
│   ├── api/                # Fastify API with x402 middleware
│   ├── agent/              # Claude intent parser + SwapExecutor
│   └── web/                # React dashboard
├── skill/
│   └── SKILL.md            # OpenClaw agent skill definition
└── scripts/
    ├── demo.sh             # Full demo flow
    └── deploy-contracts.sh # Deploy to testnet
```

---

## Contracts (Soroban/Rust)

9 unit tests, all passing:

```bash
cd contracts && cargo test
# atomic-swap: 4 tests ✓
# micopay-escrow: 5 tests ✓
```

The `HashedTimeLock` trait defines the shared interface. Both contracts implement `lock()`, `release()`, and `refund()`. The same TypeScript SDK client works with both.

---

## x402 Flow

```
Agent → GET /api/v1/swaps/search
      ← 402 { challenge: { amount_usdc: "0.001", pay_to: "G...", memo: "micopay:swap_search" } }

Agent builds Stellar USDC payment tx, signs it

Agent → GET /api/v1/swaps/search
        X-Payment: <signed_xdr>
      ← 200 { counterparties: [...] }
```

---

## Fund Micopay

The meta-demo: an agent funds the project using the same x402 infrastructure it's demonstrating.

```bash
curl -X POST https://api.micopay.xyz/api/v1/fund \
  -H "X-Payment: <signed_stellar_xdr>" \
  -d '{"message": "x402 works!"}'
```

Response includes `stellar_expert_url` for on-chain verification.

---

## Team

Built for **Stellar Hacks: Agents** (DoraHacks 2026) by Eric + Stichui.

Built with Claude Sonnet 4.6, Soroban, Stellar SDK, Fastify, React, Turborepo.
