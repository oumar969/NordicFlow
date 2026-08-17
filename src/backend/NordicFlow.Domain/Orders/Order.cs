namespace NordicFlow.Domain.Orders;

public sealed class Order
{
    private readonly List<OrderLine> _lines;

    private Order(
        Guid id,
        Guid tenantId,
        string orderNumber,
        Guid customerId,
        string currency,
        long totalAmountMinor,
        DateOnly? requestedDeliveryDate,
        IEnumerable<OrderLine> lines,
        DateTimeOffset createdAt)
    {
        if (id == Guid.Empty || tenantId == Guid.Empty || customerId == Guid.Empty)
            throw new DomainException("Order, tenant and customer identifiers are required.");
        if (string.IsNullOrWhiteSpace(orderNumber) || orderNumber.Length > 50)
            throw new DomainException("Order number must contain 1-50 characters.");
        if (currency.Length != 3 || currency.Any(c => !char.IsAsciiLetterUpper(c)))
            throw new DomainException("Currency must be an uppercase ISO 4217 code.");
        if (totalAmountMinor < 0)
            throw new DomainException("Total amount cannot be negative.");

        _lines = lines.ToList();
        if (_lines.Count == 0)
            throw new DomainException("An order must have at least one line.");
        if (_lines.Select(line => line.LineNumber).Distinct().Count() != _lines.Count)
            throw new DomainException("Order line numbers must be unique.");

        Id = id;
        TenantId = tenantId;
        OrderNumber = orderNumber;
        CustomerId = customerId;
        Currency = currency;
        TotalAmountMinor = totalAmountMinor;
        RequestedDeliveryDate = requestedDeliveryDate;
        CreatedAt = createdAt;
    }

    public Guid Id { get; }
    public Guid TenantId { get; }
    public string OrderNumber { get; }
    public Guid CustomerId { get; }
    public string Currency { get; }
    public long TotalAmountMinor { get; }
    public DateOnly? RequestedDeliveryDate { get; }
    public DateTimeOffset CreatedAt { get; }
    public IReadOnlyCollection<OrderLine> Lines => _lines.AsReadOnly();

    public static Order Create(
        Guid id, Guid tenantId, string orderNumber, Guid customerId, string currency,
        long totalAmountMinor, DateOnly? requestedDeliveryDate,
        IEnumerable<OrderLine> lines, DateTimeOffset createdAt) =>
        new(id, tenantId, orderNumber.Trim(), customerId, currency, totalAmountMinor,
            requestedDeliveryDate, lines, createdAt);
}

public sealed record OrderLine
{
    private OrderLine(int lineNumber, string sku, decimal quantity, long unitPriceMinor) =>
        (LineNumber, Sku, Quantity, UnitPriceMinor) = (lineNumber, sku, quantity, unitPriceMinor);

    public int LineNumber { get; }
    public string Sku { get; }
    public decimal Quantity { get; }
    public long UnitPriceMinor { get; }

    public static OrderLine Create(int lineNumber, string sku, decimal quantity, long unitPriceMinor)
    {
        if (lineNumber < 1) throw new DomainException("Line number must be positive.");
        if (string.IsNullOrWhiteSpace(sku) || sku.Length > 100)
            throw new DomainException("SKU must contain 1-100 characters.");
        if (quantity <= 0) throw new DomainException("Quantity must be positive.");
        if (unitPriceMinor < 0) throw new DomainException("Unit price cannot be negative.");
        return new(lineNumber, sku.Trim(), quantity, unitPriceMinor);
    }
}

public sealed class DomainException(string message) : Exception(message);

