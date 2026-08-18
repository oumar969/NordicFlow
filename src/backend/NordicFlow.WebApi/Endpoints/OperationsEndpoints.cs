using System.Security.Claims;
using NordicFlow.Application.Abstractions;
using NordicFlow.Application.Operations;

namespace NordicFlow.WebApi.Endpoints;

public static class OperationsEndpoints
{
    public static IEndpointRouteBuilder MapOperationsEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/v1/operations/alerts", GetAlertsAsync)
            .RequireAuthorization("operations:read")
            .Produces<OperationsSnapshot>();
        return endpoints;
    }

    private static async Task<IResult> GetAlertsAsync(
        ClaimsPrincipal user,
        GetOperationsSummaryHandler handler,
        CancellationToken cancellationToken)
    {
        var tenantClaim = user.FindFirstValue("tenant_id");
        if (!Guid.TryParse(tenantClaim, out var tenantId))
            return Results.Forbid();
        return Results.Ok(await handler.HandleAsync(tenantId, cancellationToken));
    }
}
