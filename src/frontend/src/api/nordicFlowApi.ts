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

export interface NordicFlowApi {
  getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary>;
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
