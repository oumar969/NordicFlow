import type { DelayedOrder, InventoryItem, NordicFlowApi, PredictionInsight } from "./nordicFlowApi";

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
  };
}
