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
