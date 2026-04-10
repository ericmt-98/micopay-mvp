import type { FastifyInstance } from "fastify";
import {
  Keypair,
  Asset,
  TransactionBuilder,
  Operation,
  Networks,
  Horizon,
  Memo,
  BASE_FEE,
} from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const USDC = new Asset("USDC", USDC_ISSUER);
const EXPLORER = "https://stellar.expert/explorer/testnet/tx";

function getPlatformAddress(): string {
  const secret = process.env.PLATFORM_SECRET_KEY;
  if (secret) {
    try { return Keypair.fromSecret(secret).publicKey(); } catch {}
  }
  return "GDKKW2WSMQWZ63PIZBKDDBAAOBG5FP3TUHRYQ4U5RBKTFNESL5K5BJJK";
}

export async function demoRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/demo/run
   *
   * Runs the full Micopay demo with REAL on-chain Stellar transactions.
   * The demo agent signs and submits one USDC payment per service call:
   *
   *   Step 1 — swap_search   $0.001 USDC  → real tx on testnet
   *   Step 2 — swap_plan     $0.010 USDC  → real tx on testnet (Claude Haiku)
   *   Step 3 — fund_micopay  $0.100 USDC  → real tx on testnet
   *
   * Returns 3 tx hashes verifiable on stellar.expert.
   * Total cost per run: $0.111 USDC from the demo agent wallet.
   */
  fastify.post("/api/v1/demo/run", async (_request, reply) => {
    const secret = process.env.DEMO_AGENT_SECRET_KEY;
    if (!secret) {
      return reply.status(503).send({ error: "Demo agent not configured. Run scripts/setup-demo-agent.mjs first." });
    }

    const agentKP       = Keypair.fromSecret(secret);
    const agentAddress  = agentKP.publicKey();
    const platformAddr  = getPlatformAddress();
    const horizon       = new Horizon.Server(HORIZON_URL);
    const port          = process.env.PORT ?? "3000";
    const baseUrl       = `http://localhost:${port}`;

    // Load account once — then increment sequence locally to build all 3 txs
    // without waiting for on-chain confirmation between them.
    const account = await horizon.loadAccount(agentAddress);

    function buildPaymentTx(amount: string, memo: string) {
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(Operation.payment({
          destination: platformAddr,
          asset: USDC,
          amount,
        }))
        .addMemo(Memo.text(memo))
        .setTimeout(180)
        .build();
      tx.sign(agentKP);
      account.incrementSequenceNumber(); // keep local sequence in sync
      return tx;
    }

    // Build all 3 txs with sequential sequence numbers
    const tx1 = buildPaymentTx("0.0010000", "micopay:swap_search");
    const tx2 = buildPaymentTx("0.0100000", "micopay:swap_plan");
    const tx3 = buildPaymentTx("0.1000000", "micopay:fund_demo");

    const steps = [];

    try {
      // ── Step 1: swap_search ──────────────────────────────────────────
      const r1 = await horizon.submitTransaction(tx1);
      const xdr1 = tx1.toXDR();

      const searchRes = await fetch(
        `${baseUrl}/api/v1/swaps/search?sell_asset=USDC&buy_asset=XLM&amount=50`,
        { headers: { "x-payment": xdr1 } }
      );
      const searchData = await searchRes.json();

      steps.push({
        name:               "swap_search",
        description:        "Find swap counterparties",
        price_usdc:         "0.001",
        tx_hash:            r1.hash,
        stellar_expert_url: `${EXPLORER}/${r1.hash}`,
        result:             searchData,
      });

      // ── Step 2: swap_plan (Claude Haiku) ────────────────────────────
      const r2 = await horizon.submitTransaction(tx2);
      const xdr2 = tx2.toXDR();

      const planRes = await fetch(`${baseUrl}/api/v1/swaps/plan`, {
        method:  "POST",
        headers: { "x-payment": xdr2, "Content-Type": "application/json" },
        body:    JSON.stringify({
          intent:       "swap 50 USDC for XLM, best rate",
          user_address: agentAddress,
        }),
      });
      const planData = await planRes.json();

      steps.push({
        name:               "swap_plan",
        description:        "AI swap planning — Claude Haiku",
        price_usdc:         "0.01",
        tx_hash:            r2.hash,
        stellar_expert_url: `${EXPLORER}/${r2.hash}`,
        result:             planData,
      });

      // ── Step 3: fund_micopay ─────────────────────────────────────────
      const r3 = await horizon.submitTransaction(tx3);

      steps.push({
        name:               "fund_micopay",
        description:        "Fund the Micopay project",
        price_usdc:         "0.10",
        tx_hash:            r3.hash,
        stellar_expert_url: `${EXPLORER}/${r3.hash}`,
        result:             { message: "x402 works — real on-chain payment by demo agent" },
      });

      return reply.send({
        agent_address:    agentAddress,
        platform_address: platformAddr,
        total_paid_usdc:  "0.111",
        steps,
      });

    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({
        error:          "Demo failed",
        detail:         String(err),
        steps_completed: steps,
      });
    }
  });
}
