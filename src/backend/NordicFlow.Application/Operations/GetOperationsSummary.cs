using NordicFlow.Application.Abstractions;

namespace NordicFlow.Application.Operations;

public sealed class GetOperationsSummaryHandler(IOperationsQuery query)
{
    public Task<OperationsSnapshot> HandleAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("Tenant identifier is required.", nameof(tenantId));
        return query.GetAsync(tenantId, cancellationToken);
    }
}
