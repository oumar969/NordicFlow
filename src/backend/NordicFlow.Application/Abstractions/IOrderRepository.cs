using NordicFlow.Domain.Orders;

namespace NordicFlow.Application.Abstractions;

public interface IOrderRepository
{
    Task<bool> EventExistsAsync(Guid eventId, CancellationToken cancellationToken);
    Task AddAsync(
        Order order,
        OrderCreatedIntegrationEvent integrationEvent,
        CancellationToken cancellationToken);
}

public sealed record OrderCreatedIntegrationEvent(
    Guid EventId,
    string EventType,
    int SchemaVersion,
    DateTimeOffset OccurredAt,
    string Source,
    Guid TenantId,
    Guid? CorrelationId,
    string? TraceParent,
    OrderCreatedIntegrationData Data);

public sealed record OrderCreatedIntegrationData(
    Guid OrderId,
    string OrderNumber,
    Guid CustomerId,
    string Currency,
    long TotalAmountMinor,
    DateOnly? RequestedDeliveryDate,
    IReadOnlyCollection<OrderCreatedIntegrationLine> Lines);

public sealed record OrderCreatedIntegrationLine(
    int LineNumber, string Sku, decimal Quantity, long UnitPriceMinor);
