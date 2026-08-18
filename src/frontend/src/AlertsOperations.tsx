import { useEffect, useMemo, useState } from "react";
import type { NordicFlowApi, OperationsAlert, OperationsSnapshot } from "./api/nordicFlowApi";

interface AlertsOperationsProps { api: NordicFlowApi; onBack: () => void; }
type SeverityFilter = "All" | OperationsAlert["severity"];

export function AlertsOperations({ api, onBack }: AlertsOperationsProps) {
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [severity, setSeverity] = useState<SeverityFilter>("All");

  useEffect(() => {
    const controller = new AbortController();
    api.getOperations(controller.signal)
      .then((value) => { setSnapshot(value); setStatus("ready"); })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [api]);

  const alerts = useMemo(() => snapshot?.alerts.filter((alert) => severity === "All" || alert.severity === severity) ?? [], [snapshot, severity]);
  const changeStatus = (id: string, nextStatus: OperationsAlert["status"]) => setSnapshot((current) => current ? {
    ...current,
    alerts: current.alerts.map((alert) => alert.id === id ? { ...alert, status: nextStatus, owner: alert.owner ?? "Data Operations" } : alert),
  } : current);

  return <div className="orders-view">
    <button className="back-button" type="button" onClick={onBack}>← Back to control tower</button>
    <header className="page-heading"><div><p className="eyebrow">Operational response</p><h1>Alerts & operations</h1><p>Prioritise platform incidents, assign ownership and track resolution.</p></div><span className="count-badge">On-call · Data Operations</span></header>
    {status === "error" && <div className="alert" role="alert">Operational alerts could not be loaded.</div>}
    <section className="metrics" aria-label="Operations summary">
      <OperationsMetric label="Active alerts" value={snapshot?.activeAlerts.toString() ?? "—"} hint="Open or acknowledged" tone="warning" />
      <OperationsMetric label="Critical" value={snapshot?.criticalAlerts.toString() ?? "—"} hint="Immediate response required" tone="danger" />
      <OperationsMetric label="Acknowledged" value={snapshot?.acknowledgedAlerts.toString() ?? "—"} hint="Owned by operations" />
      <OperationsMetric label="Mean time to acknowledge" value={snapshot ? `${snapshot.meanTimeToAcknowledgeMinutes} min` : "—"} hint="Current response objective" />
    </section>
    <section className="operations-layout">
      <div className="orders-table-wrap">
        <div className="trace-heading"><div><p className="eyebrow">Incident queue</p><h2>Active alerts</h2></div><label><span className="sr-only">Severity</span><select aria-label="Severity" value={severity} onChange={(event) => setSeverity(event.target.value as SeverityFilter)}><option>All</option><option>Critical</option><option>Warning</option><option>Info</option></select></label></div>
        <div className="alert-list">{status === "loading" && <p className="table-state">Loading operational alerts…</p>}{alerts.map((alert) => <article className={`operations-alert severity-${alert.severity.toLowerCase()}`} key={alert.id}><div className="alert-title"><span className={`status-pill quality-${alert.severity.toLowerCase()}`}>{alert.severity}</span><div><strong>{alert.title}</strong><small>{alert.source} · {formatTime(alert.triggeredAt)}</small></div></div><div className="threshold-reading"><span>Current</span><strong>{alert.currentValue}{alert.unit}</strong><small>Threshold {alert.threshold}{alert.unit}</small></div><div className="alert-owner"><span>Owner</span><strong>{alert.owner ?? "Unassigned"}</strong>{alert.correlationId && <code>{alert.correlationId}</code>}</div><div className="alert-actions"><span className={`status-pill alert-${alert.status.toLowerCase()}`}>{alert.status}</span>{alert.status === "Open" && <button type="button" onClick={() => changeStatus(alert.id, "Acknowledged")}>Acknowledge</button>}{alert.status === "Acknowledged" && <button type="button" onClick={() => changeStatus(alert.id, "Resolved")}>Resolve</button>}</div></article>)}</div>
      </div>
      <aside className="panel rules-panel"><div><p className="eyebrow">Policy</p><h2>Alert rules</h2></div>{snapshot?.rules.map((rule) => <div className="rule-row" key={rule.id}><div><strong>{rule.name}</strong><code>{rule.metric}</code></div><span>{rule.threshold}{rule.unit} / {rule.evaluationWindowMinutes} min</span><i className={rule.enabled ? "enabled" : ""}>{rule.enabled ? "On" : "Off"}</i></div>)}</aside>
    </section>
  </div>;
}

function OperationsMetric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "danger" | "warning" }) {
  return <article className={`metric-card ${tone ?? ""}`}><p>{label}</p><strong>{value}</strong><span>{hint}</span></article>;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
