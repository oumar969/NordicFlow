import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard";
import type { NordicFlowApi } from "./api/nordicFlowApi";

describe("Dashboard", () => {
  it("renders the tenant summary returned by the API", async () => {
    const api: NordicFlowApi = { getDashboardSummary: vi.fn().mockResolvedValue({
      totalOrders: 128, highRiskOrders: 9, lowStockItems: 4,
      averageDelayProbability: 0.37, lastUpdatedAt: "2026-08-18T08:30:00Z",
    }) };
    render(<Dashboard api={api} />);
    expect(await screen.findByText("128")).toBeInTheDocument();
    expect(screen.getByText("9 orders at high delay risk")).toBeInTheDocument();
    expect(screen.getAllByText("37%")).toHaveLength(2);
  });

  it("shows an error state when the API is unavailable", async () => {
    const api: NordicFlowApi = { getDashboardSummary: vi.fn().mockRejectedValue(new Error("offline")) };
    render(<Dashboard api={api} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
  });
});
