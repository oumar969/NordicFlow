import { useEffect, useState } from "react";
import type { DataQualitySnapshot, NordicFlowApi } from "./api/nordicFlowApi";

interface DataQualityProps { api: NordicFlowApi; onBack: () => void; }

export function DataQuality({ api, onBack }: DataQualityProps) {
  const [snapshot, setSnapshot] = useState<DataQualitySnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    api.getDataQuality(controller.signal)
      .then((value) => { setSnapshot(value); setStatus("ready"); })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [api]);

  const qualityRate = snapshot ? snapshot.validEvents / snapshot.processedEvents : 0;
  const trend = snapshot ? snapshot.errorRate - snapshot.previousErrorRate : 0;

  return <div className="orders-view">
    <button className="back-button" type="button" onClick={onBack}>← Back to control tower</button>
    <header className="page-heading"><div><p className="eyebrow">Governance & observability</p><h1>Data quality</h1><p>Monitor contract validation, quarantine events and end-to-end lineage.</p></div>{snapshot && <span className="count-badge">Contract {snapshot.contractVersion}</span>}</header>
    {status === "error" && <div className="alert" role="alert">Data quality metrics could not be loaded.</div>}
    <section className="metrics" aria-label="Data quality summary">
      <QualityMetric label="Processed events" value={snapshot?.processedEvents.toLocaleString() ?? "—"} hint="Latest processing window" />
      <QualityMetric label="Valid events" value={snapshot ? `${Math.round(qualityRate * 10000) / 100}%` : "—"} hint={`${snapshot?.validEvents.toLocaleString() ?? 0} accepted into Silver`} />
      <QualityMetric label="Quarantined" value={snapshot?.quarantinedEvents.toLocaleString() ?? "—"} hint="Requires investigation" tone="danger" />
      <QualityMetric label="Error rate" value={snapshot ? `${(snapshot.errorRate * 100).toFixed(2)}%` : "—"} hint={snapshot ? `${trend >= 0 ? "+" : ""}${(trend * 100).toFixed(2)} pp from prior window` : "Waiting for metrics"} tone={trend > 0 ? "warning" : undefined} />
    </section>
    <section className="lineage-panel panel">
      <div className="panel-heading"><div><p className="eyebrow">Event lineage</p><h2>API → Silver</h2></div><span className="live-badge">Live</span></div>
      <div className="lineage-flow">{snapshot?.lineage.map((stage, index) => <div className="lineage-step" key={stage.name}><div className={`lineage-node ${stage.status.toLowerCase()}`}><span>{index + 1}</span><strong>{stage.name}</strong><small>{stage.eventCount.toLocaleString()} events</small><em>{stage.status}</em></div>{index < snapshot.lineage.length - 1 && <i aria-hidden="true">→</i>}</div>)}</div>
    </section>
    <section className="orders-table-wrap"><div className="quality-table-heading"><div><p className="eyebrow">Quarantine analysis</p><h2>Contract violations</h2></div><span>{snapshot ? `Evaluated ${formatTime(snapshot.lastEvaluatedAt)}` : "Loading…"}</span></div>
      <table><thead><tr><th>Rule</th><th>Field</th><th>Events</th><th>Severity</th><th>Latest event</th></tr></thead><tbody>
        {status === "loading" && <tr><td className="table-state" colSpan={5}>Loading quality checks…</td></tr>}
        {snapshot?.violations.map((violation) => <tr key={`${violation.rule}-${violation.field}`}><td><strong>{violation.rule}</strong></td><td><code>{violation.field}</code></td><td>{violation.count.toLocaleString()}</td><td><span className={`status-pill quality-${violation.severity.toLowerCase()}`}>{violation.severity}</span></td><td><code>{violation.latestEventId}</code></td></tr>)}
      </tbody></table>
    </section>
  </div>;
}

function QualityMetric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "danger" | "warning" }) {
  return <article className={`metric-card ${tone ?? ""}`}><p>{label}</p><strong>{value}</strong><span>{hint}</span></article>;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
