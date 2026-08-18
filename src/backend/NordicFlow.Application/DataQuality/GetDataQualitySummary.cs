using NordicFlow.Application.Abstractions;

namespace NordicFlow.Application.DataQuality;

public sealed class GetDataQualitySummaryHandler(IDataQualityQuery query)
{
    public Task<DataQualitySnapshot> HandleAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("Tenant identifier is required.", nameof(tenantId));
        return query.GetAsync(tenantId, cancellationToken);
    }
}
