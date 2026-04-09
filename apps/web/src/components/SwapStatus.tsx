import { useState } from "react";

interface Props {
  apiUrl: string;
}

const MOCK_SWAPS = [
  {
    id: "swap_1712345678_abc123",
    status: "completed",
    sell: "50 USDC",
    buy: "500 XLM",
    counterparty: "GDEMO...XYZ1",
    stellar_tx: "https://stellar.expert/explorer/testnet/tx/abc123",
    started: "2 min ago",
  },
  {
    id: "swap_1712345500_def456",
    status: "locked",
    sell: "10 USDC",
    buy: "100 XLM",
    counterparty: "GDEMO...XYZ2",
    stellar_tx: null,
    started: "45 sec ago",
  },
];

const STATUS_COLORS: Record<string, string> = {
  completed: "#4ade80",
  locked: "#facc15",
  executing: "#60a5fa",
  failed: "#f87171",
  refunded: "#a78bfa",
};

export default function SwapStatus({ apiUrl }: Props) {
  const [swapId, setSwapId] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pollStatus = async () => {
    if (!swapId.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/swaps/${swapId}/status`, {
        headers: { "x-payment": "mock:GAGENT_DEMO:0.0001" },
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(false);
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
        <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem", color: "white" }}>Atomic Swap Lifecycle</h2>

        {/* Lifecycle diagram */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {["Intent", "Plan (Claude)", "Lock A", "Lock B", "Release B", "Release A", "Complete"].map((step, i, arr) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "0.25rem",
                fontSize: "0.7rem",
                background: i < 3 ? "#14532d" : i < 5 ? "#1e3a5f" : "#3b0764",
                color: i < 3 ? "#4ade80" : i < 5 ? "#60a5fa" : "#c4b5fd",
                border: `1px solid ${i < 3 ? "#166534" : i < 5 ? "#1d4ed8" : "#6d28d9"}`,
              }}>
                {step}
              </div>
              {i < arr.length - 1 && <span style={{ color: "#4b5563", fontSize: "0.75rem" }}>→</span>}
            </div>
          ))}
        </div>

        {/* Recent swaps */}
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Recent Swaps (demo)
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {MOCK_SWAPS.map((swap) => (
            <div key={swap.id} style={{
              padding: "0.75rem",
              background: "#0f172a",
              borderRadius: "0.375rem",
              borderLeft: `3px solid ${STATUS_COLORS[swap.status] ?? "#6b7280"}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "0.875rem", color: "white" }}>{swap.sell} → {swap.buy}</span>
                  <span style={{
                    marginLeft: "0.5rem",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "0.25rem",
                    fontSize: "0.7rem",
                    background: "#1f2937",
                    color: STATUS_COLORS[swap.status] ?? "#6b7280",
                  }}>
                    {swap.status}
                  </span>
                </div>
                <span style={{ fontSize: "0.7rem", color: "#4b5563" }}>{swap.started}</span>
              </div>
              <div style={{ marginTop: "0.25rem", fontSize: "0.7rem", color: "#4b5563" }}>
                counterparty: <code style={{ color: "#60a5fa" }}>{swap.counterparty}</code>
              </div>
              {swap.stellar_tx && (
                <a href={swap.stellar_tx} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "0.7rem", color: "#a78bfa", textDecoration: "none" }}>
                  view on Stellar Expert ↗
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Poll by ID */}
      <div style={box}>
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Poll Swap Status
        </h3>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <input
            value={swapId}
            onChange={(e) => setSwapId(e.target.value)}
            placeholder="swap_id..."
            style={{
              flex: 1,
              padding: "0.5rem 0.75rem",
              background: "#0f172a",
              border: "1px solid #374151",
              borderRadius: "0.375rem",
              color: "white",
              fontSize: "0.875rem",
              fontFamily: "monospace",
            }}
          />
          <button
            onClick={pollStatus}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              background: "#166534",
              border: "1px solid #15803d",
              borderRadius: "0.375rem",
              color: "#4ade80",
              fontSize: "0.875rem",
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            {loading ? "..." : "Poll"}
          </button>
        </div>
        {result && (
          <pre style={{ margin: 0, fontSize: "0.75rem", color: "#d1d5db", background: "#0f172a", padding: "0.75rem", borderRadius: "0.375rem", overflowX: "auto" }}>
            {result}
          </pre>
        )}
      </div>
    </div>
  );
}
