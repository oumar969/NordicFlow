import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard";
import type { NordicFlowApi } from "./api/nordicFlowApi";

describe("Dashboard", () => {
  it("renders the tenant summary returned by the API", async () => {
    const api: NordicFlowApi = { getDashboardSummary: vi.fn().mockResolvedValue({
      totalOrders: 128, highRiskOrders: 9, lowStockItems: 4,
      averageDelayProbability: 0.37, lastUpdatedAt: "2026-08-18T08:30:00Z",
    }), getDelayedOrders: vi.fn().mockResolvedValue([]) };
    render(<Dashboard api={api} />);
    expect(await screen.findByText("128")).toBeInTheDocument();
    expect(screen.getByText("9 orders at high delay risk")).toBeInTheDocument();
    expect(screen.getAllByText("37%")).toHaveLength(2);
  });

  it("shows an error state when the API is unavailable", async () => {
    const api: NordicFlowApi = { getDashboardSummary: vi.fn().mockRejectedValue(new Error("offline")), getDelayedOrders: vi.fn().mockResolvedValue([]) };
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
    };
    render(<Dashboard api={api} />);
    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    expect(await screen.findByText("NF-100")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Risk level"), { target: { value: "critical" } });
    expect(screen.getByText("NF-100")).toBeInTheDocument();
    expect(screen.queryByText("NF-101")).not.toBeInTheDocument();
  });
});
