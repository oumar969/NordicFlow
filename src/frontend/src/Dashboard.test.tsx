import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard";
import type { NordicFlowApi } from "./api/nordicFlowApi";

describe("Dashboard", () => {
  it("renders the tenant summary returned by the API", async () => {
    const api: NordicFlowApi = { getDashboardSummary: vi.fn().mockResolvedValue({
      totalOrders: 128, highRiskOrders: 9, lowStockItems: 4,
      averageDelayProbability: 0.37, lastUpdatedAt: "2026-08-18T08:30:00Z",
    }), getDelayedOrders: vi.fn().mockResolvedValue([]), getInventory: vi.fn().mockResolvedValue([]), getPredictions: vi.fn().mockResolvedValue([]), getDataQuality: vi.fn() };
    render(<Dashboard api={api} />);
    expect(await screen.findByText("128")).toBeInTheDocument();
    expect(screen.getByText("9 orders at high delay risk")).toBeInTheDocument();
    expect(screen.getAllByText("37%")).toHaveLength(2);
  });

  it("shows an error state when the API is unavailable", async () => {
    const api: NordicFlowApi = { getDashboardSummary: vi.fn().mockRejectedValue(new Error("offline")), getDelayedOrders: vi.fn().mockResolvedValue([]), getInventory: vi.fn().mockResolvedValue([]), getPredictions: vi.fn().mockResolvedValue([]), getDataQuality: vi.fn() };
    render(<Dashboard api={api} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
  });

  it("opens and filters the delayed-order intervention queue", async () => {
    const api: NordicFlowApi = {
      getDashboardSummary: vi.fn().mockResolvedValue({ totalOrders: 2, highRiskOrders: 2, lowStockItems: 0, averageDelayProbability: 0.8, lastUpdatedAt: null }),
      getDelayedOrders: vi.fn().mockResolvedValue([
        { orderId: "order-1", orderNumber: "NF-100", supplierName: "NordSteel", destination: "Malmö", requestedDeliveryDate: "2026-08-20", delayProbability: 0.9, predictedDelayDays: 4, status: "Delayed" },
        { orderId: "order-2", orderNumber: "NF-101", supplierName: "Fjord", destination: "Oslo", requestedDeliveryDate: "2026-08-21", delayProbability: 0.74, predictedDelayDays: 2, status: "At risk" },
      ]),
      getInventory: vi.fn().mockResolvedValue([]),
      getPredictions: vi.fn().mockResolvedValue([]),
      getDataQuality: vi.fn(),
    };
    render(<Dashboard api={api} />);
    await screen.findByText("2 orders at high delay risk");
    fireEvent.click(screen.getAllByRole("button", { name: "Review" })[0]);
    expect(await screen.findByText("NF-100")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Risk level"), { target: { value: "critical" } });
    expect(screen.getByText("NF-100")).toBeInTheDocument();
    expect(screen.queryByText("NF-101")).not.toBeInTheDocument();
  });

  it("opens and filters the inventory workspace", async () => {
    const api: NordicFlowApi = {
      getDashboardSummary: vi.fn().mockResolvedValue({ totalOrders: 2, highRiskOrders: 0, lowStockItems: 1, averageDelayProbability: 0.1, lastUpdatedAt: null }),
      getDelayedOrders: vi.fn().mockResolvedValue([]),
      getInventory: vi.fn().mockResolvedValue([
        { sku: "CRIT-1", productName: "Critical part", location: "Aarhus", availableQuantity: 2, reservedQuantity: 4, reorderPoint: 10, recommendedOrderQuantity: 20, updatedAt: "2026-08-18T08:00:00Z" },
        { sku: "OK-1", productName: "Healthy part", location: "Oslo", availableQuantity: 40, reservedQuantity: 5, reorderPoint: 20, recommendedOrderQuantity: 0, updatedAt: "2026-08-18T08:00:00Z" },
      ]),
      getPredictions: vi.fn().mockResolvedValue([]),
      getDataQuality: vi.fn(),
    };
    render(<Dashboard api={api} />);
    fireEvent.click(screen.getByRole("button", { name: "Inventory" }));
    expect(await screen.findByText("CRIT-1")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Stock status"), { target: { value: "critical" } });
    expect(screen.getByText("CRIT-1")).toBeInTheDocument();
    expect(screen.queryByText("OK-1")).not.toBeInTheDocument();
  });

  it("shows explainable prediction factors and filters model risk", async () => {
    const api: NordicFlowApi = {
      getDashboardSummary: vi.fn().mockResolvedValue({ totalOrders: 1, highRiskOrders: 1, lowStockItems: 0, averageDelayProbability: 0.91, lastUpdatedAt: null }),
      getDelayedOrders: vi.fn().mockResolvedValue([]),
      getInventory: vi.fn().mockResolvedValue([]),
      getPredictions: vi.fn().mockResolvedValue([
        { orderId: "p-1", orderNumber: "NF-PRED-1", delayProbability: 0.91, predictedDelayDays: 5, modelVersion: "delay-xgb-2.4.1", scoredAt: "2026-08-18T08:00:00Z", dataQualityScore: 0.98, riskFactors: [{ name: "Port congestion", contribution: 0.38 }] },
        { orderId: "p-2", orderNumber: "NF-PRED-2", delayProbability: 0.75, predictedDelayDays: 2, modelVersion: "delay-xgb-2.4.1", scoredAt: "2026-08-18T08:00:00Z", dataQualityScore: 0.92, riskFactors: [{ name: "Carrier variance", contribution: 0.2 }] },
      ]),
      getDataQuality: vi.fn(),
    };
    render(<Dashboard api={api} />);
    fireEvent.click(screen.getByRole("button", { name: "Predictions" }));
    expect(await screen.findByText("Port congestion")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Risk level"), { target: { value: "critical" } });
    expect(screen.getAllByText("NF-PRED-1")).toHaveLength(2);
    expect(screen.queryByText("NF-PRED-2")).not.toBeInTheDocument();
  });

  it("shows lineage and quarantine contract violations", async () => {
    const api: NordicFlowApi = {
      getDashboardSummary: vi.fn().mockResolvedValue({ totalOrders: 1, highRiskOrders: 0, lowStockItems: 0, averageDelayProbability: 0.1, lastUpdatedAt: null }),
      getDelayedOrders: vi.fn().mockResolvedValue([]), getInventory: vi.fn().mockResolvedValue([]), getPredictions: vi.fn().mockResolvedValue([]),
      getDataQuality: vi.fn().mockResolvedValue({
        processedEvents: 1000, validEvents: 980, quarantinedEvents: 20, errorRate: 0.02, previousErrorRate: 0.01,
        contractVersion: "order-event.v1", lastEvaluatedAt: "2026-08-18T08:00:00Z",
        lineage: [{ name: "Bronze", status: "Healthy", eventCount: 1000, lastUpdatedAt: "2026-08-18T08:00:00Z" }, { name: "Silver", status: "Warning", eventCount: 980, lastUpdatedAt: "2026-08-18T08:00:00Z" }],
        violations: [{ rule: "Required value", field: "supplierId", count: 20, severity: "Critical", latestEventId: "evt-1" }],
      }),
    };
    render(<Dashboard api={api} />);
    fireEvent.click(screen.getByRole("button", { name: "Data quality" }));
    expect(await screen.findByText("Required value")).toBeInTheDocument();
    expect(screen.getByText("supplierId")).toBeInTheDocument();
    expect(screen.getByText("Silver")).toBeInTheDocument();
    expect(screen.getByText("2.00%")).toBeInTheDocument();
  });
});
