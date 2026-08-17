using NordicFlow.Application.Orders;
using NordicFlow.WebApi.Contracts;
using System.Diagnostics;

namespace NordicFlow.WebApi.Endpoints;

public static class OrderEndpoints
{
    public static IEndpointRouteBuilder MapOrderEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/v1/orders/events", IngestOrderCreatedAsync)
            .WithName("IngestOrderCreatedV1")
            .RequireAuthorization("orders:write")
            .Produces(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status200OK)
            .ProducesValidationProblem();
        return endpoints;
    }

    private static async Task<IResult> IngestOrderCreatedAsync(
        OrderCreatedV1 request,
        IngestOrderCreatedHandler handler,
        CancellationToken cancellationToken)
    {
        Activity.Current?.SetTag("nordicflow.event.id", request.EventId);
        Activity.Current?.SetTag("nordicflow.correlation.id", request.CorrelationId);
        Activity.Current?.SetTag("nordicflow.tenant.id", request.TenantId);
        Activity.Current?.SetTag("messaging.message.type", request.EventType);

        if (request.EventType != "nordicflow.order.created.v1" || request.SchemaVersion != 1)
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["eventType"] = ["Only nordicflow.order.created.v1 schema version 1 is supported."]
            });

        var command = new IngestOrderCreatedCommand(
            request.EventId, request.Source, request.CorrelationId, Activity.Current?.Id,
            request.TenantId, request.OccurredAt, request.Data.OrderId,
            request.Data.OrderNumber, request.Data.CustomerId, request.Data.Currency,
            request.Data.TotalAmountMinor, request.Data.RequestedDeliveryDate,
            request.Data.Lines.Select(line => new IngestOrderLine(
                line.LineNumber, line.Sku, line.Quantity, line.UnitPriceMinor)).ToArray());

        var result = await handler.HandleAsync(command, cancellationToken);
        var location = $"/api/v1/orders/{result.OrderId}";
        return result.WasDuplicate
            ? Results.Ok(new { result.OrderId, duplicate = true })
            : Results.Created(location, new { result.OrderId, duplicate = false });
    }
}
