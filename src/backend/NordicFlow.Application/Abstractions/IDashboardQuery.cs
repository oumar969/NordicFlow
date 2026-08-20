namespace NordicFlow.Application.Abstractions;

public interface IDashboardQuery
{
    Task<DashboardSnapshot> GetSnapshotAsync(Guid tenantId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<DelayedOrder>> GetDelayedOrdersAsync(Guid tenantId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<InventoryItem>> GetInventoryAsync(Guid tenantId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<PredictionInsight>> GetPredictionsAsync(Guid tenantId, CancellationToken cancellationToken);
}

public sealed record DashboardSnapshot(
    IReadOnlyCollection<DelayPrediction> DelayPredictions,
    IReadOnlyCollection<InventoryStatus> Inventory);

public sealed record DelayPrediction(
    Guid OrderId, string OrderNumber, decimal DelayProbability, DateTimeOffset ScoredAt);

public sealed record InventoryStatus(
    string Sku, decimal AvailableQuantity, decimal ReservedQuantity, DateTimeOffset UpdatedAt);

public sealed record DelayedOrder(
    Guid OrderId,
    string OrderNumber,
    string SupplierName,
    string Destination,
    DateOnly? RequestedDeliveryDate,
    decimal DelayProbability,
    int PredictedDelayDays,
    string Status);

public sealed record InventoryItem(
    string Sku,
    string ProductName,
    string Location,
    decimal AvailableQuantity,
    decimal ReservedQuantity,
    decimal ReorderPoint,
    decimal RecommendedOrderQuantity,
    DateTimeOffset UpdatedAt);

public sealed record PredictionInsight(
    Guid OrderId,
    string OrderNumber,
    decimal DelayProbability,
    int PredictedDelayDays,
    string ModelVersion,
    DateTimeOffset ScoredAt,
    decimal DataQualityScore,
    IReadOnlyCollection<RiskFactor> RiskFactors);

public sealed record RiskFactor(string Name, decimal Contribution);
