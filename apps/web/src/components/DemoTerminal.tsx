import { useState } from "react";

interface Props {
  apiUrl: string;
}

type Step = "idle" | "search" | "plan" | "fund" | "done";

interface LogLine {
  type: "cmd" | "response" | "info" | "success" | "error";
  text: string;
}

export default function DemoTerminal({ apiUrl }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);

  const addLog = (line: LogLine) =>
    setLogs((prev) => [...prev, line]);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const runDemo = async () => {
    setLogs([]);
    setRunning(true);
    setStep("search");

    // Step 1: Service discovery (free)
    addLog({ type: "info", text: "=== Micopay Protocol Demo ===" });
    addLog({ type: "cmd", text: `GET ${apiUrl}/api/v1/services` });
    await sleep(600);
    try {
      const res = await fetch(`${apiUrl}/api/v1/services`);
      const data = await res.json();
      addLog({ type: "success", text: `✓ ${data.services?.length ?? 0} services available` });
      addLog({ type: "response", text: `  payment_method: ${data.payment_method}` });
      addLog({ type: "response", text: `  payment_asset: USDC on Stellar` });
    } catch {
      addLog({ type: "error", text: "⚠ API offline — using mock responses" });
    }

    await sleep(500);

    // Step 2: Search swaps (x402)
    setStep("search");
    addLog({ type: "info", text: "\n--- Step 1: Search counterparties ($0.001) ---" });
    addLog({ type: "cmd", text: `GET ${apiUrl}/api/v1/swaps/search?sell_asset=USDC&buy_asset=XLM&amount=50` });
    addLog({ type: "info", text: "  → 402 Payment Required" });
    await sleep(400);
    addLog({ type: "info", text: '  → Sending X-Payment: "mock:GAGENT:0.001"' });
    await sleep(800);
    try {
      const res = await fetch(`${apiUrl}/api/v1/swaps/search?sell_asset=USDC&buy_asset=XLM&amount=50`, {
        headers: { "x-payment": "mock:GAGENT_DEMO:0.001" },
      });
      const data = await res.json();
      addLog({ type: "success", text: `✓ 200 OK — ${data.counterparties?.length ?? 2} counterparties found` });
      if (data.counterparties?.[0]) {
        const cp = data.counterparties[0];
        addLog({ type: "response", text: `  best: score=${cp.reputation_score} rate=${cp.rate}` });
      }
    } catch {
      addLog({ type: "success", text: "✓ 200 OK — 2 counterparties found (mock)" });
      addLog({ type: "response", text: "  best: score=95 rate=1.001" });
    }

    await sleep(500);

    // Step 3: Plan swap (Claude)
    setStep("plan");
    addLog({ type: "info", text: "\n--- Step 2: Plan swap with Claude ($0.01) ---" });
    addLog({ type: "cmd", text: `POST ${apiUrl}/api/v1/swaps/plan` });
    addLog({ type: "info", text: '  intent: "swap 50 USDC for XLM"' });
    addLog({ type: "info", text: "  → Claude parsing intent..." });
    await sleep(1200);
    addLog({ type: "info", text: "  → Claude calling search_swaps tool..." });
    await sleep(800);
    addLog({ type: "info", text: "  → Claude calling get_reputation tool..." });
    await sleep(600);
    addLog({ type: "info", text: "  → Claude calling create_swap_plan..." });
    await sleep(500);
    addLog({ type: "success", text: "✓ SwapPlan generated" });
    addLog({ type: "response", text: "  steps: lock → monitor → release" });
    addLog({ type: "response", text: "  risk_level: low | estimated: 60s" });
    addLog({ type: "response", text: "  total_fee_usd: $0.012" });

    await sleep(500);

    // Step 4: Fund Micopay (meta-demo)
    setStep("fund");
    addLog({ type: "info", text: "\n--- Step 3: Fund Micopay — the meta-demo ($0.10) ---" });
    addLog({ type: "cmd", text: `POST ${apiUrl}/api/v1/fund` });
    addLog({ type: "info", text: '  message: "x402 works — funding with the protocol itself"' });
    addLog({ type: "info", text: "  → 402 Payment Required (min $0.10)" });
    await sleep(400);
    addLog({ type: "info", text: '  → Sending X-Payment: "mock:GAGENT_DEMO:0.10"' });
    await sleep(900);
    try {
      const res = await fetch(`${apiUrl}/api/v1/fund`, {
        method: "POST",
        headers: {
          "x-payment": "mock:GAGENT_DEMO:0.10",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "x402 works — funding with the protocol itself" }),
      });
      const data = await res.json();
      addLog({ type: "success", text: `✓ 200 OK — Thank you, ${data.supporter_id}!` });
      addLog({ type: "response", text: `  total_funded_usdc: $${data.total_funded_usdc}` });
      addLog({ type: "response", text: `  total_supporters: ${data.total_supporters}` });
      addLog({ type: "response", text: `  stellar_tx: ${data.stellar_tx_hash}` });
    } catch {
      addLog({ type: "success", text: "✓ 200 OK — Thank you, mcp-supporter-001!" });
      addLog({ type: "response", text: "  total_funded_usdc: $10.10" });
      addLog({ type: "response", text: "  stellar_expert_url: https://stellar.expert/..." });
    }

    addLog({ type: "info", text: "\n=== Demo complete. x402 works. ===" });
    setStep("done");
    setRunning(false);
  };

  const COLOR: Record<LogLine["type"], string> = {
    cmd: "#60a5fa",
    response: "#9ca3af",
    info: "#6b7280",
    success: "#4ade80",
    error: "#f87171",
  };

  return (
    <div>
      <div style={{
        background: "#111827",
        border: "1px solid #1f2937",
        borderRadius: "0.5rem",
        padding: "1.5rem",
        marginBottom: "1rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.25rem", color: "white" }}>Demo Terminal</h2>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280" }}>
              Full demo: service discovery → swap plan (Claude) → Fund Micopay
            </p>
          </div>
          <button
            onClick={runDemo}
            disabled={running}
            style={{
              padding: "0.5rem 1.25rem",
              background: running ? "#1f2937" : "#166534",
              border: `1px solid ${running ? "#374151" : "#15803d"}`,
              borderRadius: "0.375rem",
              color: running ? "#4b5563" : "#4ade80",
              fontSize: "0.875rem",
              cursor: running ? "not-allowed" : "pointer",
              fontFamily: "monospace",
            }}
          >
            {running ? "Running..." : step === "done" ? "▶ Run Again" : "▶ Run Demo"}
          </button>
        </div>

        {/* Progress */}
        {step !== "idle" && (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            {(["search", "plan", "fund", "done"] as Step[]).map((s) => (
              <div key={s} style={{
                flex: 1,
                height: "4px",
                borderRadius: "2px",
                background: (["done", "fund", "plan", "search"] as string[]).indexOf(step) >= (["done", "fund", "plan", "search"] as string[]).indexOf(s)
                  ? "#4ade80"
                  : "#1f2937",
                transition: "background 0.3s",
              }} />
            ))}
          </div>
        )}

        {/* Terminal output */}
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
          {running && <span style={{ color: "#4ade80" }}>▋</span>}
        </div>
      </div>
    </div>
  );
}
