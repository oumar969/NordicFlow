import { useEffect, useMemo, useState } from "react";
import type { DelayedOrder, NordicFlowApi } from "./api/nordicFlowApi";

interface DelayedOrdersProps { api: NordicFlowApi; onBack: () => void; }

export function DelayedOrders({ api, onBack }: DelayedOrdersProps) {
  const [orders, setOrders] = useState<DelayedOrder[]>([]);
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState("all");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    api.getDelayedOrders(controller.signal)
      .then((value) => { setOrders(value); setStatus("ready"); })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [api]);

  const filtered = useMemo(() => orders.filter((order) => {
    const term = search.trim().toLowerCase();
    const matchesText = !term || [order.orderNumber, order.supplierName, order.destination]
      .some((value) => value.toLowerCase().includes(term));
    const matchesRisk = risk === "all" ||
      (risk === "critical" && order.delayProbability >= 0.85) ||
      (risk === "high" && order.delayProbability >= 0.70 && order.delayProbability < 0.85);
    return matchesText && matchesRisk;
  }), [orders, risk, search]);

  return <section className="orders-view">
    <button className="back-button" type="button" onClick={onBack}>← Control tower</button>
    <div className="page-heading"><div><p className="eyebrow">Intervention workspace</p><h1>Delayed orders</h1><p>Prioritised by the latest model score and predicted operational impact.</p></div><span className="count-badge">{filtered.length} orders</span></div>
    <div className="filter-bar">
      <label><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order, supplier or destination" /></label>
      <label><span>Risk level</span><select value={risk} onChange={(event) => setRisk(event.target.value)}><option value="all">All risks</option><option value="critical">Critical · 85%+</option><option value="high">High · 70–84%</option></select></label>
    </div>
    {status === "error" && <div className="alert" role="alert">Delayed orders could not be loaded.</div>}
    <div className="orders-table-wrap">
      <table><thead><tr><th>Order</th><th>Supplier</th><th>Destination</th><th>Requested</th><th>Risk</th><th>Impact</th><th>Status</th></tr></thead>
      <tbody>{status === "loading" ? <tr><td colSpan={7} className="table-state">Loading prioritised orders…</td></tr> : filtered.map((order) => <OrderRow key={order.orderId} order={order} />)}</tbody></table>
      {status === "ready" && filtered.length === 0 && <div className="table-state">No orders match the selected filters.</div>}
    </div>
  </section>;
}

function OrderRow({ order }: { order: DelayedOrder }) {
  const probability = Math.round(order.delayProbability * 100);
  return <tr><td><strong>{order.orderNumber}</strong><small>{order.orderId.slice(0, 8)}</small></td><td>{order.supplierName}</td><td>{order.destination}</td><td>{new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(order.requestedDeliveryDate))}</td><td><div className="risk-cell"><span>{probability}%</span><i><b style={{ width: `${probability}%` }} /></i></div></td><td><strong className="delay-days">+{order.predictedDelayDays} days</strong></td><td><span className={`status-pill ${order.status.toLowerCase().replace(" ", "-")}`}>{order.status}</span></td></tr>;
}
