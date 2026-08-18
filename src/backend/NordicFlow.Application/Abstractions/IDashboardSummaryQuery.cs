namespace NordicFlow.Application.Abstractions;

public interface IDashboardSummaryQuery
{
    Task<DashboardSummary> GetAsync(Guid tenantId, CancellationToken cancellationToken);
}

public sealed record DashboardSummary(
    long TotalOrders,
    long HighRiskOrders,
    long LowStockItems,
    decimal AverageDelayProbability,
    DateTimeOffset? LastUpdatedAt);
