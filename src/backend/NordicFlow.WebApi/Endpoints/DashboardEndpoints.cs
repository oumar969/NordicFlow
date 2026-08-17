using System.Security.Claims;
using NordicFlow.Application.Abstractions;

namespace NordicFlow.WebApi.Endpoints;

public static class DashboardEndpoints
{
    public static IEndpointRouteBuilder MapDashboardEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/v1/dashboard/snapshot", GetSnapshotAsync)
            .RequireAuthorization("dashboard:read")
            .Produces<DashboardSnapshot>();
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
}
