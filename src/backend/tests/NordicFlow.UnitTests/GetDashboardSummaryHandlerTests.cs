using NSubstitute;
using NordicFlow.Application.Abstractions;
using NordicFlow.Application.Dashboard;

namespace NordicFlow.UnitTests;

public sealed class GetDashboardSummaryHandlerTests
{
    [Fact]
    public async Task HandleAsync_ValidTenant_ReturnsTenantSummary()
    {
        var tenantId = Guid.NewGuid();
        var expected = new DashboardSummary(42, 7, 3, 0.35m, DateTimeOffset.UtcNow);
        var query = Substitute.For<IDashboardSummaryQuery>();
        query.GetAsync(tenantId, Arg.Any<CancellationToken>()).Returns(expected);

        var result = await new GetDashboardSummaryHandler(query)
            .HandleAsync(tenantId, CancellationToken.None);

        Assert.Same(expected, result);
        await query.Received(1).GetAsync(tenantId, CancellationToken.None);
    }

    [Fact]
    public async Task HandleAsync_EmptyTenant_RejectsRequestWithoutQueryingStorage()
    {
        var query = Substitute.For<IDashboardSummaryQuery>();
        var handler = new GetDashboardSummaryHandler(query);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            handler.HandleAsync(Guid.Empty, CancellationToken.None));

        await query.DidNotReceiveWithAnyArgs()
            .GetAsync(default, default);
    }
}
