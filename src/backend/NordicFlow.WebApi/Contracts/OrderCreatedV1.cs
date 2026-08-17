using System.ComponentModel.DataAnnotations;

namespace NordicFlow.WebApi.Contracts;

public sealed record OrderCreatedV1(
    Guid EventId,
    string EventType,
    int SchemaVersion,
    DateTimeOffset OccurredAt,
    [property: Required, StringLength(100, MinimumLength = 1)] string Source,
    Guid TenantId,
    Guid? CorrelationId,
    [property: Required] OrderDataV1 Data);

public sealed record OrderDataV1(
    Guid OrderId,
    [property: Required, StringLength(50, MinimumLength = 1)] string OrderNumber,
    Guid CustomerId,
    [property: Required, RegularExpression("^[A-Z]{3}$")] string Currency,
    [property: Range(0, long.MaxValue)] long TotalAmountMinor,
    DateOnly? RequestedDeliveryDate,
    [property: Required, MinLength(1)] IReadOnlyCollection<OrderLineV1> Lines);

public sealed record OrderLineV1(
    [property: Range(1, int.MaxValue)] int LineNumber,
    [property: Required, StringLength(100, MinimumLength = 1)] string Sku,
    [property: Range(typeof(decimal), "0.0000001", "79228162514264337593543950335")]
    decimal Quantity,
    [property: Range(0, long.MaxValue)] long UnitPriceMinor);

