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

export interface NordicFlowApi {
  getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary>;
  getDelayedOrders(signal?: AbortSignal): Promise<DelayedOrder[]>;
  getInventory(signal?: AbortSignal): Promise<InventoryItem[]>;
  getPredictions(signal?: AbortSignal): Promise<PredictionInsight[]>;
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
