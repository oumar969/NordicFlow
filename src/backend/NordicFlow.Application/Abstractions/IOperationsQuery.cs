namespace NordicFlow.Application.Abstractions;

public interface IOperationsQuery
{
    Task<OperationsSnapshot> GetAsync(Guid tenantId, CancellationToken cancellationToken);
}

public sealed record OperationsSnapshot(
    long ActiveAlerts,
    long CriticalAlerts,
    long AcknowledgedAlerts,
    double MeanTimeToAcknowledgeMinutes,
    IReadOnlyCollection<OperationsAlert> Alerts,
    IReadOnlyCollection<AlertRule> Rules);

public sealed record OperationsAlert(
    Guid Id,
    string Title,
    string Source,
    string Severity,
    string Status,
    double CurrentValue,
    double Threshold,
    string Unit,
    string? Owner,
    DateTimeOffset TriggeredAt,
    string? CorrelationId);

public sealed record AlertRule(
    Guid Id,
    string Name,
    string Metric,
    double Threshold,
    string Unit,
    int EvaluationWindowMinutes,
    string Severity,
    bool Enabled);
