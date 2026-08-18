using NSubstitute;
using NordicFlow.Application.Abstractions;
using NordicFlow.Application.DataQuality;

namespace NordicFlow.UnitTests;

public sealed class GetDataQualitySummaryHandlerTests
{
    [Fact]
    public async Task HandleAsync_ValidTenant_ReturnsLatestQualitySnapshot()
    {
        var tenantId = Guid.NewGuid();
        var expected = new DataQualitySnapshot(100, 98, 2, 0.02, 0.01,
            "order-event.v1", DateTimeOffset.UtcNow, [], []);
        var query = Substitute.For<IDataQualityQuery>();
        query.GetAsync(tenantId, Arg.Any<CancellationToken>()).Returns(expected);

        var result = await new GetDataQualitySummaryHandler(query)
            .HandleAsync(tenantId, CancellationToken.None);

        Assert.Same(expected, result);
        await query.Received(1).GetAsync(tenantId, CancellationToken.None);
    }

    [Fact]
    public async Task HandleAsync_EmptyTenant_RejectsRequest()
    {
        var query = Substitute.For<IDataQualityQuery>();
        await Assert.ThrowsAsync<ArgumentException>(() =>
            new GetDataQualitySummaryHandler(query).HandleAsync(Guid.Empty, CancellationToken.None));
        await query.DidNotReceiveWithAnyArgs().GetAsync(default, default);
    }
}
