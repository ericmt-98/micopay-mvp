import { useState } from "react";

interface Props {
  apiUrl: string;
}

type Phase = "idle" | "running" | "done" | "error";

interface TxStep {
  name: string;
  description: string;
  price_usdc: string;
  tx_hash: string;
  stellar_expert_url: string;
  result: any;
}

interface DemoResult {
  agent_address: string;
  platform_address: string;
  total_paid_usdc: string;
  steps: TxStep[];
}

type LogLine = { type: "cmd" | "response" | "info" | "success" | "error"; text: string };

const COLOR: Record<LogLine["type"], string> = {
  cmd:      "#60a5fa",
  response: "#9ca3af",
  info:     "#6b7280",
  success:  "#4ade80",
  error:    "#f87171",
};

export default function DemoTerminal({ apiUrl }: Props) {
  const [phase,  setPhase]  = useState<Phase>("idle");
  const [logs,   setLogs]   = useState<LogLine[]>([]);
  const [result, setResult] = useState<DemoResult | null>(null);

  const add = (line: LogLine) => setLogs((p) => [...p, line]);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const runDemo = async () => {
    setLogs([]);
    setResult(null);
    setPhase("running");

    add({ type: "info",    text: "=== Micopay Protocol — Full Demo ===" });
    add({ type: "info",    text: "Each step pays with a real Stellar USDC transaction." });
    add({ type: "cmd",     text: `POST ${apiUrl}/api/v1/demo/run` });
    await sleep(400);
    add({ type: "info",    text: "  → Building 3 Stellar USDC payment txs..." });
    await sleep(300);
    add({ type: "info",    text: "  → Submitting to testnet + calling services..." });

    try {
      const res = await fetch(`${apiUrl}/api/v1/demo/run`, { method: "POST" });
      const data: DemoResult & { error?: string } = await res.json();

      if (!res.ok || data.error) {
        add({ type: "error", text: `✗ ${data.error ?? "Demo failed"}` });
        setPhase("error");
        return;
      }

      // Show step results as they arrive in the payload
      for (const step of data.steps) {
        add({ type: "info",     text: `\n--- ${step.name} ($${step.price_usdc} USDC) ---` });
        add({ type: "success",  text: `✓ Paid & confirmed` });
        add({ type: "response", text: `  tx: ${step.tx_hash}` });

        if (step.name === "swap_search") {
          const cp = step.result?.counterparties?.[0];
          add({ type: "response", text: `  market_rate: ${step.result?.market_rate} XLM/USDC  [${step.result?.rate_source ?? "horizon"}]` });
          if (cp) add({ type: "response", text: `  best counterparty: score=${cp.reputation_score}  rate=${cp.rate}` });
        }

        if (step.name === "swap_plan") {
          const plan = step.result?.plan;
          if (plan) {
            add({ type: "response", text: `  agent: ${step.result?.agent}` });
            add({ type: "response", text: `  sell: ${plan.amounts?.sell_amount} ${plan.amounts?.sell_asset} → buy: ${plan.amounts?.buy_amount} ${plan.amounts?.buy_asset}` });
            add({ type: "response", text: `  rate: ${plan.amounts?.exchange_rate}  risk: ${plan.risk_level}` });
          }
        }

        if (step.name === "fund_micopay") {
          add({ type: "response", text: `  ${step.result?.message}` });
        }
      }

      add({ type: "info",    text: `\n  Agent:    ${data.agent_address.slice(0,8)}...${data.agent_address.slice(-6)}` });
      add({ type: "info",    text: `  Platform: ${data.platform_address.slice(0,8)}...${data.platform_address.slice(-6)}` });
      add({ type: "success", text: `\n✓ Total paid: $${data.total_paid_usdc} USDC — 3 real txs on Stellar testnet.` });
      add({ type: "info",    text: "=== Payment IS authentication. ===" });

      setResult(data);
      setPhase("done");
    } catch (err) {
      add({ type: "error", text: `✗ ${err}` });
      setPhase("error");
    }
  };

  const box: React.CSSProperties = {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: "0.5rem",
    padding: "1.5rem",
    marginBottom: "1rem",
  };

  return (
    <div>
      <div style={box}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.25rem", color: "white" }}>Demo Terminal</h2>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280" }}>
              3 real USDC payments on Stellar testnet — one per service call
            </p>
          </div>
          <button
            onClick={runDemo}
            disabled={phase === "running"}
            style={{
              padding: "0.5rem 1.25rem",
              background: phase === "running" ? "#1f2937" : "#166534",
              border: `1px solid ${phase === "running" ? "#374151" : "#15803d"}`,
              borderRadius: "0.375rem",
              color: phase === "running" ? "#4b5563" : "#4ade80",
              fontSize: "0.875rem",
              cursor: phase === "running" ? "not-allowed" : "pointer",
              fontFamily: "monospace",
            }}
          >
            {phase === "running" ? "Running..." : phase === "done" || phase === "error" ? "▶ Run Again" : "▶ Run Demo"}
          </button>
        </div>

        {/* Terminal */}
        <div style={{
          background: "#0a0f1e",
          borderRadius: "0.375rem",
          padding: "1rem",
          minHeight: "300px",
          fontFamily: "monospace",
          fontSize: "0.8rem",
          lineHeight: "1.8",
          overflowY: "auto",
          maxHeight: "500px",
        }}>
          {logs.length === 0 ? (
            <span style={{ color: "#374151" }}>Press "Run Demo" to start...</span>
          ) : (
            logs.map((line, i) => (
              <div key={i} style={{ color: COLOR[line.type] }}>
                {line.type === "cmd" && <span style={{ color: "#4b5563" }}>$ </span>}
                {line.text}
              </div>
            ))
          )}
          {phase === "running" && <span style={{ color: "#4ade80" }}>▋</span>}
        </div>
      </div>

      {/* 3 tx links — shown only when done */}
      {result && (
        <div style={{ ...box, padding: "1.25rem" }}>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Verified on Stellar Testnet — {result.total_paid_usdc} USDC in 3 real transactions
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {result.steps.map((step) => (
              <div key={step.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "0.7rem", color: "#facc15", fontFamily: "monospace" }}>${step.price_usdc}</span>
                  <span style={{ fontSize: "0.75rem", color: "#d1d5db", fontFamily: "monospace" }}>{step.name}</span>
                </div>
                <a
                  href={step.stellar_expert_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "0.7rem", color: "#60a5fa", fontFamily: "monospace", textDecoration: "none" }}
                >
                  {step.tx_hash.slice(0, 12)}...{step.tx_hash.slice(-6)} ↗
                </a>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #1f2937", fontSize: "0.7rem", color: "#4b5563" }}>
            agent: {result.agent_address.slice(0, 8)}...{result.agent_address.slice(-6)} →
            platform: {result.platform_address.slice(0, 8)}...{result.platform_address.slice(-6)}
          </div>
        </div>
      )}
    </div>
  );
}
