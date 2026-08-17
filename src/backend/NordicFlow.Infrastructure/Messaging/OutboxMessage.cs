namespace NordicFlow.Infrastructure.Messaging;

internal sealed record OutboxMessage(
    Guid Id,
    string EventType,
    Guid TenantId,
    Guid? CorrelationId,
    string? TraceParent,
    string Payload);

