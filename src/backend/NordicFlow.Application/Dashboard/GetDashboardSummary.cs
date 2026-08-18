using NordicFlow.Application.Abstractions;

namespace NordicFlow.Application.Dashboard;

public sealed class GetDashboardSummaryHandler(IDashboardSummaryQuery query)
{
    public Task<DashboardSummary> HandleAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("Tenant identifier is required.", nameof(tenantId));

        return query.GetAsync(tenantId, cancellationToken);
    }
}
