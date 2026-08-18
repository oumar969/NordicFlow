using System.Security.Claims;
using NordicFlow.Application.Abstractions;
using NordicFlow.Application.Dashboard;

namespace NordicFlow.WebApi.Endpoints;

public static class DashboardEndpoints
{
    public static IEndpointRouteBuilder MapDashboardEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/v1/dashboard/snapshot", GetSnapshotAsync)
            .RequireAuthorization("dashboard:read")
            .Produces<DashboardSnapshot>();
        endpoints.MapGet("/api/v1/dashboard/summary", GetSummaryAsync)
            .RequireAuthorization("dashboard:read")
            .Produces<DashboardSummary>();
        return endpoints;
    }

    private static async Task<IResult> GetSnapshotAsync(
        ClaimsPrincipal user,
        IDashboardQuery query,
        CancellationToken cancellationToken)
    {
        var tenantClaim = user.FindFirstValue("tenant_id");
        if (!Guid.TryParse(tenantClaim, out var tenantId))
            return Results.Forbid();
        return Results.Ok(await query.GetSnapshotAsync(tenantId, cancellationToken));
    }

    private static async Task<IResult> GetSummaryAsync(
        ClaimsPrincipal user,
        GetDashboardSummaryHandler handler,
        CancellationToken cancellationToken)
    {
        var tenantClaim = user.FindFirstValue("tenant_id");
        if (!Guid.TryParse(tenantClaim, out var tenantId))
            return Results.Forbid();

        return Results.Ok(await handler.HandleAsync(tenantId, cancellationToken));
    }
}
