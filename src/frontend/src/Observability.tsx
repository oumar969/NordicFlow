import { useEffect, useMemo, useState } from "react";
import type { NordicFlowApi, ObservabilitySnapshot } from "./api/nordicFlowApi";

interface ObservabilityProps { api: NordicFlowApi; onBack: () => void; }

export function Observability({ api, onBack }: ObservabilityProps) {
  const [snapshot, setSnapshot] = useState<ObservabilitySnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api.getObservability(controller.signal)
      .then((value) => { setSnapshot(value); setStatus("ready"); })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [api]);

  const traces = useMemo(() => snapshot?.traces.filter((trace) =>
    [trace.traceId, trace.correlationId, trace.eventId, trace.operation].some((value) => value.toLowerCase().includes(query.toLowerCase())),
  ) ?? [], [snapshot, query]);

  return <div className="orders-view">
    <button className="back-button" type="button" onClick={onBack}>← Back to control tower</button>
    <header className="page-heading"><div><p className="eyebrow">OpenTelemetry operations</p><h1>Observability</h1><p>Trace order events across the API, outbox, Event Hubs and data platform.</p></div>{snapshot && <span className="count-badge">Telemetry {snapshot.telemetryStatus}</span>}</header>
    {status === "error" && <div className="alert" role="alert">Telemetry metrics could not be loaded.</div>}
    <section className="metrics" aria-label="Platform telemetry summary">
      <TelemetryMetric label="Request throughput" value={snapshot ? `${snapshot.requestsPerMinute}/min` : "—"} hint="API request rate" />
      <TelemetryMetric label="P95 latency" value={snapshot ? `${snapshot.p95LatencyMs} ms` : "—"} hint="End-to-end processing" tone={snapshot && snapshot.p95LatencyMs > 400 ? "warning" : undefined} />
      <TelemetryMetric label="Error rate" value={snapshot ? `${(snapshot.errorRate * 100).toFixed(2)}%` : "—"} hint="Across instrumented services" tone={snapshot && snapshot.errorRate > 0.01 ? "danger" : undefined} />
      <TelemetryMetric label="Availability" value={snapshot ? `${(snapshot.availability * 100).toFixed(2)}%` : "—"} hint="Rolling service objective" />
    </section>
    <section className="service-health-grid" aria-label="Service health">{snapshot?.services.map((service) => <article className="service-card" key={service.name}><div><span className={`health-dot ${service.status.toLowerCase()}`} /><strong>{service.name}</strong></div><span className={`status-pill service-${service.status.toLowerCase()}`}>{service.status}</span><dl><div><dt>P95 latency</dt><dd>{service.p95LatencyMs} ms</dd></div><div><dt>Error rate</dt><dd>{(service.errorRate * 100).toFixed(2)}%</dd></div></dl></article>)}</section>
    <section className="orders-table-wrap">
      <div className="trace-heading"><div><p className="eyebrow">Distributed traces</p><h2>Recent operations</h2></div><label><span className="sr-only">Search traces</span><input aria-label="Search traces" placeholder="Trace, correlation or event ID" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
      <table><thead><tr><th>Operation</th><th>Correlation ID</th><th>Event ID</th><th>Duration</th><th>Status</th></tr></thead><tbody>
        {status === "loading" && <tr><td className="table-state" colSpan={5}>Loading OpenTelemetry traces…</td></tr>}
        {traces.map((trace) => <tr key={trace.traceId} title={`Trace ID: ${trace.traceId}`}><td><strong>{trace.operation}</strong><small>{formatTime(trace.startedAt)}</small></td><td><code>{trace.correlationId}</code></td><td><code>{trace.eventId}</code></td><td className={trace.durationMs > 400 ? "latency-warning" : ""}>{trace.durationMs} ms</td><td><span className={`status-pill trace-${trace.status.toLowerCase()}`}>{trace.status}</span></td></tr>)}
        {status === "ready" && traces.length === 0 && <tr><td className="table-state" colSpan={5}>No traces match this search.</td></tr>}
      </tbody></table>
    </section>
  </div>;
}

function TelemetryMetric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "danger" | "warning" }) {
  return <article className={`metric-card ${tone ?? ""}`}><p>{label}</p><strong>{value}</strong><span>{hint}</span></article>;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeStyle: "medium" }).format(new Date(value));
}
