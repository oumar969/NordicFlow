import { useEffect, useState, type CSSProperties } from "react";
import type { DashboardSummary, NordicFlowApi } from "./api/nordicFlowApi";
import { DelayedOrders } from "./DelayedOrders";

interface DashboardProps { api: NordicFlowApi; }

const emptySummary: DashboardSummary = {
  totalOrders: 0, highRiskOrders: 0, lowStockItems: 0,
  averageDelayProbability: 0, lastUpdatedAt: null,
};

export function Dashboard({ api }: DashboardProps) {
  const [summary, setSummary] = useState(emptySummary);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [page, setPage] = useState<"overview" | "orders">("overview");

  useEffect(() => {
    const controller = new AbortController();
    api.getDashboardSummary(controller.signal)
      .then((value) => { setSummary(value); setStatus("ready"); })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [api]);

  const delayRisk = Math.round(summary.averageDelayProbability * 100);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">NF</span><span>NordicFlow</span></div>
        <nav aria-label="Primary navigation">
          <button className={`nav-item ${page === "overview" ? "active" : ""}`} type="button" onClick={() => setPage("overview")}>Overview</button>
          <button className={`nav-item ${page === "orders" ? "active" : ""}`} type="button" onClick={() => setPage("orders")}>Orders</button>
          <button className="nav-item" type="button" disabled>Inventory</button>
          <button className="nav-item" type="button" disabled>Predictions</button>
          <button className="nav-item" type="button" disabled>Data quality</button>
        </nav>
        <div className="environment"><span className="status-dot" />Development</div>
      </aside>
      <main>
        {page === "orders" ? <DelayedOrders api={api} onBack={() => setPage("overview")} /> : <>
        <header className="topbar">
          <div><p className="eyebrow">Supply chain intelligence</p><h1>Control tower</h1></div>
          <div className="user-chip" aria-label="Signed in user"><span>OA</span><div><strong>Omar Ammar</strong><small>Platform administrator</small></div></div>
        </header>
        {status === "error" && <div className="alert" role="alert">Dashboard data could not be loaded. Check the API connection and sign-in.</div>}
        <section className="metrics" aria-label="Operational summary">
          <Metric label="Total orders" value={summary.totalOrders.toLocaleString()} hint="Across the active tenant" loading={status === "loading"} />
          <Metric label="High-risk orders" value={summary.highRiskOrders.toLocaleString()} hint="70% or higher delay risk" tone="danger" loading={status === "loading"} />
          <Metric label="Low-stock items" value={summary.lowStockItems.toLocaleString()} hint="Available stock at or below reserved" tone="warning" loading={status === "loading"} />
          <Metric label="Average delay risk" value={`${delayRisk}%`} hint="Latest model scores" loading={status === "loading"} />
        </section>
        <section className="workspace-grid">
          <article className="panel risk-panel">
            <div className="panel-heading"><div><p className="eyebrow">Prediction signal</p><h2>Delay exposure</h2></div><span className="live-badge">Live</span></div>
            <div className="risk-gauge" style={{ "--risk": `${delayRisk}%` } as CSSProperties}><div><strong>{delayRisk}%</strong><span>average risk</span></div></div>
            <p className="panel-copy">Models score incoming order signals and surface shipments that need intervention.</p>
          </article>
          <article className="panel action-panel">
            <div className="panel-heading"><div><p className="eyebrow">Attention required</p><h2>Operational queue</h2></div></div>
            <Action tone="danger" icon="!" title={`${summary.highRiskOrders} orders at high delay risk`} hint="Review supplier and transport constraints" onReview={() => setPage("orders")} />
            <Action tone="warning" icon="↓" title={`${summary.lowStockItems} inventory positions running low`} hint="Confirm replenishment priorities" disabled />
            <div className="data-freshness"><span className="status-dot" />Data refreshed {formatTimestamp(summary.lastUpdatedAt)}</div>
          </article>
        </section>
        </>}
      </main>
    </div>
  );
}

interface MetricProps { label: string; value: string; hint: string; tone?: "danger" | "warning"; loading: boolean; }
function Metric({ label, value, hint, tone, loading }: MetricProps) {
  return <article className={`metric-card ${tone ?? ""}`}><p>{label}</p><strong className={loading ? "skeleton" : ""}>{loading ? "—" : value}</strong><span>{hint}</span></article>;
}

interface ActionProps { tone: "danger" | "warning"; icon: string; title: string; hint: string; onReview?: () => void; disabled?: boolean; }
function Action({ tone, icon, title, hint, onReview, disabled }: ActionProps) {
  return <div className="action-row"><span className={`action-icon ${tone}`}>{icon}</span><div><strong>{title}</strong><small>{hint}</small></div><button type="button" onClick={onReview} disabled={disabled}>{disabled ? "Soon" : "Review"}</button></div>;
}

function formatTimestamp(value: string | null): string {
  if (!value) return "not available";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
