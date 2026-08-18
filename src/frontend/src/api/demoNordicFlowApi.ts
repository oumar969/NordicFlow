import type { DataQualitySnapshot, DelayedOrder, InventoryItem, NordicFlowApi, ObservabilitySnapshot, OperationsSnapshot, PredictionInsight } from "./nordicFlowApi";

const delayedOrders: DelayedOrder[] = [
  { orderId: "75274155-6950-4bc3-bc28-b26f353ed169", orderNumber: "NF-10482", supplierName: "Baltic Components", destination: "Aarhus, DK", requestedDeliveryDate: "2026-08-19", delayProbability: 0.92, predictedDelayDays: 5, status: "Delayed" },
  { orderId: "493fd77f-f99a-430f-8843-0049036f608a", orderNumber: "NF-10467", supplierName: "NordSteel AB", destination: "Malmö, SE", requestedDeliveryDate: "2026-08-20", delayProbability: 0.86, predictedDelayDays: 3, status: "At risk" },
  { orderId: "24776902-a8e0-4e8b-bb49-0cdd12a719ae", orderNumber: "NF-10491", supplierName: "Fjord Logistics", destination: "Oslo, NO", requestedDeliveryDate: "2026-08-21", delayProbability: 0.79, predictedDelayDays: 2, status: "At risk" },
  { orderId: "d559d5a0-8cc6-4bc7-84d3-c700667dcbfb", orderNumber: "NF-10455", supplierName: "Arctic Packaging", destination: "Helsinki, FI", requestedDeliveryDate: "2026-08-22", delayProbability: 0.71, predictedDelayDays: 2, status: "Monitoring" },
  { orderId: "4e066f28-babf-4df4-913d-2e2a53e7e51c", orderNumber: "NF-10438", supplierName: "Baltic Components", destination: "Odense, DK", requestedDeliveryDate: "2026-08-24", delayProbability: 0.68, predictedDelayDays: 1, status: "Monitoring" },
];

const inventory: InventoryItem[] = [
  { sku: "BRG-6205", productName: "Precision bearing 6205", location: "Aarhus DC", availableQuantity: 18, reservedQuantity: 31, reorderPoint: 40, recommendedOrderQuantity: 96, updatedAt: "2026-08-18T12:28:00Z" },
  { sku: "CTL-440A", productName: "Temperature controller", location: "Malmö Hub", availableQuantity: 7, reservedQuantity: 12, reorderPoint: 24, recommendedOrderQuantity: 48, updatedAt: "2026-08-18T12:25:00Z" },
  { sku: "PKG-210", productName: "Returnable transport box", location: "Odense DC", availableQuantity: 42, reservedQuantity: 36, reorderPoint: 50, recommendedOrderQuantity: 80, updatedAt: "2026-08-18T12:23:00Z" },
  { sku: "SNS-88X", productName: "Industrial proximity sensor", location: "Oslo Hub", availableQuantity: 56, reservedQuantity: 18, reorderPoint: 45, recommendedOrderQuantity: 0, updatedAt: "2026-08-18T12:21:00Z" },
  { sku: "VLV-316", productName: "Stainless control valve", location: "Helsinki DC", availableQuantity: 9, reservedQuantity: 14, reorderPoint: 20, recommendedOrderQuantity: 36, updatedAt: "2026-08-18T12:19:00Z" },
  { sku: "CBL-5M", productName: "Shielded signal cable 5m", location: "Aarhus DC", availableQuantity: 184, reservedQuantity: 62, reorderPoint: 100, recommendedOrderQuantity: 0, updatedAt: "2026-08-18T12:15:00Z" },
];

const predictions: PredictionInsight[] = [
  { orderId: "75274155-6950-4bc3-bc28-b26f353ed169", orderNumber: "NF-10482", delayProbability: 0.92, predictedDelayDays: 5, modelVersion: "delay-xgb-2.4.1", scoredAt: "2026-08-18T12:29:00Z", dataQualityScore: 0.98, riskFactors: [{ name: "Supplier reliability", contribution: 0.38 }, { name: "Port congestion", contribution: 0.31 }, { name: "Transit variance", contribution: 0.19 }] },
  { orderId: "493fd77f-f99a-430f-8843-0049036f608a", orderNumber: "NF-10467", delayProbability: 0.86, predictedDelayDays: 3, modelVersion: "delay-xgb-2.4.1", scoredAt: "2026-08-18T12:27:00Z", dataQualityScore: 0.94, riskFactors: [{ name: "Carrier performance", contribution: 0.34 }, { name: "Lead-time deviation", contribution: 0.27 }, { name: "Weather exposure", contribution: 0.16 }] },
  { orderId: "24776902-a8e0-4e8b-bb49-0cdd12a719ae", orderNumber: "NF-10491", delayProbability: 0.79, predictedDelayDays: 2, modelVersion: "delay-xgb-2.4.1", scoredAt: "2026-08-18T12:24:00Z", dataQualityScore: 0.96, riskFactors: [{ name: "Route volatility", contribution: 0.29 }, { name: "Supplier reliability", contribution: 0.24 }, { name: "Inventory pressure", contribution: 0.18 }] },
  { orderId: "d559d5a0-8cc6-4bc7-84d3-c700667dcbfb", orderNumber: "NF-10455", delayProbability: 0.71, predictedDelayDays: 2, modelVersion: "delay-xgb-2.4.1", scoredAt: "2026-08-18T12:20:00Z", dataQualityScore: 0.88, riskFactors: [{ name: "Missing milestone", contribution: 0.32 }, { name: "Historical variance", contribution: 0.21 }, { name: "Carrier performance", contribution: 0.12 }] },
];

const dataQuality: DataQualitySnapshot = {
  processedEvents: 18420,
  validEvents: 18154,
  quarantinedEvents: 266,
  errorRate: 0.0144,
  previousErrorRate: 0.0081,
  contractVersion: "order-event.v1.3.0",
  lastEvaluatedAt: "2026-08-18T12:31:00Z",
  lineage: [
    { name: "API ingress", status: "Healthy", eventCount: 18420, lastUpdatedAt: "2026-08-18T12:31:00Z" },
    { name: "Event Hubs", status: "Healthy", eventCount: 18420, lastUpdatedAt: "2026-08-18T12:31:00Z" },
    { name: "Bronze", status: "Healthy", eventCount: 18420, lastUpdatedAt: "2026-08-18T12:30:00Z" },
    { name: "Silver", status: "Warning", eventCount: 18154, lastUpdatedAt: "2026-08-18T12:30:00Z" },
  ],
  violations: [
    { rule: "Required value", field: "supplierId", count: 113, severity: "Critical", latestEventId: "evt-9f5e2c" },
    { rule: "Valid ISO currency", field: "currency", count: 72, severity: "Warning", latestEventId: "evt-7b41ad" },
    { rule: "Positive quantity", field: "lines[].quantity", count: 49, severity: "Critical", latestEventId: "evt-661ca0" },
    { rule: "Valid timestamp", field: "occurredAt", count: 32, severity: "Warning", latestEventId: "evt-3c92fe" },
  ],
};

const observability: ObservabilitySnapshot = {
  requestsPerMinute: 842,
  p95LatencyMs: 186,
  errorRate: 0.0038,
  availability: 0.9996,
  telemetryStatus: "Connected",
  updatedAt: "2026-08-18T12:33:00Z",
  services: [
    { name: "Orders API", status: "Healthy", p95LatencyMs: 124, errorRate: 0.0012 },
    { name: "Outbox publisher", status: "Healthy", p95LatencyMs: 96, errorRate: 0.0007 },
    { name: "Event Hubs", status: "Healthy", p95LatencyMs: 61, errorRate: 0.0003 },
    { name: "Silver pipeline", status: "Degraded", p95LatencyMs: 428, errorRate: 0.0144 },
  ],
  traces: [
    { traceId: "4bf92f3577b34da6a3ce929d0e0e4736", correlationId: "corr-10482-dk", eventId: "evt-9f5e2c", operation: "POST /api/v1/orders/events", durationMs: 142, status: "Success", startedAt: "2026-08-18T12:32:54Z" },
    { traceId: "75ac8da12b224f659a7d204c1723f87e", correlationId: "corr-10467-se", eventId: "evt-7b41ad", operation: "Outbox publish", durationMs: 88, status: "Success", startedAt: "2026-08-18T12:32:49Z" },
    { traceId: "a0916d62a27d45f0b57f3c8e7272ab20", correlationId: "corr-10491-no", eventId: "evt-661ca0", operation: "Silver validation", durationMs: 512, status: "Error", startedAt: "2026-08-18T12:32:43Z" },
    { traceId: "18e607d64b794c5fa171c647dd760718", correlationId: "corr-10455-fi", eventId: "evt-3c92fe", operation: "POST /api/v1/orders/events", durationMs: 176, status: "Success", startedAt: "2026-08-18T12:32:37Z" },
  ],
};

const operations: OperationsSnapshot = {
  activeAlerts: 4,
  criticalAlerts: 2,
  acknowledgedAlerts: 1,
  meanTimeToAcknowledgeMinutes: 7,
  alerts: [
    { id: "alert-001", title: "Quarantine error rate spike", source: "Silver validation", severity: "Critical", status: "Open", currentValue: 1.44, threshold: 1, unit: "%", owner: null, triggeredAt: "2026-08-18T12:25:00Z", correlationId: "corr-quarantine-18420" },
    { id: "alert-002", title: "Invalid order quantity volume", source: "Data contract", severity: "Critical", status: "Acknowledged", currentValue: 49, threshold: 25, unit: "events", owner: "Data Operations", triggeredAt: "2026-08-18T12:18:00Z", correlationId: "corr-contract-661ca0" },
    { id: "alert-003", title: "Silver processing latency", source: "Databricks pipeline", severity: "Warning", status: "Open", currentValue: 428, threshold: 350, unit: "ms", owner: null, triggeredAt: "2026-08-18T12:12:00Z", correlationId: null },
    { id: "alert-004", title: "Missing supplier identifiers", source: "Data contract", severity: "Warning", status: "Open", currentValue: 113, threshold: 100, unit: "events", owner: null, triggeredAt: "2026-08-18T12:05:00Z", correlationId: "corr-contract-9f5e2c" },
  ],
  rules: [
    { id: "rule-001", name: "Quarantine rate", metric: "silver.quarantine.rate", threshold: 1, unit: "%", evaluationWindowMinutes: 15, severity: "Critical", enabled: true },
    { id: "rule-002", name: "Contract violation volume", metric: "silver.contract.violations", threshold: 25, unit: "events", evaluationWindowMinutes: 10, severity: "Critical", enabled: true },
    { id: "rule-003", name: "Pipeline P95 latency", metric: "silver.pipeline.p95", threshold: 350, unit: "ms", evaluationWindowMinutes: 15, severity: "Warning", enabled: true },
  ],
};

export function createDemoNordicFlowApi(): NordicFlowApi {
  return {
    async getDashboardSummary() {
      return { totalOrders: 1284, highRiskOrders: 9, lowStockItems: 14, averageDelayProbability: 0.37, lastUpdatedAt: "2026-08-18T12:30:00Z" };
    },
    async getDelayedOrders() {
      return delayedOrders;
    },
    async getInventory() {
      return inventory;
    },
    async getPredictions() {
      return predictions;
    },
    async getDataQuality() {
      return dataQuality;
    },
    async getObservability() {
      return observability;
    },
    async getOperations() {
      return operations;
    },
  };
}
