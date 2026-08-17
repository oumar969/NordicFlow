using NordicFlow.Domain.Orders;

namespace NordicFlow.UnitTests;

public sealed class OrderTests
{
    [Fact]
    public void Create_RejectsDuplicateLineNumbers()
    {
        var lines = new[]
        {
            OrderLine.Create(1, "SKU-1", 1, 100),
            OrderLine.Create(1, "SKU-2", 2, 200)
        };

        var action = () => Order.Create(
            Guid.NewGuid(), Guid.NewGuid(), "ORDER-1", Guid.NewGuid(), "DKK",
            500, null, lines, DateTimeOffset.UtcNow);

        Assert.Throws<DomainException>(action);
    }

    [Fact]
    public void CreateLine_RejectsNonPositiveQuantity() =>
        Assert.Throws<DomainException>(() => OrderLine.Create(1, "SKU-1", 0, 100));
}
