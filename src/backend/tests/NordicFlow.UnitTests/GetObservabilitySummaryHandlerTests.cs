using NSubstitute;
using NordicFlow.Application.Abstractions;
using NordicFlow.Application.Observability;

namespace NordicFlow.UnitTests;

public sealed class GetObservabilitySummaryHandlerTests
{
    [Fact]
    public async Task HandleAsync_ValidTenant_ReturnsTenantTelemetry()
    {
        var tenantId = Guid.NewGuid();
        var expected = new ObservabilitySnapshot(
            12, 145, 0.01, 0.99, "Connected", DateTimeOffset.UtcNow, [], []);
        var query = Substitute.For<IObservabilityQuery>();
        query.GetAsync(tenantId, Arg.Any<CancellationToken>()).Returns(expected);

        var result = await new GetObservabilitySummaryHandler(query)
            .HandleAsync(tenantId, CancellationToken.None);

        Assert.Same(expected, result);
        await query.Received(1).GetAsync(tenantId, CancellationToken.None);
    }

    [Fact]
    public async Task HandleAsync_EmptyTenant_RejectsRequestWithoutQueryingTelemetry()
    {
        var query = Substitute.For<IObservabilityQuery>();
        var handler = new GetObservabilitySummaryHandler(query);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            handler.HandleAsync(Guid.Empty, CancellationToken.None));

        await query.DidNotReceiveWithAnyArgs().GetAsync(default, default);
    }
}
