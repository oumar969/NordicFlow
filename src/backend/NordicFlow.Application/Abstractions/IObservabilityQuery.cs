namespace NordicFlow.Application.Abstractions;

public interface IObservabilityQuery
{
    Task<ObservabilitySnapshot> GetAsync(Guid tenantId, CancellationToken cancellationToken);
}

public sealed record ObservabilitySnapshot(
    int RequestsPerMinute,
    double P95LatencyMs,
    double ErrorRate,
    double Availability,
    string TelemetryStatus,
    DateTimeOffset UpdatedAt,
    IReadOnlyCollection<ServiceHealth> Services,
    IReadOnlyCollection<TraceRecord> Traces);

public sealed record ServiceHealth(
    string Name,
    string Status,
    double P95LatencyMs,
    double ErrorRate);

public sealed record TraceRecord(
    string TraceId,
    string CorrelationId,
    string EventId,
    string Operation,
    double DurationMs,
    string Status,
    DateTimeOffset StartedAt);
