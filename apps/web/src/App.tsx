import { useState } from "react";
import FundWidget from "./components/FundWidget";
import SwapStatus from "./components/SwapStatus";
import ServiceCatalog from "./components/ServiceCatalog";
import DemoTerminal from "./components/DemoTerminal";

const API_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:3000";

type Tab = "fund" | "swaps" | "services" | "demo";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("fund");

  const tabs: { id: Tab; label: string }[] = [
    { id: "fund", label: "💚 Fund Micopay" },
    { id: "swaps", label: "🔄 Swaps" },
    { id: "services", label: "📡 Services" },
    { id: "demo", label: "⚡ Demo" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" style={{ fontFamily: "monospace" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #1f2937", padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.5rem" }}>🍄</span>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "bold", color: "white" }}>Micopay Protocol</h1>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280" }}>x402 agent services on Stellar</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
          <span style={{ color: "#4ade80" }}>testnet live</span>
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ borderBottom: "1px solid #1f2937", padding: "0 1.5rem", display: "flex", gap: "0.25rem" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "0.75rem 1rem",
              fontSize: "0.875rem",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #4ade80" : "2px solid transparent",
              color: activeTab === tab.id ? "#4ade80" : "#6b7280",
              cursor: "pointer",
              transition: "color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ padding: "1.5rem", maxWidth: "900px", margin: "0 auto" }}>
        {activeTab === "fund" && <FundWidget apiUrl={API_URL} />}
        {activeTab === "swaps" && <SwapStatus apiUrl={API_URL} />}
        {activeTab === "services" && <ServiceCatalog apiUrl={API_URL} />}
        {activeTab === "demo" && <DemoTerminal apiUrl={API_URL} />}
      </main>
    </div>
  );
}
