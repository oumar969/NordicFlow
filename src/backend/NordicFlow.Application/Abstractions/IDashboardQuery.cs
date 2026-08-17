namespace NordicFlow.Application.Abstractions;

public interface IDashboardQuery
{
    Task<DashboardSnapshot> GetSnapshotAsync(Guid tenantId, CancellationToken cancellationToken);
}

public sealed record DashboardSnapshot(
    IReadOnlyCollection<DelayPrediction> DelayPredictions,
    IReadOnlyCollection<InventoryStatus> Inventory);

public sealed record DelayPrediction(
    Guid OrderId, string OrderNumber, decimal DelayProbability, DateTimeOffset ScoredAt);

public sealed record InventoryStatus(
    string Sku, decimal AvailableQuantity, decimal ReservedQuantity, DateTimeOffset UpdatedAt);

