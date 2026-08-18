import type { DelayedOrder, NordicFlowApi } from "./nordicFlowApi";

const delayedOrders: DelayedOrder[] = [
  { orderId: "75274155-6950-4bc3-bc28-b26f353ed169", orderNumber: "NF-10482", supplierName: "Baltic Components", destination: "Aarhus, DK", requestedDeliveryDate: "2026-08-19", delayProbability: 0.92, predictedDelayDays: 5, status: "Delayed" },
  { orderId: "493fd77f-f99a-430f-8843-0049036f608a", orderNumber: "NF-10467", supplierName: "NordSteel AB", destination: "Malmö, SE", requestedDeliveryDate: "2026-08-20", delayProbability: 0.86, predictedDelayDays: 3, status: "At risk" },
  { orderId: "24776902-a8e0-4e8b-bb49-0cdd12a719ae", orderNumber: "NF-10491", supplierName: "Fjord Logistics", destination: "Oslo, NO", requestedDeliveryDate: "2026-08-21", delayProbability: 0.79, predictedDelayDays: 2, status: "At risk" },
  { orderId: "d559d5a0-8cc6-4bc7-84d3-c700667dcbfb", orderNumber: "NF-10455", supplierName: "Arctic Packaging", destination: "Helsinki, FI", requestedDeliveryDate: "2026-08-22", delayProbability: 0.71, predictedDelayDays: 2, status: "Monitoring" },
  { orderId: "4e066f28-babf-4df4-913d-2e2a53e7e51c", orderNumber: "NF-10438", supplierName: "Baltic Components", destination: "Odense, DK", requestedDeliveryDate: "2026-08-24", delayProbability: 0.68, predictedDelayDays: 1, status: "Monitoring" },
];

export function createDemoNordicFlowApi(): NordicFlowApi {
  return {
    async getDashboardSummary() {
      return { totalOrders: 1284, highRiskOrders: 9, lowStockItems: 14, averageDelayProbability: 0.37, lastUpdatedAt: "2026-08-18T12:30:00Z" };
    },
    async getDelayedOrders() {
      return delayedOrders;
    },
  };
}
