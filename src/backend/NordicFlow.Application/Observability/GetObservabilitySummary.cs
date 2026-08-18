using NordicFlow.Application.Abstractions;

namespace NordicFlow.Application.Observability;

public sealed class GetObservabilitySummaryHandler(IObservabilityQuery query)
{
    public Task<ObservabilitySnapshot> HandleAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("Tenant identifier is required.", nameof(tenantId));

        return query.GetAsync(tenantId, cancellationToken);
    }
}
