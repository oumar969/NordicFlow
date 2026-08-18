import { useEffect, useMemo, useState } from "react";
import type { InventoryItem, NordicFlowApi } from "./api/nordicFlowApi";

interface InventoryProps { api: NordicFlowApi; onBack: () => void; }
type StockFilter = "all" | "critical" | "low" | "healthy";

export function Inventory({ api, onBack }: InventoryProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    api.getInventory(controller.signal)
      .then((value) => { setItems(value); setStatus("ready"); })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [api]);

  const filtered = useMemo(() => items.filter((item) => {
    const term = search.trim().toLowerCase();
    const level = getStockLevel(item);
    return (!term || [item.sku, item.productName, item.location].some((value) => value.toLowerCase().includes(term)))
      && (stockFilter === "all" || level === stockFilter);
  }), [items, search, stockFilter]);

  const unitsToReorder = filtered.reduce((sum, item) => sum + item.recommendedOrderQuantity, 0);
  return <section className="orders-view inventory-view">
    <button className="back-button" type="button" onClick={onBack}>← Control tower</button>
    <div className="page-heading"><div><p className="eyebrow">Inventory intelligence</p><h1>Stock positions</h1><p>Live availability, reservations and replenishment recommendations.</p></div><span className="count-badge">{unitsToReorder} units recommended</span></div>
    <div className="filter-bar">
      <label><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="SKU, product or location" /></label>
      <label><span>Stock status</span><select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as StockFilter)}><option value="all">All positions</option><option value="critical">Critical</option><option value="low">Low stock</option><option value="healthy">Healthy</option></select></label>
    </div>
    {status === "error" && <div className="alert" role="alert">Inventory positions could not be loaded.</div>}
    <div className="orders-table-wrap"><table><thead><tr><th>Product</th><th>Location</th><th>Available</th><th>Reserved</th><th>Reorder point</th><th>Recommendation</th><th>Status</th></tr></thead>
      <tbody>{status === "loading" ? <tr><td colSpan={7} className="table-state">Loading inventory positions…</td></tr> : filtered.map((item) => <InventoryRow key={`${item.sku}-${item.location}`} item={item} />)}</tbody></table>
      {status === "ready" && filtered.length === 0 && <div className="table-state">No inventory positions match the selected filters.</div>}
    </div>
  </section>;
}

function InventoryRow({ item }: { item: InventoryItem }) {
  const level = getStockLevel(item);
  return <tr><td><strong>{item.sku}</strong><small>{item.productName}</small></td><td>{item.location}</td><td><strong>{item.availableQuantity}</strong></td><td>{item.reservedQuantity}</td><td>{item.reorderPoint}</td><td>{item.recommendedOrderQuantity > 0 ? <strong className="reorder-value">Order {item.recommendedOrderQuantity}</strong> : <span className="no-action">No action</span>}</td><td><span className={`status-pill stock-${level}`}>{level === "low" ? "Low stock" : capitalise(level)}</span></td></tr>;
}

function getStockLevel(item: InventoryItem): Exclude<StockFilter, "all"> {
  if (item.availableQuantity <= item.reservedQuantity) return "critical";
  if (item.availableQuantity <= item.reorderPoint) return "low";
  return "healthy";
}

function capitalise(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
