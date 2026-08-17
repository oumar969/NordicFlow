using NSubstitute;
using NordicFlow.Application.Abstractions;
using NordicFlow.Application.Orders;

namespace NordicFlow.UnitTests;

public sealed class IngestOrderCreatedHandlerTests
{
    [Fact]
    public async Task HandleAsync_DuplicateEvent_DoesNotInsertAgain()
    {
        var repository = Substitute.For<IOrderRepository>();
        var command = ValidCommand();
        repository.EventExistsAsync(command.EventId, Arg.Any<CancellationToken>()).Returns(true);

        var result = await new IngestOrderCreatedHandler(repository)
            .HandleAsync(command, CancellationToken.None);

        Assert.True(result.WasDuplicate);
        await repository.DidNotReceive().AddAsync(
            Arg.Any<NordicFlow.Domain.Orders.Order>(),
            Arg.Any<OrderCreatedIntegrationEvent>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_ValidEvent_PersistsOrderAndOutboxEvent()
    {
        var repository = Substitute.For<IOrderRepository>();
        var command = ValidCommand();

        var result = await new IngestOrderCreatedHandler(repository)
            .HandleAsync(command, CancellationToken.None);

        Assert.False(result.WasDuplicate);
        await repository.Received(1).AddAsync(
            Arg.Is<NordicFlow.Domain.Orders.Order>(order =>
                order != null && order.Id == command.OrderId),
            Arg.Is<OrderCreatedIntegrationEvent>(message =>
                message != null && message.EventId == command.EventId &&
                message.TraceParent == command.TraceParent),
            Arg.Any<CancellationToken>());
    }

    private static IngestOrderCreatedCommand ValidCommand() => new(
        Guid.NewGuid(), "test-suite", Guid.NewGuid(),
        "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
        Guid.NewGuid(), DateTimeOffset.UtcNow, Guid.NewGuid(), "ORDER-1",
        Guid.NewGuid(), "DKK", 100, null, [new(1, "SKU-1", 1, 100)]);
}
