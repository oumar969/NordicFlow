import { useEffect, useMemo, useState } from "react";
import type { NordicFlowApi, PredictionInsight } from "./api/nordicFlowApi";

interface PredictionsProps { api: NordicFlowApi; onBack: () => void; }
type RiskFilter = "all" | "critical" | "high" | "monitoring";

export function Predictions({ api, onBack }: PredictionsProps) {
  const [predictions, setPredictions] = useState<PredictionInsight[]>([]);
  const [selected, setSelected] = useState<PredictionInsight | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    api.getPredictions(controller.signal)
      .then((value) => { setPredictions(value); setSelected(value[0] ?? null); setStatus("ready"); })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [api]);

  const filtered = useMemo(() => predictions.filter((prediction) => riskFilter === "all" || getRiskLevel(prediction.delayProbability) === riskFilter), [predictions, riskFilter]);
  const averageQuality = predictions.length === 0 ? 0 : Math.round(predictions.reduce((sum, item) => sum + item.dataQualityScore, 0) / predictions.length * 100);
  const modelVersion = predictions[0]?.modelVersion ?? "Not available";

  return <section className="orders-view predictions-view">
    <button className="back-button" type="button" onClick={onBack}>← Control tower</button>
    <div className="page-heading"><div><p className="eyebrow">Machine learning intelligence</p><h1>Delay predictions</h1><p>Explainable risk signals from the registered production model.</p></div><span className="count-badge">{filtered.length} scored orders</span></div>
    <div className="model-strip"><div><span>Production model</span><strong>{modelVersion}</strong></div><div><span>Data quality</span><strong>{averageQuality}%</strong></div><div><span>Registry</span><strong>MLflow · Production</strong></div><label><span>Risk level</span><select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}><option value="all">All risks</option><option value="critical">Critical · 85%+</option><option value="high">High · 70–84%</option><option value="monitoring">Monitoring</option></select></label></div>
    {status === "error" && <div className="alert" role="alert">Predictions could not be loaded.</div>}
    <div className="prediction-layout">
      <div className="prediction-list">{status === "loading" ? <div className="table-state">Loading model scores…</div> : filtered.map((prediction) => <PredictionCard key={prediction.orderId} prediction={prediction} active={selected?.orderId === prediction.orderId} onSelect={() => setSelected(prediction)} />)}{status === "ready" && filtered.length === 0 && <div className="table-state">No predictions match this risk level.</div>}</div>
      <PredictionExplanation prediction={selected} />
    </div>
  </section>;
}

function PredictionCard({ prediction, active, onSelect }: { prediction: PredictionInsight; active: boolean; onSelect: () => void }) {
  const risk = Math.round(prediction.delayProbability * 100);
  return <button className={`prediction-card ${active ? "active" : ""}`} type="button" onClick={onSelect}><div><strong>{prediction.orderNumber}</strong><span>Scored {formatTime(prediction.scoredAt)}</span></div><div className="prediction-score"><strong>{risk}%</strong><span>+{prediction.predictedDelayDays} days</span></div></button>;
}

function PredictionExplanation({ prediction }: { prediction: PredictionInsight | null }) {
  if (!prediction) return <article className="panel explanation-panel"><div className="table-state">Select a prediction to inspect its explanation.</div></article>;
  return <article className="panel explanation-panel"><div className="panel-heading"><div><p className="eyebrow">Prediction explanation</p><h2>{prediction.orderNumber}</h2></div><span className={`status-pill prediction-${getRiskLevel(prediction.delayProbability)}`}>{Math.round(prediction.delayProbability * 100)}% risk</span></div><div className="impact-summary"><div><span>Expected delay</span><strong>+{prediction.predictedDelayDays} days</strong></div><div><span>Input quality</span><strong>{Math.round(prediction.dataQualityScore * 100)}%</strong></div></div><h3>Top contributing factors</h3><div className="factor-list">{prediction.riskFactors.map((factor) => <div className="factor" key={factor.name}><div><span>{factor.name}</span><strong>{Math.round(factor.contribution * 100)}%</strong></div><i><b style={{ width: `${factor.contribution * 100}%` }} /></i></div>)}</div><footer>Model {prediction.modelVersion} · scored {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(prediction.scoredAt))}</footer></article>;
}

function getRiskLevel(probability: number): Exclude<RiskFilter, "all"> { return probability >= .85 ? "critical" : probability >= .7 ? "high" : "monitoring"; }
function formatTime(value: string) { return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
