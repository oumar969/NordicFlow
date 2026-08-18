using NSubstitute;
using NordicFlow.Application.Abstractions;
using NordicFlow.Application.Operations;

namespace NordicFlow.UnitTests;

public sealed class GetOperationsSummaryHandlerTests
{
    [Fact]
    public async Task HandleAsync_ValidTenant_ReturnsOperationalAlerts()
    {
        var tenantId = Guid.NewGuid();
        var expected = new OperationsSnapshot(2, 1, 1, 7, [], []);
        var query = Substitute.For<IOperationsQuery>();
        query.GetAsync(tenantId, Arg.Any<CancellationToken>()).Returns(expected);

        var result = await new GetOperationsSummaryHandler(query)
            .HandleAsync(tenantId, CancellationToken.None);

        Assert.Same(expected, result);
        await query.Received(1).GetAsync(tenantId, CancellationToken.None);
    }

    [Fact]
    public async Task HandleAsync_EmptyTenant_RejectsRequest()
    {
        var query = Substitute.For<IOperationsQuery>();
        await Assert.ThrowsAsync<ArgumentException>(() =>
            new GetOperationsSummaryHandler(query).HandleAsync(Guid.Empty, CancellationToken.None));
        await query.DidNotReceiveWithAnyArgs().GetAsync(default, default);
    }
}
