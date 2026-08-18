export interface DelayPrediction {
  orderId: string;
  orderNumber: string;
  delayProbability: number;
  scoredAt: string;
}

export interface InventoryStatus {
  sku: string;
  availableQuantity: number;
  reservedQuantity: number;
  updatedAt: string;
}

export interface DashboardSnapshot {
  delayPredictions: DelayPrediction[];
  inventory: InventoryStatus[];
}

export interface DashboardSummary {
  totalOrders: number;
  highRiskOrders: number;
  lowStockItems: number;
  averageDelayProbability: number;
  lastUpdatedAt: string | null;
}

export interface DelayedOrder {
  orderId: string;
  orderNumber: string;
  supplierName: string;
  destination: string;
  requestedDeliveryDate: string;
  delayProbability: number;
  predictedDelayDays: number;
  status: "At risk" | "Delayed" | "Monitoring";
}

export interface InventoryItem {
  sku: string;
  productName: string;
  location: string;
  availableQuantity: number;
  reservedQuantity: number;
  reorderPoint: number;
  recommendedOrderQuantity: number;
  updatedAt: string;
}

export interface PredictionInsight {
  orderId: string;
  orderNumber: string;
  delayProbability: number;
  predictedDelayDays: number;
  modelVersion: string;
  scoredAt: string;
  dataQualityScore: number;
  riskFactors: { name: string; contribution: number }[];
}

export interface DataQualitySnapshot {
  processedEvents: number;
  validEvents: number;
  quarantinedEvents: number;
  errorRate: number;
  previousErrorRate: number;
  contractVersion: string;
  lastEvaluatedAt: string;
  lineage: DataLineageStage[];
  violations: DataContractViolation[];
}

export interface DataLineageStage {
  name: string;
  status: "Healthy" | "Warning" | "Failed";
  eventCount: number;
  lastUpdatedAt: string;
}

export interface DataContractViolation {
  rule: string;
  field: string;
  count: number;
  severity: "Critical" | "Warning";
  latestEventId: string;
}

export interface ObservabilitySnapshot {
  requestsPerMinute: number;
  p95LatencyMs: number;
  errorRate: number;
  availability: number;
  telemetryStatus: "Connected" | "Degraded" | "Disconnected";
  updatedAt: string;
  services: ServiceHealth[];
  traces: TraceRecord[];
}

export interface ServiceHealth {
  name: string;
  status: "Healthy" | "Degraded" | "Unavailable";
  p95LatencyMs: number;
  errorRate: number;
}

export interface TraceRecord {
  traceId: string;
  correlationId: string;
  eventId: string;
  operation: string;
  durationMs: number;
  status: "Success" | "Error";
  startedAt: string;
}

export interface NordicFlowApi {
  getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary>;
  getDelayedOrders(signal?: AbortSignal): Promise<DelayedOrder[]>;
  getInventory(signal?: AbortSignal): Promise<InventoryItem[]>;
  getPredictions(signal?: AbortSignal): Promise<PredictionInsight[]>;
  getDataQuality(signal?: AbortSignal): Promise<DataQualitySnapshot>;
  getObservability(signal?: AbortSignal): Promise<ObservabilitySnapshot>;
}

export function createNordicFlowApi(
  apiBaseUrl: string,
  getAccessToken: () => Promise<string>,
): NordicFlowApi {
  return {
    async getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
      const accessToken = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/api/v1/dashboard/summary`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      if (!response.ok)
        throw new Error(`Dashboard summary request failed (${response.status})`);
      return response.json() as Promise<DashboardSummary>;
    },
    async getDelayedOrders(signal?: AbortSignal): Promise<DelayedOrder[]> {
      const accessToken = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/api/v1/orders/delayed`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      if (!response.ok)
        throw new Error(`Delayed orders request failed (${response.status})`);
      return response.json() as Promise<DelayedOrder[]>;
    },
    async getInventory(signal?: AbortSignal): Promise<InventoryItem[]> {
      const accessToken = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/api/v1/inventory/status`, {
        headers: { Authorization: `Bearer ${accessToken}` }, signal,
      });
      if (!response.ok) throw new Error(`Inventory request failed (${response.status})`);
      return response.json() as Promise<InventoryItem[]>;
    },
    async getPredictions(signal?: AbortSignal): Promise<PredictionInsight[]> {
      const accessToken = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/api/v1/predictions/delays`, {
        headers: { Authorization: `Bearer ${accessToken}` }, signal,
      });
      if (!response.ok) throw new Error(`Predictions request failed (${response.status})`);
      return response.json() as Promise<PredictionInsight[]>;
    },
    async getDataQuality(signal?: AbortSignal): Promise<DataQualitySnapshot> {
      const accessToken = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/api/v1/data-quality/summary`, {
        headers: { Authorization: `Bearer ${accessToken}` }, signal,
      });
      if (!response.ok) throw new Error(`Data quality request failed (${response.status})`);
      return response.json() as Promise<DataQualitySnapshot>;
    },
    async getObservability(signal?: AbortSignal): Promise<ObservabilitySnapshot> {
      const accessToken = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/api/v1/observability/summary`, {
        headers: { Authorization: `Bearer ${accessToken}` }, signal,
      });
      if (!response.ok) throw new Error(`Observability request failed (${response.status})`);
      return response.json() as Promise<ObservabilitySnapshot>;
    },
  };
}

export async function getDashboardSnapshot(
  apiBaseUrl: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<DashboardSnapshot> {
  const response = await fetch(`${apiBaseUrl}/api/v1/dashboard/snapshot`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  if (!response.ok) throw new Error(`Dashboard request failed (${response.status})`);
  return response.json() as Promise<DashboardSnapshot>;
}
