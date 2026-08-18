namespace NordicFlow.Application.Abstractions;

public interface IDataQualityQuery
{
    Task<DataQualitySnapshot> GetAsync(Guid tenantId, CancellationToken cancellationToken);
}

public sealed record DataQualitySnapshot(
    long ProcessedEvents,
    long ValidEvents,
    long QuarantinedEvents,
    double ErrorRate,
    double PreviousErrorRate,
    string ContractVersion,
    DateTimeOffset LastEvaluatedAt,
    IReadOnlyCollection<DataLineageStage> Lineage,
    IReadOnlyCollection<DataContractViolation> Violations);

public sealed record DataLineageStage(
    string Name,
    string Status,
    long EventCount,
    DateTimeOffset LastUpdatedAt);

public sealed record DataContractViolation(
    string Rule,
    string Field,
    long Count,
    string Severity,
    string LatestEventId);
