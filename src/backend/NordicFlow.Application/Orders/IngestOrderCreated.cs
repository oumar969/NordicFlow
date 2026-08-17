using NordicFlow.Application.Abstractions;
using NordicFlow.Domain.Orders;

namespace NordicFlow.Application.Orders;

public sealed record IngestOrderCreatedCommand(
    Guid EventId,
    string Source,
    Guid? CorrelationId,
    string? TraceParent,
    Guid TenantId,
    DateTimeOffset OccurredAt,
    Guid OrderId,
    string OrderNumber,
    Guid CustomerId,
    string Currency,
    long TotalAmountMinor,
    DateOnly? RequestedDeliveryDate,
    IReadOnlyCollection<IngestOrderLine> Lines);

public sealed record IngestOrderLine(int LineNumber, string Sku, decimal Quantity, long UnitPriceMinor);
public sealed record IngestOrderCreatedResult(Guid OrderId, bool WasDuplicate);

public sealed class IngestOrderCreatedHandler(IOrderRepository repository)
{
    public async Task<IngestOrderCreatedResult> HandleAsync(
        IngestOrderCreatedCommand command,
        CancellationToken cancellationToken)
    {
        if (await repository.EventExistsAsync(command.EventId, cancellationToken))
            return new(command.OrderId, true);

        var lines = command.Lines.Select(line =>
            OrderLine.Create(line.LineNumber, line.Sku, line.Quantity, line.UnitPriceMinor));
        var order = Order.Create(
            command.OrderId, command.TenantId, command.OrderNumber, command.CustomerId,
            command.Currency, command.TotalAmountMinor, command.RequestedDeliveryDate,
            lines, command.OccurredAt);

        var integrationEvent = new OrderCreatedIntegrationEvent(
            command.EventId,
            "nordicflow.order.created.v1",
            1,
            command.OccurredAt,
            command.Source,
            command.TenantId,
            command.CorrelationId,
            command.TraceParent,
            new(
                order.Id,
                order.OrderNumber,
                order.CustomerId,
                order.Currency,
                order.TotalAmountMinor,
                order.RequestedDeliveryDate,
                order.Lines.Select(line => new OrderCreatedIntegrationLine(
                    line.LineNumber, line.Sku, line.Quantity, line.UnitPriceMinor)).ToArray()));

        await repository.AddAsync(order, integrationEvent, cancellationToken);
        return new(order.Id, false);
    }
}
